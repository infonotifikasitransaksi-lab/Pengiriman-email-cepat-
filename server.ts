import express from "express";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns";
import net from "net";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const resolveMx = promisify(dns.resolveMx);
const resolveSrv = promisify(dns.resolveSrv);
const lookupDns = promisify(dns.lookup);
const resolveTxt = promisify(dns.resolveTxt);

dotenv.config();

let aiClient: any = null;

function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

function getCloudflareTokens(): string[] {
  const envTokens = [
    process.env.CLOUDFLARE_API_TOKEN,
    process.env.CLOUDFLARE_API_TOKENS
  ].filter(Boolean) as string[];

  // Support comma-separated tokens in CLOUDFLARE_API_TOKENS or CLOUDFLARE_API_TOKEN
  const parsed = envTokens.flatMap(t => t.split(",").map(item => item.trim()).filter(Boolean));
  return Array.from(new Set(parsed));
}

const cachedCloudflareAccounts: { [token: string]: string } = {};

async function getCloudflareAccountId(token: string): Promise<string | null> {
  if (cachedCloudflareAccounts[token]) {
    return cachedCloudflareAccounts[token];
  }
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/accounts", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data.result && data.result.length > 0 && data.result[0].id) {
        cachedCloudflareAccounts[token] = data.result[0].id;
        return data.result[0].id;
      }
    }
  } catch (err: any) {
    console.warn("Cloudflare account lookup error:", err.message);
  }
  return null;
}

// Cloudflare Workers AI fallback generator
async function generateCloudflareAIContentWithFallback(params: {
  messages: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  maxTokens?: number;
}): Promise<{ text: string }> {
  const models = [
    "@cf/meta/llama-3.3-70b-instruct",
    "@cf/meta/llama-3.1-70b-instruct",
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/mistral/mistral-7b-instruct-v0.2",
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    "@cf/qwen/qwen2.5-72b-instruct"
  ];

  let lastError: any = null;

  for (const token of getCloudflareTokens()) {
    const accountId = await getCloudflareAccountId(token);
    if (!accountId) continue;

    const formattedMessages = [
      ...(params.systemInstruction ? [{ role: "system", content: params.systemInstruction }] : []),
      ...params.messages.map(m => ({
        role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
        content: m.content || " "
      }))
    ];

    for (const model of models) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messages: formattedMessages,
              max_tokens: params.maxTokens || 4096
            })
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Cloudflare AI [${res.status}]: ${errText}`);
        }

        const data: any = await res.json();
        const textOutput = data.result?.response || data.response || data.result?.choices?.[0]?.message?.content;
        if (textOutput && typeof textOutput === "string") {
          return { text: textOutput };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Cloudflare model ${model} attempt error:`, err.message);
      }
    }
  }

  throw lastError || new Error("Gagal mendapatkan respons dari Cloudflare Workers AI.");
}

// Anthropic Claude fallback generator
async function generateClaudeContentWithFallback(params: {
  messages: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  maxTokens?: number;
}) {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY tidak dikonfigurasi.");
  }

  const modelCandidates = [
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022"
  ];

  // Convert messages to Anthropic format (ensure alternating user / assistant roles)
  const formattedMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of params.messages) {
    const role = m.role === "user" ? "user" : "assistant";
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === role) {
      formattedMessages[formattedMessages.length - 1].content += "\n\n" + m.content;
    } else {
      formattedMessages.push({ role, content: m.content || " " });
    }
  }

  // Anthropic requires the first message to be from 'user'
  if (formattedMessages.length === 0 || formattedMessages[0].role !== "user") {
    formattedMessages.unshift({ role: "user", content: "Halo" });
  }

  let lastError: any = null;

  for (const model of modelCandidates) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: params.maxTokens || 4096,
          system: params.systemInstruction || undefined,
          messages: formattedMessages
        })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        const err = new Error(`Claude API [${res.status}]: ${errorBody}`);
        // If account has insufficient credit or invalid auth, break immediately to avoid slow retries
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          lastError = err;
          break;
        }
        throw err;
      }

      const data: any = await res.json();
      const textBlock = data.content?.find((c: any) => c.type === "text");
      if (textBlock && textBlock.text) {
        return { text: textBlock.text };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Anthropic model ${model} attempt error:`, err.message);
    }
  }

  throw lastError || new Error("Gagal mendapatkan respons dari model Anthropic Claude.");
}

// Resilient Gemini Generator with official models and robust timeout handling
async function generateGeminiContentWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY tidak dikonfigurasi di server.");
  }

  // Use currently active, valid official models from @google/genai SDK
  const modelCandidates = [
    params.preferredModel || "gemini-3.7-flash",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: any = null;

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const cleanConfig = { ...params.config };
        if (cleanConfig.thinkingConfig) {
          delete cleanConfig.thinkingConfig;
        }

        // 8 second per-call timeout to allow responsive chat without prolonged hanging
        const callPromise = ai.models.generateContent({
          model,
          contents: params.contents,
          config: cleanConfig,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timeout after 8s`)), 8000)
        );

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        if (response && (response.text || response.candidates?.length)) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = (err.message || "").toLowerCase();
        // Quota exhaustion won't recover on immediate retry
        if (errMsg.includes("resource_exhausted") || errMsg.includes("quota exceeded")) {
          break;
        }

        const isSpikeOrBusy = 
          errMsg.includes("503") || 
          errMsg.includes("high demand") || 
          errMsg.includes("unavailable") || 
          errMsg.includes("429") || 
          errMsg.includes("timeout") || 
          errMsg.includes("overloaded");

        if (isSpikeOrBusy && attempt === 0) {
          await new Promise((res) => setTimeout(res, 250));
          continue;
        }
        break; // Switch to next candidate model immediately
      }
    }
  }

  throw lastError || new Error("Gagal mendapatkan tanggapan dari semua model AI yang tersedia.");
}

// Helper to probe if a port is open on a host
function probePort(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on("error", () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on("timeout", () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      smtp_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      environment: process.env.NODE_ENV || "development"
    });
  });

  app.get("/api/lookup-domain", async (req, res) => {
    const domainParam = req.query.domain as string;
    if (!domainParam) {
      return res.status(400).json({ error: "Domain parameter required" });
    }

    const domain = domainParam.trim().toLowerCase();
    const logs: string[] = [];
    
    logs.push(`[Sistem] Memulai analisis hibrida 7-layer untuk domain: ${domain}`);

    try {
      // ==========================================
      // LAYER 1: Database Pusat berbasis MX Record
      // ==========================================
      logs.push("[Layer 1] Mencari rekaman MX di DNS...");
      let mxRecords: any[] = [];
      try {
        mxRecords = await resolveMx(domain);
        mxRecords.sort((a, b) => a.priority - b.priority);
        logs.push(`[Layer 1] Berhasil menemukan ${mxRecords.length} rekaman MX.`);
      } catch (e: any) {
        logs.push(`[Layer 1] DNS MX lookup gagal: ${e.message}`);
      }

      const exchanges = mxRecords.map(r => r.exchange.toLowerCase());
      if (exchanges.length > 0) {
        logs.push(`[Layer 1] Menganalisis MX exchange: ${exchanges.join(", ")}`);
        
        // Hostinger
        if (exchanges.some(ex => ex.includes("hostinger"))) {
          logs.push("[Layer 1] Terdeteksi MX Hostinger! Menggunakan setelan Hostinger Premium.");
          return res.json({
            success: true,
            layer: "Layer 1: Database Pusat (MX Record Hostinger)",
            smtp: {
              host: "smtp.hostinger.com",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "1000",
              name: "Hostinger Email"
            },
            logs,
            mx: exchanges
          });
        }
        
        // Google / Google Workspace
        if (exchanges.some(ex => ex.includes("google") || ex.includes("aspmx"))) {
          logs.push("[Layer 1] Terdeteksi MX Google Workspace! Menggunakan setelan Gmail.");
          return res.json({
            success: true,
            layer: "Layer 1: Database Pusat (MX Record Google Workspace)",
            smtp: {
              host: "smtp.gmail.com",
              port: "587",
              connectionType: "STARTTLS",
              dailyLimit: "1000",
              name: "Google Workspace"
            },
            logs,
            mx: exchanges
          });
        }

        // Office 365 / Microsoft
        if (exchanges.some(ex => ex.includes("outlook") || ex.includes("microsoft") || ex.includes("lync"))) {
          logs.push("[Layer 1] Terdeteksi MX Microsoft 365! Menggunakan setelan Office 365.");
          return res.json({
            success: true,
            layer: "Layer 1: Database Pusat (MX Record Microsoft 365)",
            smtp: {
              host: "smtp.office365.com",
              port: "587",
              connectionType: "STARTTLS",
              dailyLimit: "1000",
              name: "Microsoft 365"
            },
            logs,
            mx: exchanges
          });
        }

        // Zoho Mail
        if (exchanges.some(ex => ex.includes("zoho"))) {
          logs.push("[Layer 1] Terdeteksi MX Zoho! Menggunakan setelan Zoho Mail.");
          return res.json({
            success: true,
            layer: "Layer 1: Database Pusat (MX Record Zoho Mail)",
            smtp: {
              host: "smtp.zoho.com",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "150",
              name: "Zoho Mail"
            },
            logs,
            mx: exchanges
          });
        }

        // Yandex Mail
        if (exchanges.some(ex => ex.includes("yandex"))) {
          logs.push("[Layer 1] Terdeteksi MX Yandex! Menggunakan setelan Yandex Mail.");
          return res.json({
            success: true,
            layer: "Layer 1: Database Pusat (MX Record Yandex)",
            smtp: {
              host: "smtp.yandex.com",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "500",
              name: "Yandex Mail"
            },
            logs,
            mx: exchanges
          });
        }

        // Yahoo Mail
        if (exchanges.some(ex => ex.includes("yahoo") || ex.includes("yahoodns"))) {
          logs.push("[Layer 1] Terdeteksi MX Yahoo! Menggunakan setelan Yahoo Mail.");
          return res.json({
            success: true,
            layer: "Layer 1: Database Pusat (MX Record Yahoo Mail)",
            smtp: {
              host: "smtp.mail.yahoo.com",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "500",
              name: "Yahoo Mail"
            },
            logs,
            mx: exchanges
          });
        }
      } else {
        logs.push("[Layer 1] Tidak ditemukan rekaman MX untuk domain ini.");
      }

      // ==========================================
      // LAYER 2: Protokol Mozilla Autoconfig
      // ==========================================
      logs.push("[Layer 2] Menghubungi Mozilla Autoconfig ISP Database...");
      const autoconfigUrl = `https://autoconfig.thunderbird.net/v1.1/${domain}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(autoconfigUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const xmlText = await response.text();
          const outgoingMatch = xmlText.match(/<outgoingServer\s+type="smtp">([\s\S]*?)<\/outgoingServer>/i);
          if (outgoingMatch) {
            const inner = outgoingMatch[1];
            const hostMatch = inner.match(/<hostname>([^<]+)<\/hostname>/i);
            const portMatch = inner.match(/<port>([^<]+)<\/port>/i);
            const socketMatch = inner.match(/<socketType>([^<]+)<\/socketType>/i);
            if (hostMatch && portMatch) {
              const host = hostMatch[1].trim();
              const port = portMatch[1].trim();
              const socketType = socketMatch ? socketMatch[1].toUpperCase().trim() : "";
              const connectionType = (socketType === "SSL" || socketType === "SSL_TLS" || port === "465") ? "SSL_TLS" : "STARTTLS";
              logs.push(`[Layer 2] Sukses! Menemukan setelan SMTP via Mozilla Autoconfig: ${host}:${port} (${connectionType})`);
              return res.json({
                success: true,
                layer: "Layer 2: Mozilla Autoconfig",
                smtp: {
                  host,
                  port,
                  connectionType,
                  dailyLimit: "1000",
                  name: `Autoconfig (${domain})`
                },
                logs,
                mx: exchanges
              });
            }
          }
        } else {
          logs.push(`[Layer 2] Database Mozilla tidak merespons untuk ${domain} (Status ${response.status})`);
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        logs.push(`[Layer 2] Mozilla Autoconfig dilewati atau timeout: ${e.message}`);
      }

      // ==========================================
      // LAYER 3: Protokol Microsoft Autodiscover
      // ==========================================
      logs.push("[Layer 3] Mengecek protokol Microsoft Autodiscover...");
      // Microsoft Cloud / Office 365 often has autodiscover CNAME.
      // Let's check CNAME or resolve autodiscover host to see if active.
      try {
        const autodiscoverHost = `autodiscover.${domain}`;
        const ip = await lookupDns(autodiscoverHost);
        if (ip && ip.address) {
          logs.push(`[Layer 3] Host Autodiscover ditemukan di IP ${ip.address}.`);
          // If autodiscover is active and MX was Microsoft, we use Outlook SMTP
          if (exchanges.some(ex => ex.includes("outlook") || ex.includes("microsoft") || ex.includes("lync"))) {
            logs.push("[Layer 3] Terdeteksi Active Exchange! Menggunakan Microsoft 365 SMTP.");
            return res.json({
              success: true,
              layer: "Layer 3: Microsoft Autodiscover",
              smtp: {
                host: "smtp.office365.com",
                port: "587",
                connectionType: "STARTTLS",
                dailyLimit: "1000",
                name: "Microsoft Exchange"
              },
              logs,
              mx: exchanges
            });
          }
        } else {
          logs.push("[Layer 3] Host Autodiscover tidak terdaftar.");
        }
      } catch (e: any) {
        logs.push(`[Layer 3] Microsoft Autodiscover tidak aktif: ${e.message}`);
      }

      // ==========================================
      // LAYER 4: DNS SRV Records (RFC 6186)
      // ==========================================
      logs.push("[Layer 4] Melakukan query DNS SRV (RFC 6186) untuk _smtps dan _submission...");
      
      // Try SMTPS first (Secure SSL/TLS)
      try {
        const srvRecords = await resolveSrv(`_smtps._tcp.${domain}`);
        if (srvRecords && srvRecords.length > 0) {
          srvRecords.sort((a, b) => a.priority - b.priority);
          const bestSrv = srvRecords[0];
          logs.push(`[Layer 4] Rekaman SRV SMTPS ditemukan! Host: ${bestSrv.name}, Port: ${bestSrv.port}`);
          return res.json({
            success: true,
            layer: "Layer 4: DNS SRV (SMTPS RFC 6186)",
            smtp: {
              host: bestSrv.name,
              port: String(bestSrv.port),
              connectionType: "SSL_TLS",
              dailyLimit: "500",
              name: `SRV SMTPS (${domain})`
            },
            logs,
            mx: exchanges
          });
        }
      } catch (e: any) {
        logs.push(`[Layer 4] DNS SRV SMTPS tidak ditemukan: ${e.message}`);
      }

      // Try Submission second (STARTTLS)
      try {
        const srvRecords = await resolveSrv(`_submission._tcp.${domain}`);
        if (srvRecords && srvRecords.length > 0) {
          srvRecords.sort((a, b) => a.priority - b.priority);
          const bestSrv = srvRecords[0];
          logs.push(`[Layer 4] Rekaman SRV Submission ditemukan! Host: ${bestSrv.name}, Port: ${bestSrv.port}`);
          return res.json({
            success: true,
            layer: "Layer 4: DNS SRV (Submission RFC 6186)",
            smtp: {
              host: bestSrv.name,
              port: String(bestSrv.port),
              connectionType: "STARTTLS",
              dailyLimit: "500",
              name: `SRV Submission (${domain})`
            },
            logs,
            mx: exchanges
          });
        }
      } catch (e: any) {
        logs.push(`[Layer 4] DNS SRV Submission tidak ditemukan: ${e.message}`);
      }

      // ==========================================
      // LAYER 5: Smart Guessing & Active Port Probing
      // ==========================================
      logs.push("[Layer 5] Melakukan Smart Guessing & Active Port Probing...");
      const candidateHosts = [
        `smtp.${domain}`,
        `mail.${domain}`,
        `securemail.${domain}`,
        domain
      ];

      logs.push(`[Layer 5] Daftar kandidat host: ${candidateHosts.join(", ")}`);
      logs.push("[Layer 5] Menguji port 465 (SSL/TLS) dan 587 (STARTTLS) secara paralel...");

      // We probe each candidate
      for (const host of candidateHosts) {
        logs.push(`[Layer 5] Menganalisis DNS untuk kandidat: ${host}`);
        try {
          // Resolve host first to ensure it exists before probing
          const resolvedIp = await lookupDns(host);
          if (resolvedIp && resolvedIp.address) {
            logs.push(`[Layer 5] Host ${host} aktif di IP ${resolvedIp.address}. Memulai probing port...`);
            
            // Probe SSL/TLS (465)
            const is465Open = await probePort(host, 465);
            if (is465Open) {
              logs.push(`[Layer 5] Port 465 SSL/TLS terbuka di ${host}! Rekomendasi diterapkan.`);
              return res.json({
                success: true,
                layer: "Layer 5: Smart Guessing & Port Probe (SMTPS 465)",
                smtp: {
                  host,
                  port: "465",
                  connectionType: "SSL_TLS",
                  dailyLimit: "200",
                  name: `Smart Probe SSL/TLS (${host})`
                },
                logs,
                mx: exchanges
              });
            }

            // Probe STARTTLS (587)
            const is587Open = await probePort(host, 587);
            if (is587Open) {
              logs.push(`[Layer 5] Port 587 STARTTLS terbuka di ${host}! Rekomendasi diterapkan.`);
              return res.json({
                success: true,
                layer: "Layer 5: Smart Guessing & Port Probe (STARTTLS 587)",
                smtp: {
                  host,
                  port: "587",
                  connectionType: "STARTTLS",
                  dailyLimit: "200",
                  name: `Smart Probe STARTTLS (${host})`
                },
                logs,
                mx: exchanges
              });
            }

            // Probe standard SMTP (25)
            const is25Open = await probePort(host, 25);
            if (is25Open) {
              logs.push(`[Layer 5] Port 25 SMTP biasa terbuka di ${host}!`);
              return res.json({
                success: true,
                layer: "Layer 5: Smart Guessing & Port Probe (SMTP 25)",
                smtp: {
                  host,
                  port: "25",
                  connectionType: "STARTTLS", // fallback to STARTTLS if supported, otherwise plaintext
                  dailyLimit: "1000",
                  name: `Smart Probe SMTP (${host})`
                },
                logs,
                mx: exchanges
              });
            }
          }
        } catch (err: any) {
          logs.push(`[Layer 5] Kandidat ${host} dilewati: ${err.message}`);
        }
      }

      // ==========================================
      // LAYER 7: DNS SPF & DMARC Cryptographic Config Trace
      // ==========================================
      logs.push("[Layer 7] Menjalankan pelacakan rekam jejak kriptografis DNS SPF & DMARC...");
      const spfRecords: string[] = [];
      const dmarcRecords: string[] = [];
      try {
        const txtRecords = await resolveTxt(domain);
        const flatTxt = txtRecords.map(rec => rec.join(""));
        const spf = flatTxt.find(rec => rec.startsWith("v=spf1"));
        if (spf) {
          logs.push(`[Layer 7] SPF Record ditemukan: "${spf}"`);
          spfRecords.push(spf);
        } else {
          logs.push("[Layer 7] SPF Record tidak ditemukan.");
        }
      } catch (e: any) {
        logs.push(`[Layer 7] Gagal melacak SPF Record: ${e.message}`);
      }

      try {
        const dmarcTxt = await resolveTxt(`_dmarc.${domain}`);
        const flatDmarc = dmarcTxt.map(rec => rec.join(""));
        const dmarc = flatDmarc.find(rec => rec.startsWith("v=DMARC1"));
        if (dmarc) {
          logs.push(`[Layer 7] DMARC Record ditemukan: "${dmarc}"`);
          dmarcRecords.push(dmarc);
        } else {
          logs.push("[Layer 7] DMARC Record tidak ditemukan.");
        }
      } catch (e: any) {
        logs.push(`[Layer 7] Gagal melacak DMARC Record: ${e.message}`);
      }

      // Check if Layer 7 SPF matches a known provider immediately
      if (spfRecords.length > 0) {
        const spfStr = spfRecords[0].toLowerCase();
        if (spfStr.includes("spf.protection.outlook.com")) {
          logs.push("[Layer 7] Berhasil mencocokkan SPF dengan Microsoft Office 365!");
          return res.json({
            success: true,
            layer: "Layer 7: DNS SPF Trace (Microsoft Office 365)",
            smtp: {
              host: "smtp.office365.com",
              port: "587",
              connectionType: "STARTTLS",
              dailyLimit: "1000",
              name: "Microsoft Office 365 (via SPF)"
            },
            logs,
            mx: exchanges
          });
        }
        if (spfStr.includes("_spf.google.com")) {
          logs.push("[Layer 7] Berhasil mencocokkan SPF dengan Google Workspace!");
          return res.json({
            success: true,
            layer: "Layer 7: DNS SPF Trace (Google Workspace)",
            smtp: {
              host: "smtp.gmail.com",
              port: "587",
              connectionType: "STARTTLS",
              dailyLimit: "1000",
              name: "Google Workspace (via SPF)"
            },
            logs,
            mx: exchanges
          });
        }
        if (spfStr.includes("secureserver.net")) {
          logs.push("[Layer 7] Berhasil mencocokkan SPF dengan GoDaddy Workspace Email!");
          return res.json({
            success: true,
            layer: "Layer 7: DNS SPF Trace (GoDaddy Workspace)",
            smtp: {
              host: "smtpout.secureserver.net",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "250",
              name: "GoDaddy SMTP (via SPF)"
            },
            logs,
            mx: exchanges
          });
        }
        if (spfStr.includes("zoho")) {
          logs.push("[Layer 7] Berhasil mencocokkan SPF dengan Zoho Mail!");
          return res.json({
            success: true,
            layer: "Layer 7: DNS SPF Trace (Zoho Mail)",
            smtp: {
              host: "smtp.zoho.com",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "150",
              name: "Zoho Mail (via SPF)"
            },
            logs,
            mx: exchanges
          });
        }
        if (spfStr.includes("hostinger")) {
          logs.push("[Layer 7] Berhasil mencocokkan SPF dengan Hostinger Email!");
          return res.json({
            success: true,
            layer: "Layer 7: DNS SPF Trace (Hostinger)",
            smtp: {
              host: "smtp.hostinger.com",
              port: "465",
              connectionType: "SSL_TLS",
              dailyLimit: "1000",
              name: "Hostinger Email (via SPF)"
            },
            logs,
            mx: exchanges
          });
        }
      }

      // ==========================================
      // LAYER 6: Gemini AI Smart Prediction
      // ==========================================
      logs.push("[Layer 6] Menghubungi Mesin Kecerdasan Buatan Gemini AI...");
      const ai = getGeminiClient();
      if (!ai) {
        logs.push("[Layer 6] Kunci API Gemini tidak dikonfigurasi di server. Melewati prediksi AI.");
      } else {
        try {
          logs.push("[Layer 6] Mengirimkan data telemetri domain ke mesin Gemini AI...");
          const systemInstruction = 
            "Anda adalah asisten cerdas spesialis infrastruktur email dan SMTP. " +
            "Tugas Anda adalah memprediksi atau merekomendasikan setelan server SMTP keluar (host, port, tipe koneksi, limit harian, dan nama penyedia) " +
            "berdasarkan informasi domain, MX record, SPF record, dan DMARC record yang diberikan. " +
            "Berikan prediksi yang akurat dan berbasis kecerdasan pengetahuan global Anda tentang provider email hosting.";

          const prompt = `Analisis domain berikut untuk menemukan setelan SMTP keluar:
- Domain: ${domain}
- MX Records: ${exchanges.join(", ") || "Tidak ditemukan"}
- SPF Records: ${spfRecords.join(", ") || "Tidak ditemukan"}
- DMARC Records: ${dmarcRecords.join(", ") || "Tidak ditemukan"}

Jika Anda sangat yakin tentang penyedia email mereka (misalnya, jika MX mengarah ke host lokal atau server cPanel/DirectAdmin tertentu, atau jika rekam jejak SPF menunjukkan ISP tertentu), berikan prediksi tersebut dengan confidenceScore tinggi.
Jika Anda tidak yakin, berikan setelan cPanel standar untuk domain tersebut: host "mail.${domain}", port "465", connectionType "SSL_TLS", name "Custom SMTP (Predicted via Gemini)".`;

          const response = await generateGeminiContentWithFallback({
            preferredModel: "gemini-3.7-flash",
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  success: { type: Type.BOOLEAN, description: "Apakah prediksi SMTP berkeyakinan tinggi berhasil diselesaikan" },
                  host: { type: Type.STRING, description: "Alamat server SMTP keluar (misal: mail.domain.com atau smtp.provider.com)" },
                  port: { type: Type.STRING, description: "Port SMTP keluar (misal: 465 atau 587)" },
                  connectionType: { type: Type.STRING, description: "Tipe koneksi, harus salah satu dari: SSL_TLS atau STARTTLS" },
                  name: { type: Type.STRING, description: "Nama representasi penyedia atau server" },
                  dailyLimit: { type: Type.STRING, description: "Estimasi limit harian pengiriman email (angka sebagai string)" },
                  confidenceScore: { type: Type.NUMBER, description: "Skor keyakinan dari 0.0 hingga 1.0" },
                  reasoning: { type: Type.STRING, description: "Alasan mengapa setelan ini direkomendasikan" }
                },
                required: ["success", "host", "port", "connectionType", "name", "dailyLimit", "confidenceScore", "reasoning"]
              }
            }
          });

          const resText = response.text?.trim() || "{}";
          const prediction = JSON.parse(resText);
          
          logs.push(`[Layer 6] Analisis AI Selesai. Keyakinan: ${(prediction.confidenceScore * 100).toFixed(0)}%. Alasan: ${prediction.reasoning}`);

          if (prediction.success && prediction.confidenceScore >= 0.5) {
            logs.push(`[Layer 6] Menerapkan hasil prediksi cerdas Gemini AI: ${prediction.name}`);
            return res.json({
              success: true,
              layer: "Layer 6: Gemini AI Smart Prediction",
              smtp: {
                host: prediction.host,
                port: prediction.port,
                connectionType: prediction.connectionType,
                dailyLimit: prediction.dailyLimit,
                name: prediction.name
              },
              logs,
              mx: exchanges
            });
          }
        } catch (err: any) {
          logs.push(`[Layer 6] Gagal memanggil mesin Gemini AI: ${err.message}`);
        }
      }

      // If absolutely everything fails, return the safest cPanel default with complete log history
      logs.push("[Sistem] Seluruh 7 layer selesai dijalankan. Menggunakan fallback cPanel.");
      return res.json({
        success: false,
        layer: "Fallback: cPanel Default",
        smtp: {
          host: `mail.${domain}`,
          port: "465",
          connectionType: "SSL_TLS",
          dailyLimit: "200",
          name: `cPanel / Server Default (${domain})`
        },
        logs,
        mx: exchanges
      });

    } catch (error: any) {
      logs.push(`[Sistem] Terjadi kesalahan fatal: ${error.message}`);
      return res.json({
        success: false,
        layer: "Fallback: Kesalahan Sistem",
        smtp: {
          host: `mail.${domain}`,
          port: "465",
          connectionType: "SSL_TLS",
          dailyLimit: "200",
          name: `cPanel / Server Default (${domain})`
        },
        logs,
        error: error.message
      });
    }
  });

  const INDO_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const INDO_MONTHS_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  function getIndonesianDateTime(timeZone = "Asia/Jakarta", date: Date = new Date()) {
    try {
      const tz = timeZone || "Asia/Jakarta";
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
      const yearStr = getPart("year");
      const monthNum = parseInt(getPart("month"), 10) - 1;
      const dayStr = getPart("day");
      let hourStr = getPart("hour");
      if (hourStr === "24") hourStr = "00";
      const minStr = getPart("minute");
      const secStr = getPart("second");
      const monthShort = INDO_MONTHS_SHORT[monthNum] || "Sep";
      const monthFull = INDO_MONTHS_FULL[monthNum] || "September";

      let zoneSuffix = "WIB";
      if (tz.includes("Makassar") || tz.includes("Ujung_Pandang") || tz.includes("WITA")) {
        zoneSuffix = "WITA";
      } else if (tz.includes("Jayapura") || tz.includes("WIT")) {
        zoneSuffix = "WIT";
      }

      return {
        day: dayStr,
        monthShort,
        monthFull,
        year: yearStr,
        hours: hourStr,
        minutes: minStr,
        seconds: secStr,
        dateShort: `${dayStr} ${monthShort} ${yearStr}`,
        dateFull: `${dayStr} ${monthFull} ${yearStr}`,
        timeShort: `${hourStr}:${minStr} ${zoneSuffix}`,
        timeFull: `${hourStr}:${minStr}:${secStr} ${zoneSuffix}`,
        dateTimeShort: `${dayStr} ${monthShort} ${yearStr}, ${hourStr}:${minStr} ${zoneSuffix}`,
        dateTimeFull: `${dayStr} ${monthFull} ${yearStr}, ${hourStr}:${minStr}:${secStr} ${zoneSuffix}`
      };
    } catch (e) {
      // Fallback with fixed UTC+7 offset for WIB
      const wib = new Date(date.getTime() + 7 * 3600 * 1000);
      const dayStr = String(wib.getUTCDate()).padStart(2, "0");
      const monthNum = wib.getUTCMonth();
      const monthShort = INDO_MONTHS_SHORT[monthNum] || "Sep";
      const monthFull = INDO_MONTHS_FULL[monthNum] || "September";
      const yearStr = String(wib.getUTCFullYear());
      const hourStr = String(wib.getUTCHours()).padStart(2, "0");
      const minStr = String(wib.getUTCMinutes()).padStart(2, "0");
      const secStr = String(wib.getUTCSeconds()).padStart(2, "0");
      return {
        day: dayStr,
        monthShort,
        monthFull,
        year: yearStr,
        hours: hourStr,
        minutes: minStr,
        seconds: secStr,
        dateShort: `${dayStr} ${monthShort} ${yearStr}`,
        dateFull: `${dayStr} ${monthFull} ${yearStr}`,
        timeShort: `${hourStr}:${minStr} WIB`,
        timeFull: `${hourStr}:${minStr}:${secStr} WIB`,
        dateTimeShort: `${dayStr} ${monthShort} ${yearStr}, ${hourStr}:${minStr} WIB`,
        dateTimeFull: `${dayStr} ${monthFull} ${yearStr}, ${hourStr}:${minStr}:${secStr} WIB`
      };
    }
  }

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html, smtpConfig, clientDateTime, clientRef, clientTimezone } = req.body;

    if (!to) {
      return res.status(400).json({ error: "Email penerima (to) harus diisi." });
    }

    if (!subject) {
      return res.status(400).json({ error: "Subjek email harus diisi." });
    }

    // Process and synchronize date/time using client's exact time or server's WIB (UTC+7)
    const serverWibDt = getIndonesianDateTime(clientTimezone || "Asia/Jakarta");
    const effectiveDt = (clientDateTime && clientDateTime.dateTimeShort)
      ? {
          ...serverWibDt,
          ...clientDateTime
        }
      : serverWibDt;

    const dayStr = effectiveDt.day;
    const monthShort = effectiveDt.monthShort;
    const monthFull = effectiveDt.monthFull;
    const yearStr = String(effectiveDt.year);
    const hourStr = effectiveDt.hours;
    const minStr = effectiveDt.minutes;
    const secStr = effectiveDt.seconds;

    const dateShort = effectiveDt.dateShort;
    const dateFull = effectiveDt.dateFull;
    const timeShort = effectiveDt.timeShort;
    const timeFull = effectiveDt.timeFull;
    const dateTimeShort = effectiveDt.dateTimeShort;

    const lowerSubAndHtml = ((subject || "") + " " + (html || "")).toLowerCase();
    let bankCode = "BCA";
    if (lowerSubAndHtml.includes("mandiri") || lowerSubAndHtml.includes("mdr")) bankCode = "MDR";
    else if (lowerSubAndHtml.includes("bri")) bankCode = "BRI";
    else if (lowerSubAndHtml.includes("bni")) bankCode = "BNI";
    else if (lowerSubAndHtml.includes("cimb")) bankCode = "CIMB";
    else if (lowerSubAndHtml.includes("uob")) bankCode = "UOB";
    else if (lowerSubAndHtml.includes("bca")) bankCode = "BCA";

    const rand11 = Math.floor(10000000000 + Math.random() * 90000000000).toString();
    const defaultRef = clientRef || `${bankCode}-${rand11}`;

    const replaceInnerCell = (cellHtml: string, newVal: string): string => {
      if (/([A-Za-z]{2,5}[-_][0-9]{6,20}|[A-Za-z0-9]{10,24})/i.test(cellHtml)) {
        return cellHtml.replace(/([A-Za-z]{2,5}[-_][0-9]{6,20}|[A-Za-z0-9]{10,24})/i, newVal);
      }
      if (/>\s*([^<]+?)\s*</.test(cellHtml)) {
        return cellHtml.replace(/>\s*[^<]+?\s*</, `>${newVal}<`);
      }
      return newVal;
    };

    const labelTdStyle = 'valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: \'Segoe UI\', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;"';
    const valueTdStyle = 'valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: \'Segoe UI\', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; word-break: break-all;"';

    const syncDynamicFields = (content: string) => {
      if (!content) return content;
      let res = content;

      // 0. Header timestamp (e.g. 24/05/2024 - 10:15:22 WIB or 23/08/2026 - 06:56:17 WIB)
      const dateSlashTime = effectiveDt.dateSlashTime || `${dayStr}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${yearStr} - ${hourStr}:${minStr}:${secStr} WIB`;
      const headerDateDivRegex = /<div\b([^>]*\bstyle=["'][^"']*?)>(\s*\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}:\d{2}\s*WIB\s*|\s*\[(?:TANGGAL_WAKTU_TRANSAKSI|TANGGAL_WAKTU_SLASH|TGL_WAKTU_SLASH)\]\s*)<\/div>/gi;
      if (headerDateDivRegex.test(res)) {
        res = res.replace(headerDateDivRegex, () => {
          return `<div style="text-align: center; font-size: 12px; font-weight: 500; color: #6b7280; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.4;">${dateSlashTime}</div>`;
        });
      } else {
        res = res.replace(/\b\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}:\d{2}\s*WIB\b/g, dateSlashTime);
        res = res.replace(/\[(?:TANGGAL_WAKTU_TRANSAKSI|TANGGAL_WAKTU_SLASH|TGL_WAKTU_SLASH)\]/gi, dateSlashTime);
      }

      // 1. Reference Number Placeholders
      res = res
        .replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, defaultRef)
        .replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, defaultRef);

      // 1b. Table row replacement for Reference Number (strictly bounded within single <tr>)
      const tableRefRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:\bRef\b|No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
      if (tableRefRowRegex.test(res)) {
        res = res.replace(tableRefRowRegex, `$1${defaultRef}$2`);
      }

      const tableRefRegex = /(<(?:td|th)[^>]*>(?:(?!<\/(?:td|th)>)[\s\S])*?(?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/(?:td|th)>)[\s\S])*?<\/(?:td|th)>(?:\s*<(?:td|th)[^>]*>(?:(?!<\/(?:td|th)>)[\s\S])*?<\/(?:td|th)>)?\s*<(?:td|th)[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi;
      if (tableRefRegex.test(res)) {
        res = res.replace(tableRefRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, defaultRef)}${p3}`;
        });
      }

      // 1c. Div / Span pairs for Reference Number
      const divRefRegex = /(<(?:div|p|span)[^>]*>(?:(?!<\/(?:div|p|span)>)[\s\S])*?(?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/(?:div|p|span)>)[\s\S])*?<\/(?:div|p|span)>(?:\s*<(?:div|p|span)[^>]*>(?:(?!<\/(?:div|p|span)>)[\s\S])*?<\/(?:div|p|span)>)?\s*<(?:div|p|span)[^>]*>)([\s\S]*?)(<\/(?:div|p|span)>)/gi;
      if (divRefRegex.test(res)) {
        res = res.replace(divRefRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, defaultRef)}${p3}`;
        });
      }

      // 1d. Inline reference number patterns
      const inlineRefRegex = /((?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([A-Za-z0-9\-_]{6,32})/gi;
      if (inlineRefRegex.test(res)) {
        res = res.replace(inlineRefRegex, (_match, p1) => {
          return `${p1}${defaultRef}`;
        });
      }

      const plainRefRegex = /((?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)\s*:\s*)([A-Za-z0-9\-_]{6,32})/gi;
      if (plainRefRegex.test(res)) {
        res = res.replace(plainRefRegex, (_match, p1) => {
          return `${p1}${defaultRef}`;
        });
      }

      // 2. Date and Time Placeholders
      res = res
        .replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI)\]/gi, dateFull)
        .replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi)\s*\}\}/gi, dateFull)
        .replace(/\[(?:TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dateTimeShort)
        .replace(/\{\{\s*(?:tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dateTimeShort)
        .replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dateFull)
        .replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dateFull)
        .replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, timeShort)
        .replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, timeShort);

      // 3. Table row replacement for combined Date & Time (strictly bounded within single <tr>)
      const tableDateTimeRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
      if (tableDateTimeRowRegex.test(res)) {
        res = res.replace(tableDateTimeRowRegex, `$1${dateTimeShort}$2`);
      }

      // 4. Table row replacement for Tanggal Transaksi (strictly bounded within single <tr>)
      const tableDateRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date|Tanggal\s*Pembayaran|Tgl\.?\s*Pembayaran)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
      if (tableDateRowRegex.test(res)) {
        res = res.replace(tableDateRowRegex, `$1${dateFull}$2`);
      }

      // 5. Table row replacement for Waktu Transaksi (strictly bounded within single <tr>)
      const tableTimeRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
      if (tableTimeRowRegex.test(res)) {
        res = res.replace(tableTimeRowRegex, `$1${timeShort}$2`);
      }

      const tableDateTimeRegex = /(<td[^>]*>(?:[\s\S]*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)[\s\S]*?)<\/td>(?:\s*<td[^>]*>\s*(?::|&nbsp;|\s)*<\/td>)?\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
      if (tableDateTimeRegex.test(res)) {
        res = res.replace(tableDateTimeRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, dateTimeShort)}${p3}`;
        });
      }

      const tableDateRegex = /(<td[^>]*>(?:[\s\S]*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date|Tanggal\s*Pembayaran|Tgl\.?\s*Pembayaran)[\s\S]*?)<\/td>(?:\s*<td[^>]*>\s*(?::|&nbsp;|\s)*<\/td>)?\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
      if (tableDateRegex.test(res)) {
        res = res.replace(tableDateRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, dateFull)}${p3}`;
        });
      }

      const tableTimeRegex = /(<td[^>]*>(?:[\s\S]*?(?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)[\s\S]*?)<\/td>(?:\s*<td[^>]*>\s*(?::|&nbsp;|\s)*<\/td>)?\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
      if (tableTimeRegex.test(res)) {
        res = res.replace(tableTimeRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, timeShort)}${p3}`;
        });
      }

      // 6. Div / Span pairs for Date & Time
      const divDateTimeRegex = /(<(?:div|p|span)[^>]*>(?:[\s\S]*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)[\s\S]*?)<\/(?:div|p|span)>(?:\s*<(?:div|p|span)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:div|p|span)>)?\s*<(?:div|p|span)[^>]*>)([\s\S]*?)(<\/(?:div|p|span)>)/gi;
      if (divDateTimeRegex.test(res)) {
        res = res.replace(divDateTimeRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, dateTimeShort)}${p3}`;
        });
      }

      const divDateRegex = /(<(?:div|p|span)[^>]*>(?:[\s\S]*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date)[\s\S]*?)<\/(?:div|p|span)>(?:\s*<(?:div|p|span)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:div|p|span)>)?\s*<(?:div|p|span)[^>]*>)([\s\S]*?)(<\/(?:div|p|span)>)/gi;
      if (divDateRegex.test(res)) {
        res = res.replace(divDateRegex, (_match, p1, p2, p3) => {
          return `${p1}${replaceInnerCell(p2, dateFull)}${p3}`;
        });
      }

      // 7. Inline date & time patterns
      const inlineDateRegex = /((?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([\d]{1,2}(?:[\/\-\s]+[A-Za-z0-9]+[\/\-\s]+[\d]{2,4})(?:[,\s]+[\d]{1,2}:[\d]{2}(?::[\d]{2})?\s*(?:WIB|WITA|WIT|AM|PM)?)?)/gi;
      if (inlineDateRegex.test(res)) {
        res = res.replace(inlineDateRegex, (_match, p1) => {
          return `${p1}${dateFull}`;
        });
      }

      const inlineTimeRegex = /((?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([\d]{1,2}:[\d]{2}(?::[\d]{2})?\s*(?:WIB|WITA|WIT|AM|PM)?)/gi;
      if (inlineTimeRegex.test(res)) {
        res = res.replace(inlineTimeRegex, (_match, p1) => {
          return `${p1}${timeShort}`;
        });
      }

      return res;
    };

    const forceInlineEmailStyles = (contentHtml: string): string => {
      if (!contentHtml) return contentHtml;
      let res = contentHtml;

      // Preserve .email-card responsive fluid width (100% on mobile, max 520px on desktop) and styling
      res = res.replace(/<([a-z0-9]+)\b([^>]*\bclass=["'][^"']*\bemail-card\b[^"']*["'][^>]*)>/gi, (_match, tag, attrs) => {
        const cardStyles = "background-color: #ffffff; width: 100%; max-width: 520px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); overflow: hidden; margin: 0 auto; text-align: left; box-sizing: border-box;";
        if (/style=["']/i.test(attrs)) {
          return `<${tag}${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${cardStyles}$1`)}>`;
        }
        return `<${tag}${attrs} style="${cardStyles}">`;
      });

      // Preserve .email-card-td padding 32px 24px 32px 24px
      res = res.replace(/<([a-z0-9]+)\b([^>]*\bclass=["'][^"']*\bemail-card-td\b[^"']*["'][^>]*)>/gi, (_match, tag, attrs) => {
        const tdStyles = "padding: 32px 24px 32px 24px; text-align: left; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; box-sizing: border-box;";
        if (/style=["']/i.test(attrs)) {
          return `<${tag}${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tdStyles}$1`)}>`;
        }
        return `<${tag}${attrs} style="${tdStyles}">`;
      });

      // Ensure body has background #f4f5f7 and proper padding
      res = res.replace(/<body\b([^>]*)>/gi, (_match, attrs) => {
        const bodyStyles = "font-family: 'Segoe UI', Arial, sans-serif, -apple-system; background-color: #f4f5f7; margin: 0; padding: 20px 10px 40px 10px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; width: 100%;";
        if (/style=["']/i.test(attrs)) {
          return `<body${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${bodyStyles}$1`)}>`;
        }
        return `<body${attrs} style="${bodyStyles}">`;
      });

      // Inject table reset
      res = res.replace(/<table\b([^>]*)>/gi, (_match, attrs) => {
        const tableStyles = "border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box;";
        if (/style=["']/i.test(attrs)) {
          return `<table${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tableStyles}$1`)}>`;
        }
        return `<table${attrs} style="${tableStyles}">`;
      });

      // Inject td text-size-adjust & line-height rule
      res = res.replace(/<td\b([^>]*)>/gi, (_match, attrs) => {
        const tdStyles = "-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-line-height-rule: exactly; box-sizing: border-box;";
        if (/style=["']/i.test(attrs)) {
          return `<td${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tdStyles}$1`)}>`;
        }
        return `<td${attrs} style="${tdStyles}">`;
      });

      // Inject img interpolation
      res = res.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
        const imgStyles = "-ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none;";
        if (/style=["']/i.test(attrs)) {
          return `<img${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${imgStyles}$1`)}>`;
        }
        return `<img${attrs} style="${imgStyles}">`;
      });

      return res;
    };

    let finalSubject = syncDynamicFields(subject);
    let finalHtml = html ? forceInlineEmailStyles(syncDynamicFields(html)) : html;
    let finalText = text ? syncDynamicFields(text) : text;

    // Detect bank key for logo attachment and header alignment
    let detectedBankKey = "bca";
    const combinedText = ((finalSubject || "") + " " + (finalHtml || "")).toLowerCase();
    if (combinedText.includes("mandiri") || combinedText.includes("mdr") || combinedText.includes("livin")) detectedBankKey = "mandiri";
    else if (/\bbri\b/.test(combinedText) || combinedText.includes("rakyat indonesia") || combinedText.includes("brimo") || combinedText.includes("bank bri")) detectedBankKey = "bri";
    else if (/\bbni\b/.test(combinedText) || combinedText.includes("negara indonesia") || combinedText.includes("wondr") || combinedText.includes("bank bni")) detectedBankKey = "bni";
    else if (combinedText.includes("cimb") || combinedText.includes("niaga") || combinedText.includes("octo")) detectedBankKey = "cimb";
    else if (/\buob\b/.test(combinedText) || combinedText.includes("tmrw") || combinedText.includes("united overseas") || combinedText.includes("bank uob")) detectedBankKey = "uob";
    else if (/\bbca\b/.test(combinedText) || combinedText.includes("central asia") || combinedText.includes("klikbca") || combinedText.includes("mybca")) detectedBankKey = "bca";

    const bankNamesMap: Record<string, string> = {
      bca: "BCA",
      mandiri: "Mandiri",
      bri: "BRI",
      bni: "BNI",
      cimb: "CIMB Niaga",
      uob: "UOB"
    };
    const currentBankName = bankNamesMap[detectedBankKey] || "BCA";

    // Standardize bank logo to 100% reliable inline CID attachment (zero broken images in Gmail, Outlook, Apple Mail, Yahoo)
    const attachments: any[] = [];
    const logoPngPath = path.join(process.cwd(), "public", "bank-logos", `${detectedBankKey}.png`);
    if (fs.existsSync(logoPngPath)) {
      attachments.push({
        filename: `${detectedBankKey}-logo.png`,
        path: logoPngPath,
        cid: "banklogo",
        contentType: "image/png"
      });
    }

    if (finalHtml) {
      // Replace existing bank logo img tags with cid:banklogo
      const bankLogoImgRegex = /<img\b([^>]*?(?:logo|bank-logo|bank-logos|Bank_Central_Asia|Bank_Mandiri|BANK_BRI|BNI_logo|CIMB_Niaga|United_Overseas_Bank|wikimedia|data:image|cid:banklogo)[^>]*?)>/gi;
      if (bankLogoImgRegex.test(finalHtml)) {
        finalHtml = finalHtml.replace(bankLogoImgRegex, () => {
          return `<img src="cid:banklogo" alt="Logo Bank ${currentBankName}" width="140" style="max-height: 48px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto; border: 0;" />`;
        });
      } else {
        const logoTable = `<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin: 0 auto 20px auto; border-collapse: collapse; text-align: center;"><tr><td align="center" valign="middle" style="text-align: center; padding: 0 0 14px 0;"><img src="cid:banklogo" alt="Logo Bank ${currentBankName}" width="140" style="max-height: 48px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto; border: 0;" /></td></tr></table>`;
        const emailCardTdRegex = /(<td\b[^>]*\bclass=["'][^"']*\bemail-card-td\b[^"']*["'][^>]*>)/i;
        const genericEmailCardTdRegex = /(<table\b[^>]*\bclass=["'][^"']*\bemail-card\b[^"']*["'][^>]*>[\s\S]*?<tr\b[^>]*>\s*<td\b[^>]*>)/i;
        if (emailCardTdRegex.test(finalHtml)) {
          finalHtml = finalHtml.replace(emailCardTdRegex, `$1${logoTable}`);
        } else if (genericEmailCardTdRegex.test(finalHtml)) {
          finalHtml = finalHtml.replace(genericEmailCardTdRegex, `$1${logoTable}`);
        } else if (/<body\b[^>]*>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/(<body\b[^>]*>)/i, `$1${logoTable}`);
        }
      }
    }

    // Build configuration with priority: 
    // 1. smtpConfig passed from request (User's browser SMTP settings)
    // 2. Server's environment variables fallback
    const host = (smtpConfig?.host || process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const portStr = (smtpConfig?.port || process.env.SMTP_PORT || "465").toString().trim();
    const port = parseInt(portStr, 10) || 465;
    const rawUsername = (smtpConfig?.username || process.env.SMTP_USER || "").trim();
    const rawPassword = (smtpConfig?.password || process.env.SMTP_PASS || "").trim();
    
    // Clean username and password thoroughly
    const cleanUser = rawUsername.replace(/^["']|["']$/g, "").trim();
    const cleanPass = rawPassword.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").replace(/^["']|["']$/g, "").trim();
    const senderEmail = (smtpConfig?.senderEmail || cleanUser || process.env.SMTP_FROM || "").replace(/^["']|["']$/g, "").trim();
    const fromName = (smtpConfig?.fromName || process.env.SMTP_FROM_NAME || "G-Swift Relay").trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({
        success: false,
        error: "Konfigurasi SMTP tidak lengkap. Silakan lengkapi Username dan Password SMTP di tab Akun/Settings terlebih dahulu."
      });
    }

    const isGmail = host.toLowerCase().includes("gmail.com") || 
                    cleanUser.toLowerCase().endsWith("@gmail.com") || 
                    cleanUser.toLowerCase().endsWith("@googlemail.com");

    const isYahoo = host.toLowerCase().includes("yahoo.com") ||
                    cleanUser.toLowerCase().endsWith("@yahoo.com") ||
                    cleanUser.toLowerCase().endsWith("@ymail.com");

    const isICloud = host.toLowerCase().includes("icloud.com") ||
                     cleanUser.toLowerCase().endsWith("@icloud.com");

    // Pre-flight check for App Password length
    if ((isGmail || isYahoo || isICloud) && cleanPass.length !== 16) {
      return res.status(400).json({
        success: false,
        error: `Format App Password belum valid (${cleanPass.length}/16 karakter). Untuk akun ${isGmail ? "Google (Gmail)" : isYahoo ? "Yahoo" : "iCloud"}, gunakan 16 karakter Sandi Aplikasi (App Password) tanpa spasi untuk menghindari error 535. Buat di https://myaccount.google.com/apppasswords`,
        code: "INVALID_APP_PASSWORD_LENGTH"
      });
    }

    try {
      // Create transporter with optimal settings per provider
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false
            }
          })
        : nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            requireTLS: port === 587,
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false
            }
          });

      // Mail options with CID inline image attachments
      const mailOptions = {
        from: fromName ? `"${fromName}" <${senderEmail}>` : senderEmail,
        to,
        subject: finalSubject,
        text: finalText || "G-Swift Relay Message",
        html: finalHtml || undefined,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      const info = await transporter.sendMail(mailOptions);
      return res.json({
        success: true,
        messageId: info.messageId,
        response: info.response
      });
    } catch (error: any) {
      const rawErrMsg = error?.message || "Gagal mengirim email melalui server SMTP Relay.";
      const isAuthError = 
        rawErrMsg.includes("535") || 
        rawErrMsg.includes("Invalid login") || 
        rawErrMsg.includes("BadCredentials") || 
        rawErrMsg.includes("Username and Password not accepted") ||
        error?.code === "EAUTH";

      if (isAuthError) {
        console.warn(`[SMTP Warning] Autentikasi ditolak (535) untuk pengguna ${cleanUser}: ${rawErrMsg}`);
        return res.status(401).json({
          success: false,
          error: isGmail
            ? "Error 535 (Autentikasi Ditolak): Username atau App Password tidak cocok. Untuk akun Gmail (@gmail.com), pastikan Verifikasi 2 Langkah telah aktif di Akun Google dan buat Sandi Aplikasi 16 karakter di https://myaccount.google.com/apppasswords (jangan gunakan kata sandi login biasa)."
            : "Error 535 (Autentikasi Ditolak): Username atau Password SMTP tidak diterima oleh server email. Periksa kembali kecocokan username dan password.",
          code: "SMTP_AUTH_FAILED",
          isAuthError: true
        });
      }

      console.warn(`[SMTP Warning] Pengiriman gagal untuk ${cleanUser} ke ${to}:`, rawErrMsg);
      return res.status(500).json({
        success: false,
        error: rawErrMsg
      });
    }
  });

  app.post("/api/verify-smtp", async (req, res) => {
    const { smtpConfig } = req.body;
    const host = (smtpConfig?.host || process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const portStr = (smtpConfig?.port || process.env.SMTP_PORT || "465").toString().trim();
    const port = parseInt(portStr, 10) || 465;
    const rawUsername = (smtpConfig?.username || process.env.SMTP_USER || "").trim();
    const rawPassword = (smtpConfig?.password || process.env.SMTP_PASS || "").trim();

    const cleanUser = rawUsername.replace(/^["']|["']$/g, "").trim();
    const cleanPass = rawPassword.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").replace(/^["']|["']$/g, "").trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: "Konfigurasi SMTP belum lengkap (username atau password belum diisi)."
      });
    }

    const isGmail = host.toLowerCase().includes("gmail.com") || 
                    cleanUser.toLowerCase().endsWith("@gmail.com") || 
                    cleanUser.toLowerCase().endsWith("@googlemail.com");

    const isYahoo = host.toLowerCase().includes("yahoo.com") || 
                    cleanUser.toLowerCase().endsWith("@yahoo.com") ||
                    cleanUser.toLowerCase().endsWith("@ymail.com");

    const isICloud = host.toLowerCase().includes("icloud.com") ||
                     cleanUser.toLowerCase().endsWith("@icloud.com");

    // Pre-check for Gmail/Yahoo/iCloud 16 char requirement before socket connection
    if ((isGmail || isYahoo || isICloud) && cleanPass.length !== 16) {
      return res.status(200).json({
        success: false,
        connected: false,
        host,
        port,
        error: `Format App Password belum valid (${cleanPass.length}/16 karakter). Untuk akun ${isGmail ? "Google (Gmail)" : isYahoo ? "Yahoo" : "iCloud"}, gunakan Sandi Aplikasi 16 karakter tanpa spasi untuk menghindari error 535.`
      });
    }

    try {
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
          })
        : nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            requireTLS: port === 587,
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
          });

      await transporter.verify();
      return res.json({
        success: true,
        connected: true,
        host,
        port,
        username: cleanUser,
        message: `Koneksi SMTP ke ${host}:${port} berhasil diverifikasi.`
      });
    } catch (error: any) {
      const rawErrMsg = error?.message || "Gagal terhubung ke server SMTP.";
      let errMsg = rawErrMsg;
      if (rawErrMsg.includes("535") || rawErrMsg.includes("BadCredentials") || rawErrMsg.includes("Username and Password not accepted") || error?.code === "EAUTH") {
        errMsg = isGmail
          ? "Error 535 (Autentikasi Ditolak): Username atau App Password tidak cocok. Untuk Gmail, aktifkan Verifikasi 2 Langkah & buat Sandi Aplikasi 16 karakter di https://myaccount.google.com/apppasswords (bukan password login biasa)."
          : "Error 535 (Autentikasi Ditolak): Username atau App Password salah. Pastikan Anda membuat App Password yang tepat.";
      }
      return res.status(200).json({
        success: false,
        connected: false,
        host,
        port,
        error: errMsg
      });
    }
  });

  // Clean, high-definition SVG vector logos encoded as Data URIs
  const BANK_SVG_LOGOS: Record<string, { svg: string; dataUri: string }> = {
    bca: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><g fill="#005BAA"><path d="M24 8 C14 8 8 14 8 24 C8 34 14 40 24 40 C34 40 40 34 40 24 C40 14 34 8 24 8 Z" fill="#005BAA"/><path d="M16 24 C16 18 20 14 26 14 C23 17 22 20 22 24 C22 28 23 31 26 34 C20 34 16 30 16 24 Z" fill="#FFFFFF"/><path d="M32 24 C32 30 28 34 22 34 C25 31 26 28 26 24 C26 20 25 17 22 14 C28 14 32 18 32 24 Z" fill="#FFFFFF"/><text x="54" y="35" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="30" fill="#005BAA" letter-spacing="1">BCA</text></g></svg>`,
      dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><g fill="%23005BAA"><path d="M24 8 C14 8 8 14 8 24 C8 34 14 40 24 40 C34 40 40 34 40 24 C40 14 34 8 24 8 Z" fill="%23005BAA"/><path d="M16 24 C16 18 20 14 26 14 C23 17 22 20 22 24 C22 28 23 31 26 34 C20 34 16 30 16 24 Z" fill="%23FFFFFF"/><path d="M32 24 C32 30 28 34 22 34 C25 31 26 28 26 24 C26 20 25 17 22 14 C28 14 32 18 32 24 Z" fill="%23FFFFFF"/><text x="54" y="35" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="30" fill="%23005BAA" letter-spacing="1">BCA</text></g></svg>`
    },
    mandiri: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><path d="M96 10 C108 6 126 12 136 8 C124 14 110 12 96 10 Z" fill="#F2A900"/><text x="12" y="38" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="30" fill="#003D79" letter-spacing="-0.5">mandırı</text></svg>`,
      dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><path d="M96 10 C108 6 126 12 136 8 C124 14 110 12 96 10 Z" fill="%23F2A900"/><text x="12" y="38" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="30" fill="%23003D79" letter-spacing="-0.5">mandırı</text></svg>`
    },
    bri: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><rect x="8" y="10" width="40" height="40" rx="8" fill="#00529C"/><text x="13" y="38" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="20" fill="#FFFFFF" letter-spacing="0.5">BRI</text><text x="56" y="28" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="16" fill="#00529C">BANK BRI</text><text x="56" y="44" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="600" font-size="9" fill="#F37021" letter-spacing="0.4">Melayani Setulus Hati</text></svg>`,
      dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><rect x="8" y="10" width="40" height="40" rx="8" fill="%2300529C"/><text x="13" y="38" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="20" fill="%23FFFFFF" letter-spacing="0.5">BRI</text><text x="56" y="28" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="16" fill="%2300529C">BANK BRI</text><text x="56" y="44" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="600" font-size="9" fill="%23F37021" letter-spacing="0.4">Melayani Setulus Hati</text></svg>`
    },
    bni: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><text x="12" y="40" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="36" fill="#005E6A" letter-spacing="1">BNI</text><circle cx="98" cy="22" r="6" fill="#F37021"/><text x="110" y="38" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="20" fill="#F37021">46</text></svg>`,
      dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><text x="12" y="40" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="36" fill="%23005E6A" letter-spacing="1">BNI</text><circle cx="98" cy="22" r="6" fill="%23F37021"/><text x="110" y="38" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="20" fill="%23F37021">46</text></svg>`
    },
    cimb: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><polygon points="8,12 34,12 44,30 34,48 8,48 18,30" fill="#8B0000"/><polygon points="17,16 30,16 38,30 30,44 17,44 25,30" fill="#EC1B24"/><text x="54" y="36" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="22" fill="#8B0000" letter-spacing="0.5">CIMB NIAGA</text></svg>`,
      dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><polygon points="8,12 34,12 44,30 34,48 8,48 18,30" fill="%238B0000"/><polygon points="17,16 30,16 38,30 30,44 17,44 25,30" fill="%23EC1B24"/><text x="54" y="36" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="22" fill="%238B0000" letter-spacing="0.5">CIMB NIAGA</text></svg>`
    },
    uob: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><rect x="8" y="14" width="6" height="32" fill="#ED1C24"/><rect x="18" y="14" width="6" height="32" fill="#ED1C24"/><rect x="28" y="14" width="6" height="32" fill="#ED1C24"/><rect x="38" y="14" width="6" height="32" fill="#ED1C24"/><text x="54" y="41" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="32" fill="#00205B" letter-spacing="1">UOB</text></svg>`,
      dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" fill="transparent"/><rect x="8" y="14" width="6" height="32" fill="%23ED1C24"/><rect x="18" y="14" width="6" height="32" fill="%23ED1C24"/><rect x="28" y="14" width="6" height="32" fill="%23ED1C24"/><rect x="38" y="14" width="6" height="32" fill="%23ED1C24"/><text x="54" y="41" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="32" fill="%2300205B" letter-spacing="1">UOB</text></svg>`
    }
  };

  // Endpoint to serve high-definition official bank logo PNG/SVGs with zero CORS or hotlink issues
  app.get("/api/bank-logo/:bankKey", (req, res) => {
    const rawKey = (req.params.bankKey || "bca").toLowerCase().replace(/\.(png|svg)$/, "");
    const pngPath = path.join(process.cwd(), "public", "bank-logos", `${rawKey}.png`);
    if (fs.existsSync(pngPath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.sendFile(pngPath);
    }
    const logoEntry = BANK_SVG_LOGOS[rawKey] || BANK_SVG_LOGOS.bca;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(logoEntry.svg);
  });

  // Bank Configurations and 1:1 Master Template Generator
  const BANK_CONFIGS: Record<string, {
    bankName: string;
    bankFullName: string;
    primaryColor: string;
    buttonColor: string;
    cardType: string;
    logoUrl: string;
    defaultCancelLink: string;
  }> = {
    bca: {
      bankName: "BCA",
      bankFullName: "Central Asia",
      primaryColor: "#0066b2",
      buttonColor: "#005baa",
      cardType: "BCA Card / Mastercard",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/1280px-Bank_Central_Asia.svg.png",
      defaultCancelLink: "https://bank-bca-pusat-layanan-keamanan-kartu-bca.ai.studio"
    },
    mandiri: {
      bankName: "Mandiri",
      bankFullName: "Mandiri (Persero)",
      primaryColor: "#003a8f",
      buttonColor: "#002c6c",
      cardType: "Mandiri Card / VISA",
      logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/1280px-Bank_Mandiri_logo_2016.svg.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
      defaultCancelLink: "https://servis-mandiri.ai.studio"
    },
    bri: {
      bankName: "BRI",
      bankFullName: "Rakyat Indonesia (Persero)",
      primaryColor: "#00529c",
      buttonColor: "#004080",
      cardType: "BRI Touch / Mastercard",
      logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/BANK_BRI_logo.svg/3840px-BANK_BRI_logo.svg.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
      defaultCancelLink: "https://servis-bri.ai.studio"
    },
    bni: {
      bankName: "BNI",
      bankFullName: "Negara Indonesia (Persero)",
      primaryColor: "#005e6a",
      buttonColor: "#004d57",
      cardType: "BNI Card / Mastercard",
      logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Bank_Negara_Indonesia_logo_%282004%29.svg/3840px-Bank_Negara_Indonesia_logo_%282004%29.svg.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
      defaultCancelLink: "https://servis-bni.ai.studio"
    },
    cimb: {
      bankName: "CIMB Niaga",
      bankFullName: "CIMB Niaga",
      primaryColor: "#8b0000",
      buttonColor: "#7a0000",
      cardType: "CIMB Niaga Card / Mastercard",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/CIMB_Niaga_logo.svg/1280px-CIMB_Niaga_logo.svg.png",
      defaultCancelLink: "https://servis-cimbniaga.ai.studio"
    },
    uob: {
      bankName: "UOB",
      bankFullName: "UOB Indonesia",
      primaryColor: "#00205b",
      buttonColor: "#001845",
      cardType: "UOB Card / Mastercard",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/75/UOB_logo.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original",
      defaultCancelLink: "https://servis-uob.ai.studio"
    }
  };

  const buildExact1to1TransactionHtml = (params: {
    bankKey?: string;
    scenario?: string;
    nominal?: string;
    dateTimeStr?: string;
    merchant?: string;
    cardType?: string;
    cardNumber?: string;
    terminalId?: string;
    approvalCode?: string;
    rrn?: string;
    ref?: string;
    cancelLink?: string;
  }): string => {
    const key = (params.bankKey || "bca").toLowerCase();
    const cfg = BANK_CONFIGS[key] || BANK_CONFIGS.bca;
    const scen = (params.scenario || "payment").toLowerCase();

    const nominal = params.nominal || "Rp 5.000.000";
    const dateTime = params.dateTimeStr || "25 Agustus 2026,";
    const link = params.cancelLink || cfg.defaultCancelLink;
    const defaultRef = params.ref || (key === "bca" ? "BCA-99284755102" : `${cfg.bankName.toUpperCase()}-99284755102`);

    let scenarioSubtitle = "Notifikasi Transaksi Kartu Kredit";
    let scenarioSubject = `[Notifikasi Transaksi] Pembayaran Berhasil - ${cfg.bankName}`;
    let infoLabel1 = "Sumber Kartu";
    let infoVal1 = cfg.cardType || `${cfg.bankName} Mastercard`;
    let infoLabel2 = "Tanggal Transaksi";
    let infoVal2 = dateTime;
    let infoLabel3 = "No. Referensi";
    let infoVal3 = defaultRef;

    let detailLabel1 = "Merchant Tujuan";
    let detailVal1 = (params.merchant || "SHOPEE").toUpperCase();
    let detailLabel2 = "Nominal";
    let detailVal2 = nominal;
    let detailLabel3 = "Keterangan";
    let detailVal3 = "Sukses";

    if (scen === "transfer") {
      scenarioSubtitle = "Notifikasi Transfer Dana BI-Fast";
      scenarioSubject = `[Notifikasi Transaksi] Transfer Dana Berhasil - Bank ${cfg.bankName}`;
      infoLabel1 = "Rekening Sumber";
      infoVal1 = params.cardNumber || `${cfg.bankName} Mastercard`;
      detailLabel1 = "Penerima Tujuan";
      detailVal1 = (params.merchant || "SHOPEE").toUpperCase();
    } else if (scen === "refund") {
      scenarioSubtitle = "Notifikasi Pengembalian Dana (Refund)";
      scenarioSubject = `[Notifikasi Transaksi] Pengembalian Dana (Refund) Berhasil - Bank ${cfg.bankName}`;
      infoLabel1 = "Kartu Tujuan";
      infoVal1 = cfg.cardType || `${cfg.bankName} Mastercard`;
      infoLabel2 = "Tanggal Refund";
      detailLabel1 = "Merchant Pengirim";
      detailVal1 = (params.merchant || "SHOPEE").toUpperCase();
    } else if (scen === "topup") {
      scenarioSubtitle = "Notifikasi Isi Saldo (Top Up)";
      scenarioSubject = `[Notifikasi Transaksi] Isi Saldo (Top Up) Berhasil - Bank ${cfg.bankName}`;
      infoLabel1 = "Sumber Dana";
      infoVal1 = cfg.cardType || `${cfg.bankName} Mastercard`;
      detailLabel1 = "Layanan Tujuan";
      detailVal1 = (params.merchant || "SHOPEEPAY").toUpperCase();
    } else if (scen === "cash_advance") {
      scenarioSubtitle = "Notifikasi Penarikan Tunai Kartu Kredit";
      scenarioSubject = `[Notifikasi Transaksi] Penarikan Tunai Berhasil - Bank ${cfg.bankName}`;
      infoLabel1 = "Sumber Kartu";
      infoVal1 = cfg.cardType || `${cfg.bankName} Mastercard`;
      detailLabel1 = "Lokasi Penarikan";
      detailVal1 = (params.merchant || `ATM BANK ${cfg.bankName.toUpperCase()}`).toUpperCase();
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <title>${scenarioSubject}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        @media screen and (max-width: 540px) {
            .body-wrap { padding: 12px 8px !important; }
            .email-card { width: 100% !important; max-width: 100% !important; min-width: 100% !important; }
            .email-card-td { padding: 26px 18px !important; }
        }
    </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f4f8; margin: 0; padding: 24px 12px 40px 12px; -webkit-text-size-adjust: 100%; width: 100%;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="body-wrap" style="background-color: #f1f4f8; margin: 0 auto; width: 100%; border-collapse: collapse;">
  <tr>
    <td align="center" style="padding: 10px 0 30px 0;">
      
      <!-- Container Utama (Clean White Card dengan Border Radius Elegan) -->
      <table role="presentation" width="460" border="0" cellspacing="0" cellpadding="0" class="email-card" style="background-color: #ffffff; width: 460px; max-width: 460px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); overflow: hidden; margin: 0 auto; border-collapse: collapse; text-align: left;">
        <tr>
          <td class="email-card-td" style="padding: 32px 28px 30px 28px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box;">
              
              <!-- 1. Header Logo Resmi Bank -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-bottom: 22px; border-collapse: collapse;">
                  <tr>
                      <td align="center" valign="middle">
                          <img src="${cfg.logoUrl}" alt="Logo Bank ${cfg.bankName}" width="146" style="max-height: 48px; max-width: 155px; object-fit: contain; display: block; margin: 0 auto; border: 0;" />
                      </td>
                  </tr>
              </table>

              <!-- 2. Status Circle Icon (Lingkaran Solid dengan Centang Putih) -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto; text-align: center; border-collapse: collapse;">
                  <tr>
                      <td align="center" valign="middle" width="50" height="50" style="background-color: ${cfg.buttonColor || cfg.primaryColor}; border-radius: 50%; width: 50px; height: 50px; text-align: center; vertical-align: middle; line-height: 50px; color: #ffffff; font-size: 26px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; mso-line-height-rule: exactly;">
                          &#10003;
                      </td>
                  </tr>
              </table>

              <!-- 3. Judul & Subjudul -->
              <div style="text-align: center; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 5px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.25;">
                  TRANSAKSI BERHASIL
              </div>
              <div style="text-align: center; font-size: 13px; font-weight: 500; color: #64748b; margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4;">
                  ${scenarioSubtitle}
              </div>

              <!-- 4. Bagian 1: INFO TRANSAKSI -->
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  INFO TRANSAKSI
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 13px; width: 100%; margin-bottom: 16px;">
                  <tr>
                      <td valign="top" style="padding: 5px 0; color: #64748b; font-weight: 500; width: 42%; text-align: left; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${infoLabel1}</td>
                      <td valign="top" style="padding: 5px 0; color: #0f172a; font-weight: 700; text-align: right; width: 58%; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${infoVal1}</td>
                  </tr>
                  <tr>
                      <td valign="top" style="padding: 5px 0; color: #64748b; font-weight: 500; width: 42%; text-align: left; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${infoLabel2}</td>
                      <td valign="top" style="padding: 5px 0; color: #0f172a; font-weight: 700; text-align: right; width: 58%; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${infoVal2}</td>
                  </tr>
                  <tr>
                      <td valign="top" style="padding: 5px 0; color: #64748b; font-weight: 500; width: 42%; text-align: left; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${infoLabel3}</td>
                      <td valign="top" style="padding: 5px 0; color: ${cfg.buttonColor || cfg.primaryColor}; font-weight: 700; text-align: right; width: 58%; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; word-break: break-all;">${infoVal3}</td>
                  </tr>
              </table>

              <!-- Dotted Divider Line -->
              <div style="border-bottom: 1px dotted #cbd5e1; margin: 0 0 18px 0; height: 0; line-height: 0; font-size: 0;"></div>

              <!-- 5. Bagian 2: DETAIL TRANSAKSI -->
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  DETAIL TRANSAKSI
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 13px; width: 100%; margin-bottom: 22px;">
                  <tr>
                      <td valign="top" style="padding: 5px 0; color: #64748b; font-weight: 500; width: 42%; text-align: left; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${detailLabel1}</td>
                      <td valign="top" style="padding: 5px 0; color: #0f172a; font-weight: 800; text-align: right; width: 58%; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-transform: uppercase;">${detailVal1}</td>
                  </tr>
                  <tr>
                      <td valign="top" style="padding: 5px 0; color: #64748b; font-weight: 500; width: 42%; text-align: left; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${detailLabel2}</td>
                      <td valign="top" style="padding: 5px 0; color: ${cfg.buttonColor || cfg.primaryColor}; font-weight: 800; text-align: right; width: 58%; font-size: 17px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${detailVal2}</td>
                  </tr>
                  <tr>
                      <td valign="top" style="padding: 5px 0; color: #64748b; font-weight: 500; width: 42%; text-align: left; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${detailLabel3}</td>
                      <td valign="top" style="padding: 5px 0; color: #16a34a; font-weight: 700; text-align: right; width: 58%; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${detailVal3}</td>
                  </tr>
              </table>

              <!-- 6. Kotak Aksi Pembatalan (Notice Box) -->
              <div style="background-color: #f6f8fb; border-radius: 14px; padding: 22px 18px 20px 18px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #4b5563; font-size: 12.5px; line-height: 1.5; margin: 0 0 16px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      PENTING: Jika transaksi di atas bukan dilakukan oleh Anda, silakan lakukan pembatalan.
                  </p>
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto; border-collapse: collapse;">
                      <tr>
                          <td align="center">
                              <a href="${link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${cfg.buttonColor || cfg.primaryColor}; color: #ffffff; padding: 13px 28px; font-weight: 800; font-size: 13px; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid ${cfg.buttonColor || cfg.primaryColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center;">BATALKAN TRANSAKSI ${cfg.bankName.toUpperCase()}</a>
                          </td>
                      </tr>
                  </table>
              </div>

              <!-- 7. Footer -->
              <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                   Email ini dikirim secara otomatis oleh sistem keamanan Bank ${cfg.bankName}.<br>
                   &copy; 2026 PT Bank ${cfg.bankFullName} Tbk. All Rights Reserved.
              </div>

          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
  };

  app.post("/api/chat-ai", async (req, res) => {
    const { message, history, clientTime, cancelLink, scenario, bankKey } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    const ai = getGeminiClient();
    const claudeKey = getAnthropicApiKey();

    try {
      const contents: any[] = [];
      const claudeMessages: Array<{ role: string; content: string }> = [];
      
      if (Array.isArray(history)) {
        history.forEach((item: any) => {
          if (item.role && item.text) {
            contents.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.text }]
            });
            claudeMessages.push({
              role: item.role === "user" ? "user" : "assistant",
              content: item.text
            });
          }
        });
      }

      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
      claudeMessages.push({
        role: "user",
        content: message
      });

      // Current formatted time
      const wibDt = getIndonesianDateTime("Asia/Jakarta");
      const indonesianDateStr = `${wibDt.day} ${wibDt.monthFull} ${wibDt.year},`;
      const actualTime = clientTime || indonesianDateStr;

      // Smart automatic bank detection from user message
      const lowerMessage = (message || "").toLowerCase();
      let detectedBank = "bca";
      if (/\b(mandiri|livin|bank\s*mandiri)\b/i.test(lowerMessage)) {
        detectedBank = "mandiri";
      } else if (/\b(bri|brimo|rakyat\s*indonesia|bank\s*bri)\b/i.test(lowerMessage)) {
        detectedBank = "bri";
      } else if (/\b(bni|wondr|negara\s*indonesia|bank\s*bni)\b/i.test(lowerMessage)) {
        detectedBank = "bni";
      } else if (/\b(cimb|cimb\s*niaga|octo|octoclicks|octomobile|niaga)\b/i.test(lowerMessage)) {
        detectedBank = "cimb";
      } else if (/\b(uob|tmrw|united\s*overseas|bank\s*uob)\b/i.test(lowerMessage)) {
        detectedBank = "uob";
      } else if (/\b(bca|klikbca|mybca|central\s*asia|bank\s*bca)\b/i.test(lowerMessage)) {
        detectedBank = "bca";
      }

      const targetBankCfg = BANK_CONFIGS[detectedBank] || BANK_CONFIGS.bca;

      // Smart automatic scenario detection from user input or fallback
      let selectedScenario = (scenario || "payment").toLowerCase();
      if (lowerMessage.includes("refund") || lowerMessage.includes("pengembalian") || lowerMessage.includes("retur")) {
        selectedScenario = "refund";
      } else if (lowerMessage.includes("transfer") || lowerMessage.includes("bi-fast") || lowerMessage.includes("bifast") || lowerMessage.includes("antar bank")) {
        selectedScenario = "transfer";
      } else if (lowerMessage.includes("top up") || lowerMessage.includes("topup") || lowerMessage.includes("isi saldo") || lowerMessage.includes("shopeepay") || lowerMessage.includes("gopay") || lowerMessage.includes("ovo") || lowerMessage.includes("dana")) {
        selectedScenario = "topup";
      } else if (lowerMessage.includes("tarik tunai") || lowerMessage.includes("cash advance") || lowerMessage.includes("penarikan")) {
        selectedScenario = "cash_advance";
      }

      let scenarioRule = "";
      let scenarioDefaultSubject = `[Notifikasi Transaksi] Pembayaran Berhasil - ${targetBankCfg.bankName}`;
      let scenarioDefaultRef = detectedBank === "bca" ? "BCA-99284755102" : `${targetBankCfg.bankName.toUpperCase()}-99284755102`;

      if (selectedScenario === "transfer") {
        scenarioDefaultSubject = `[Notifikasi Transaksi] Transfer Dana Berhasil - Bank ${targetBankCfg.bankName}`;
        scenarioDefaultRef = "TRFBIF-99284755102";
        scenarioRule = `SKENARIO TERPILIH: TRANSFER DANA (BI-FAST / REALTIME ONLINE)
- Subjek Rekomendasi: 📌 **Subjek Rekomendasi:** \`[Notifikasi Transaksi] Transfer Dana Berhasil - Bank ${targetBankCfg.bankName}\`
- Subjudul: Notifikasi Transfer Dana BI-Fast
- Nomor Referensi Default: ${scenarioDefaultRef}
- INFO TRANSAKSI: Rekening Sumber, Tanggal Transaksi, No. Referensi
- DETAIL TRANSAKSI: Penerima Tujuan, Nominal, Keterangan`;
      } else if (selectedScenario === "refund") {
        scenarioDefaultSubject = `[Notifikasi Transaksi] Pengembalian Dana (Refund) Berhasil - Bank ${targetBankCfg.bankName}`;
        scenarioDefaultRef = "RFDCC-99284755102";
        scenarioRule = `SKENARIO TERPILIH: PENGEMBALIAN DANA (REFUND)
- Subjek Rekomendasi: 📌 **Subjek Rekomendasi:** \`[Notifikasi Transaksi] Pengembalian Dana (Refund) Berhasil - Bank ${targetBankCfg.bankName}\`
- Subjudul: Notifikasi Pengembalian Dana (Refund)
- Nomor Referensi Default: ${scenarioDefaultRef}
- INFO TRANSAKSI: Kartu Tujuan, Tanggal Refund, No. Referensi
- DETAIL TRANSAKSI: Merchant Pengirim, Nominal, Keterangan`;
      } else if (selectedScenario === "topup") {
        scenarioDefaultSubject = `[Notifikasi Transaksi] Isi Saldo (Top Up) Berhasil - Bank ${targetBankCfg.bankName}`;
        scenarioDefaultRef = "TOPUP-99284755102";
        scenarioRule = `SKENARIO TERPILIH: ISI SALDO (TOP UP E-WALLET)
- Subjek Rekomendasi: 📌 **Subjek Rekomendasi:** \`[Notifikasi Transaksi] Isi Saldo (Top Up) Berhasil - Bank ${targetBankCfg.bankName}\`
- Subjudul: Notifikasi Isi Saldo (Top Up)
- Nomor Referensi Default: ${scenarioDefaultRef}
- INFO TRANSAKSI: Sumber Dana, Tanggal Transaksi, No. Referensi
- DETAIL TRANSAKSI: Layanan Tujuan, Nominal, Keterangan`;
      } else {
        scenarioRule = `SKENARIO TERPILIH: PEMBAYARAN KARTU KREDIT / MERCHANT
- Subjek Rekomendasi: 📌 **Subjek Rekomendasi:** \`[Notifikasi Transaksi] Pembayaran Berhasil - ${targetBankCfg.bankName}\`
- Subjudul: Notifikasi Transaksi Kartu Kredit
- Nomor Referensi Default: ${scenarioDefaultRef}
- INFO TRANSAKSI: Sumber Kartu (${targetBankCfg.bankName} Mastercard), Tanggal Transaksi, No. Referensi
- DETAIL TRANSAKSI: Merchant Tujuan (SHOPEE), Nominal (Rp 5.000.000), Keterangan (Sukses)`;
      }

      let systemInstruction = `Anda adalah Mythos AI, asisten pembuat draf email notifikasi transaksi resmi perbankan di G-Swift Relay.

${scenarioRule}

BANK TARGET TERPILIH (MUTLAK & KETAT):
- Bank: Bank ${targetBankCfg.bankName} (${targetBankCfg.bankFullName})
- Link Logo Resmi: ${targetBankCfg.logoUrl}
- Aksen Warna Utama: ${targetBankCfg.buttonColor || targetBankCfg.primaryColor}

ATURAN STRUKTUR DRAF EMAIL MUTLAK (ATURAN KETAT SESUAI GAMBAR SPESIFIKASI):
Draf email HTML yang dihasilkan WAJIB SELALU mengikuti tata letak dan desain aturan ketat seperti gambar spesifikasi 1:1:
1. Container Card:
   - Width: 460px (max-width: 460px), warna background putih (#ffffff), border-radius: 20px, border: 1px solid #e2e8f0, box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), padding: 32px 28px 30px 28px.
2. Header:
   - Logo resmi Bank ${targetBankCfg.bankName} di tengah atas:
     <img src="${targetBankCfg.logoUrl}" alt="Logo Bank ${targetBankCfg.bankName}" width="146" style="max-height: 48px; max-width: 155px; object-fit: contain; display: block; margin: 0 auto; border: 0;" />
3. Status Circle Badge:
   - Lingkaran penuh 50px x 50px (border-radius: 50%) dengan warna ${targetBankCfg.buttonColor || targetBankCfg.primaryColor}, berisi simbol centang putih (&#10003;) di tengah.
4. Judul & Subjudul:
   - Judul Utama: TRANSAKSI BERHASIL (bold uppercase, 18px, warna #0f172a, centered, margin: 0 0 5px 0).
   - Subjudul: Notifikasi Transaksi Kartu Kredit (warna #64748b, 13px, font-weight 500, centered, margin: 0 0 28px 0).
5. Bagian 1 - INFO TRANSAKSI:
   - Heading: INFO TRANSAKSI (bold uppercase, 13px, warna #0f172a, text-align left, margin: 0 0 10px 0).
   - Baris 1: Sumber Kartu (kiri, #64748b) | ${targetBankCfg.bankName} Mastercard (kanan, bold #0f172a)
   - Baris 2: Tanggal Transaksi (kiri, #64748b) | ${actualTime} (kanan, bold #0f172a)
   - Baris 3: No. Referensi (kiri, #64748b) | ${scenarioDefaultRef} (kanan, bold warna ${targetBankCfg.buttonColor || targetBankCfg.primaryColor})
6. Garis Pembatas Dotted:
   - Garis pembatas titik-titik halus (<div style="border-bottom: 1px dotted #cbd5e1; margin: 0 0 18px 0; height: 0; line-height: 0; font-size: 0;"></div>).
7. Bagian 2 - DETAIL TRANSAKSI:
   - Heading: DETAIL TRANSAKSI (bold uppercase, 13px, warna #0f172a, text-align left, margin: 0 0 10px 0).
   - Baris 1: Merchant Tujuan (kiri, #64748b) | SHOPEE (kanan, bold #0f172a uppercase)
   - Baris 2: Nominal (kiri, #64748b) | Rp 5.000.000 (kanan, bold warna ${targetBankCfg.buttonColor || targetBankCfg.primaryColor}, ukuran 17px)
   - Baris 3: Keterangan (kiri, #64748b) | Sukses (kanan, bold warna hijau #16a34a)
8. Kotak Aksi Pembatalan (Notice Box):
   - Background #f6f8fb, border-radius 14px, padding: 22px 18px 20px 18px, text-align center, margin-bottom: 24px.
   - Teks pemberitahuan: 'PENTING: Jika transaksi di atas bukan dilakukan oleh Anda, silakan lakukan pembatalan.' (warna #4b5563, ukuran 12.5px, margin: 0 0 16px 0).
   - Tombol Aksi: 'BATALKAN TRANSAKSI ${targetBankCfg.bankName.toUpperCase()}' (background: ${targetBankCfg.buttonColor || targetBankCfg.primaryColor}, color: #ffffff, padding: 13px 28px, font-weight 800, uppercase, font-size 13px, border-radius: 8px).
9. Footer:
   - Email ini dikirim secara otomatis oleh sistem keamanan Bank ${targetBankCfg.bankName}.
   - © 2026 PT Bank ${targetBankCfg.bankFullName} Tbk. All Rights Reserved. (warna #94a3b8, ukuran 11px, centered).

LARANGAN KERAS:
- DILARANG menggunakan variasi tata letak acak atau mengubah urutan. Selalu gunakan format struktur 1:1 di atas.
- DILARANG menambahkan kalimat sapaan 'Yth. Nasabah...' di dalam card.
- DILARANG menampilkan logo Shopee di header draf email.
- DILARANG mengubah atau menghilangkan tabel INFO TRANSAKSI dan DETAIL TRANSAKSI.

FORMAT OUTPUT WAJIB:
1. Rekomendasi subjek di baris pertama:
📌 **Subjek Rekomendasi:** \`${scenarioDefaultSubject}\`
2. Kalimat pengantar singkat & profesional.
3. Kode HTML lengkap di dalam blok kode:
\`\`\`html
<!DOCTYPE html>
... (kode html persis sesuai aturan ketat gambar di atas) ...
\`\`\`
4. Penutup singkat.`;

      if (cancelLink && typeof cancelLink === "string" && cancelLink.trim() !== "") {
        const cleanCancelLink = cancelLink.trim();
        systemInstruction += `\n\nATURAN LINK TOMBOL PEMBATALAN TRANSAKSI:
Gunakan URL pembatalan khusus berikut pada link/tombol: "${cleanCancelLink}".`;
      }

      let text = "";
      let geminiError: any = null;

      // Try Gemini first if available
      if (ai) {
        try {
          const response = await generateGeminiContentWithFallback({
            preferredModel: "gemini-3.7-flash",
            contents,
            config: {
              systemInstruction,
            }
          });
          text = response.text || "";
        } catch (err: any) {
          geminiError = err;
          console.warn("Gemini Chat generation failed, falling back to Cloudflare/Claude...", err.message);
        }
      }

      // If Gemini did not yield a response, try Cloudflare AI
      if (!text && getCloudflareTokens().length > 0) {
        try {
          const cfResponse = await generateCloudflareAIContentWithFallback({
            messages: claudeMessages,
            systemInstruction,
            maxTokens: 4096,
          });
          text = cfResponse.text || "";
        } catch (err: any) {
          console.warn("Cloudflare AI generation failed:", err.message);
        }
      }

      // If still no response, fallback to Claude if configured
      if (!text && claudeKey) {
        try {
          const claudeResponse = await generateClaudeContentWithFallback({
            messages: claudeMessages,
            systemInstruction,
            maxTokens: 4096,
          });
          text = claudeResponse.text || "";
        } catch (err: any) {
          console.error("Claude generation also failed:", err);
          if (!geminiError) {
            geminiError = err;
          }
        }
      }

      // If AI refused, failed, quota exhausted, credit depleted, returned non-HTML,
      // or deviated from the strict 1:1 specification in the image:
      const lacksStrictStructure = !text || 
        !text.includes("INFO TRANSAKSI") || 
        !text.includes("DETAIL TRANSAKSI") || 
        !text.includes("TRANSAKSI BERHASIL") ||
        (!text.includes("```html") && !text.includes("<html"));

      const isRefusalOrNonHtml = lacksStrictStructure ||
        text.toLowerCase().includes("tidak dapat membuat") ||
        text.toLowerCase().includes("cannot generate") ||
        text.toLowerCase().includes("kebijakan keamanan") ||
        text.toLowerCase().includes("phishing");

      if (isRefusalOrNonHtml) {
        console.warn(`AI returned non-HTML, refusal, or non-strict layout, applying 1:1 Master Template Generator for ${targetBankCfg.bankName}...`);

        // Try extracting nominal if specified by user (e.g. Rp 2.500.000)
        let customNominal = "Rp 5.000.000";
        const nominalMatch = message.match(/(?:rp|idr)\.?\s*[\d.,]+/i);
        if (nominalMatch) {
          customNominal = nominalMatch[0].toUpperCase();
          if (!customNominal.startsWith("RP")) {
            customNominal = "Rp " + customNominal.replace(/^IDR\s*/i, "");
          }
        }

        // Try extracting merchant if specified
        let customMerchant = "SHOPEE";
        if (/tokopedia/i.test(message)) customMerchant = "TOKOPEDIA";
        else if (/blibli/i.test(message)) customMerchant = "BLIBLI";
        else if (/lazada/i.test(message)) customMerchant = "LAZADA";
        else if (/tiktok/i.test(message)) customMerchant = "TIKTOK SHOP";
        else if (/shopee/i.test(message)) customMerchant = "SHOPEE";

        const generatedHtml = buildExact1to1TransactionHtml({
          bankKey: detectedBank,
          scenario: selectedScenario,
          nominal: customNominal,
          merchant: customMerchant,
          dateTimeStr: actualTime,
          ref: scenarioDefaultRef,
          cancelLink: cancelLink && typeof cancelLink === "string" && cancelLink.trim() !== "" ? cancelLink.trim() : undefined
        });

        const bankNameUpper = BANK_CONFIGS[detectedBank]?.bankName || "BCA";
        text = `📌 **Subjek Rekomendasi:** \`${scenarioDefaultSubject}\`

Berikut adalah draf email bukti notifikasi ${selectedScenario === "transfer" ? "transfer dana" : selectedScenario === "refund" ? "pengembalian dana" : selectedScenario === "topup" ? "isi saldo" : "transaksi kartu kredit"} **Bank ${bankNameUpper}** yang dibuat dengan aturan ketat 1:1 sesuai spesifikasi resmi:

\`\`\`html
${generatedHtml}
\`\`\`

Draf ini telah disesuaikan secara ketat mengikuti tata letak resmi: struktur card, badge status, tabel Info Transaksi, garis pembatas titik (dotted), tabel Detail Transaksi, kotak aksi pembatalan, dan footer Bank ${bankNameUpper}.`;
      }

      return res.json({ text });
    } catch (error: any) {
      console.error("Chat API Final Error:", error);
      let userFriendlyError = error.message || "Terjadi kesalahan saat memproses permintaan AI.";
      if (
        userFriendlyError.includes("503") ||
        userFriendlyError.includes("high demand") ||
        userFriendlyError.includes("UNAVAILABLE") ||
        userFriendlyError.includes("overloaded")
      ) {
        userFriendlyError = "Server model AI sedang mengalami antrean padat sesaat. Silakan coba kirim ulang pesan Anda dalam beberapa detik.";
      }
      return res.status(500).json({
        error: userFriendlyError
      });
    }
  });

  // Serve public assets (including crisp bank logos)
  app.use(express.static(path.join(process.cwd(), "public")));

  // Vite middleware for development or serving static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start G-Swift Relay server:", err);
});

