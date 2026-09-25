import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import RichTextEditor from "./components/RichTextEditor";
import ClaudeLogo from "./components/ClaudeLogo";
import { executeWorkerTask } from "./workers/htmlWorkerBridge";
import {
  Send,
  FileText,
  Terminal,
  Settings,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  X,
  Eye,
  Info,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Sparkles,
  Bot,
  Check,
  ChevronDown,
  Activity,
  RotateCcw,
  Copy,
  Bookmark,
  RefreshCw,
  WifiOff,
  SlidersHorizontal,
  Link as LinkIcon,
  ExternalLink,
  Mail,
  Server,
  CheckCheck,
  Clock,
  Eraser,
  PanelLeftClose,
  PanelLeftOpen,
  Keyboard,
  Smartphone,
  Monitor
} from "lucide-react";

// Tailwind className helper
const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

interface LogItem {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  message: string;
}

interface DeliveryNotice {
  status: "success" | "error";
  recipient: string;
  subject: string;
  isTest?: boolean;
  messageId?: string;
  errorMessage?: string;
  tip?: string;
  serverHost?: string;
  serverPort?: string;
  elapsedMs?: number;
  timestamp: string;
  rawPayload?: { to: string; subject: string; bodyText: string; isTest?: boolean };
}

const DEFAULT_SMTP = {
  host: "",
  port: "",
  username: "",
  password: "",
  senderEmail: "",
  fromName: "",
  replyTo: "",
  dailyLimit: "",
  connectionType: "STARTTLS"
};

const INITIAL_AI_GREETING = "Halo! Saya Claude Mythos. Silakan masukkan detail transaksi kartu kredit yang ingin dibuat.";

export const DEFAULT_BCA_TEMPLATE = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <title>Pembayaran Kartu Kredit Berhasil</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        img { -ms-interpolation-mode: bicubic; }

        @media screen and (max-width: 560px) {
            .body-wrap { padding: 10px !important; }
            .email-card { width: 100% !important; max-width: 100% !important; min-width: 100% !important; }
            .email-card-td { padding: 24px 16px !important; box-sizing: border-box !important; }
        }
    </style>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif, -apple-system; background-color: #f4f5f7; margin: 0; padding: 20px 10px 40px 10px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; width: 100%;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="body-wrap" style="background-color: #f4f5f7; margin: 0 auto; width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td align="center" style="padding: 10px 0 30px 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      
      <!-- Container Utama (Ukuran 520px Pas 1:1 Sesuai Desain Resmi BCA) -->
      <table role="presentation" width="520" border="0" cellspacing="0" cellpadding="0" class="email-card" style="background-color: #ffffff; width: 520px; max-width: 520px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); overflow: hidden; margin: 0 auto; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; text-align: left;">
        <tr>
          <td class="email-card-td" style="padding: 32px 24px 32px 24px; text-align: left; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; box-sizing: border-box;">
              
              <!-- Status Icon Circle Blue -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto; text-align: center; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                      <td align="center" valign="middle" width="56" height="56" style="background-color: #0066b2; border-radius: 16px; width: 56px; height: 56px; text-align: center; vertical-align: middle; line-height: 56px; color: #ffffff; font-size: 28px; font-weight: 900; font-family: 'Segoe UI', Arial, sans-serif; mso-line-height-rule: exactly; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
                          &#10003;
                      </td>
                  </tr>
              </table>

              <!-- Nominal, Tanggal, & Teks Transaksi Berhasil -->
              <div style="text-align: center; font-size: 22px; font-weight: 800; color: #0066b2; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.2;">Rp 5.000.000</div>
              <div style="text-align: center; font-size: 12px; font-weight: 500; color: #6b7280; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.4;">24/05/2024 - 10:15:22 WIB</div>
              <div style="text-align: center; font-size: 14px; font-weight: 800; color: #111827; letter-spacing: 0.3px; margin: 0 0 20px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.4;">Transaksi Kartu Kredit Berhasil</div>

              <!-- Divider Atas -->
              <div style="border-bottom: 1px solid #d1d5db; margin: 0 0 16px 0; height: 0; line-height: 0; font-size: 0;"></div>

              <!-- Bagian Detail Transaksi -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                      <td style="padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
                          
                          <!-- DETAIL TRANSAKSI KARTU KREDIT (Tinggi Baris Diperlebar Proporsional) -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; font-size: 12px; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-family: 'Segoe UI', Arial, sans-serif, -apple-system;">
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Merchant</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">SHOPEE INDONESIA</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Jenis Kartu</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">BCA Card / Mastercard</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">No. Kartu</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">5203-XXXX-XXXX-XXXX</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Lokasi / Negara</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">INDONESIA</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Terminal ID</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">CCSHOPEE01</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Approval Code</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">884921</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">RRN</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">628491029</td>
                              </tr>
                              <tr>
                                  <td valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">Ref</td>
                                  <td valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; word-break: break-all;">CCSHOPEE23082026065617</td>
                              </tr>
                          </table>

                      </td>
                  </tr>
              </table>

              <!-- Divider Bawah -->
              <div style="border-bottom: 1px solid #d1d5db; margin: 16px 0; height: 0; line-height: 0; font-size: 0;"></div>

              <!-- Rounded Notice Box & CTA Button -->
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 16px; text-align: center; box-sizing: border-box; margin: 0 0 4px 0;">
                  <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0 0 12px 0; text-align: center; font-family: 'Segoe UI', Arial, sans-serif, -apple-system;">
                      Jika transaksi ini mencurigakan, silakan kunjungi situs resmi BCA untuk pengamanan transaksi.
                  </p>
                  <a href="https://bank-bca-pusat-layanan-keamanan-kartu-bca.ai.studio" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #005baa; color: #ffffff; padding: 10px 24px; font-weight: 900; font-size: 12px; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid #005baa; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; box-sizing: border-box;">Batalkan Transaksi BCA</a>
              </div>

              <!-- Footer Notes -->
              <div style="text-align: center; font-size: 10px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px; margin-top: 20px; font-family: 'Segoe UI', Arial, sans-serif, -apple-system;">
                   Email ini dikirim secara otomatis oleh sistem keamanan Bank BCA.<br>
                   &copy; 2026 PT Bank Central Asia Tbk. All Rights Reserved.
              </div>

          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

const DEFAULT_TEMPLATES: TemplateItem[] = [];

// Helper to extract clean email addresses from noisy or formatted text (stripping names, phones, labels, brackets, markdown, URLs)
const extractEmailAddresses = (text: string): string[] => {
  if (!text || typeof text !== "string") return [];
  
  // 1. Sanitize common prefixes/escapes like mailto:, urlencoded %40, and markdown links
  let sanitized = text
    .replace(/mailto:\s*/gi, " ")
    .replace(/%40/gi, "@")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2"); // Unpack markdown links [Name](mailto:user@domain.com)

  // 2. Extract potential email tokens
  const rawMatches = sanitized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
  const uniqueEmails: string[] = [];

  for (const match of rawMatches) {
    // Strip surrounding brackets, quotes, punctuation, trailing colons/semicolons/dots/slashes
    const clean = match
      .replace(/^[<(\['"{\s/\\:]+|[>)\]'",.:;!\s/\\}]+$/g, "")
      .trim()
      .toLowerCase();

    // Strict validation of the clean token
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(clean)) {
      // Ensure domain contains valid labels (no consecutive dots or leading/trailing dashes)
      const domainPart = clean.split("@")[1];
      if (domainPart && !domainPart.startsWith("-") && !domainPart.endsWith("-") && !domainPart.includes("..")) {
        if (!uniqueEmails.includes(clean)) {
          uniqueEmails.push(clean);
        }
      }
    }
  }
  return uniqueEmails;
};

// Helper to validate App Password format (e.g. Gmail/Yahoo 16 lowercase characters or alphanumeric without spaces)
const validateAppPasswordFormat = (password: string, username: string = "") => {
  const cleanPass = (password || "").replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").replace(/^["']|["']$/g, "").trim();
  const lowerUser = (username || "").toLowerCase().trim();
  const isGmail = lowerUser.includes("@gmail.com") || lowerUser.includes("@googlemail.com");
  const isGmailOrYahoo = isGmail || 
                         lowerUser.includes("@yahoo.com") || 
                         lowerUser.includes("@ymail.com") ||
                         lowerUser.includes("@icloud.com");

  const length = cleanPass.length;
  const isExact16 = length === 16;
  const isAlphaOnly = /^[a-zA-Z]+$/.test(cleanPass);
  const hasSpaces = /[\s\u00A0]/.test(password || "");

  return {
    raw: password || "",
    clean: cleanPass,
    length,
    isExact16,
    isAlphaOnly,
    hasSpaces,
    isGmail,
    isGmailOrYahoo,
    // Valid if 16 chars for Gmail/Yahoo, or non-empty for custom domains
    isValidForMajorProvider: isExact16,
    formatted16: isExact16 ? `${cleanPass.slice(0, 4)} ${cleanPass.slice(4, 8)} ${cleanPass.slice(8, 12)} ${cleanPass.slice(12, 16)}` : cleanPass
  };
};

interface SmartSmtpSettings {
  name: string;
  host: string;
  port: string;
  connectionType: "STARTTLS" | "SSL_TLS" | "NONE";
  dailyLimit: string;
}

const getSmartSmtpSettings = (email: string): SmartSmtpSettings | null => {
  if (!email || !email.includes("@")) return null;
  const parts = email.split("@");
  if (parts.length < 2) return null;
  const domain = parts[1].toLowerCase().trim();
  if (!domain) return null;

  if (domain === "gmail.com") {
    return { name: "Google Mail (Gmail)", host: "smtp.gmail.com", port: "587", connectionType: "STARTTLS", dailyLimit: "500" };
  }
  if (domain.endsWith("yahoo.com") || domain === "ymail.com" || domain === "yahoo.co.id") {
    return { name: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: "465", connectionType: "SSL_TLS", dailyLimit: "500" };
  }
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "live.co.id") {
    return { name: "Microsoft Outlook", host: "smtp-mail.outlook.com", port: "587", connectionType: "STARTTLS", dailyLimit: "300" };
  }
  if (domain === "icloud.com") {
    return { name: "Apple iCloud", host: "smtp.mail.me.com", port: "587", connectionType: "STARTTLS", dailyLimit: "500" };
  }
  if (domain === "zoho.com") {
    return { name: "Zoho Mail", host: "smtp.zoho.com", port: "465", connectionType: "SSL_TLS", dailyLimit: "150" };
  }
  if (domain === "yandex.com" || domain === "yandex.ru") {
    return { name: "Yandex Mail", host: "smtp.yandex.com", port: "465", connectionType: "SSL_TLS", dailyLimit: "150" };
  }
  if (domain === "mailgun.com" || domain.endsWith(".mailgun.org")) {
    return { name: "Mailgun Relay", host: "smtp.mailgun.org", port: "587", connectionType: "STARTTLS", dailyLimit: "10000" };
  }
  if (domain === "sendgrid.com" || domain === "sendgrid.net") {
    return { name: "SendGrid Relay", host: "smtp.sendgrid.net", port: "587", connectionType: "STARTTLS", dailyLimit: "10000" };
  }
  if (domain === "brevo.com" || domain === "sendinblue.com") {
    return { name: "Brevo Relay", host: "smtp-relay.brevo.com", port: "587", connectionType: "STARTTLS", dailyLimit: "300" };
  }
  if (domain === "hostinger.com" || domain === "hostinger.co.id") {
    return { name: "Hostinger Webmail", host: "smtp.hostinger.com", port: "465", connectionType: "SSL_TLS", dailyLimit: "1000" };
  }

  return {
    name: `Domain Kustom (${domain})`,
    host: `mail.${domain}`,
    port: "465",
    connectionType: "SSL_TLS",
    dailyLimit: "200"
  };
};

export default function App() {
  // Application States
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [tab, setTab] = useState("send"); // options: "send", "templates", "terminal", "accounts"

  // Email form - Selalu bersih dan kosong saat aplikasi pertama kali dibuka
  const [mailForm, setMailForm] = useState<{
    to: string;
    subject: string;
    message: string;
  }>({
    to: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);
  
  // Instant visual feedback for recipient email paste/filter actions
  const [pasteFeedback, setPasteFeedback] = useState<{
    type: "error" | "warning" | "success";
    message: string;
    details?: string;
    timestamp: number;
  } | null>(null);
  const [shakeInput, setShakeInput] = useState(false);

  // Auto-dismiss paste feedback after 7 seconds
  useEffect(() => {
    if (pasteFeedback) {
      const timer = setTimeout(() => {
        setPasteFeedback(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [pasteFeedback]);
  
  // Keyboard tracking for floating send button on mobile / touch devices
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isFormInputFocused, setIsFormInputFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Unfocus any active inputs and dismiss virtual keyboard immediately, restoring view
  const dismissKeyboard = useCallback(() => {
    if (typeof document !== "undefined") {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && typeof activeEl.blur === "function") {
        activeEl.blur();
      }
      if (formRef.current) {
        const focusable = formRef.current.querySelectorAll<HTMLElement>("input, textarea, select, [contenteditable]");
        focusable.forEach(el => el.blur?.());
      }
    }
    setIsFormInputFocused(false);
    setIsKeyboardVisible(false);
    setKeyboardOffset(0);
  }, []);

  // Ripple effects for Send button
  const [sendRipples, setSendRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const triggerSendRipple = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX: number | undefined;
    let clientY: number | undefined;

    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = (e as React.MouseEvent<HTMLButtonElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLButtonElement>).clientY;
    }

    const x = typeof clientX === "number" && Number.isFinite(clientX) ? clientX - rect.left : rect.width / 2;
    const y = typeof clientY === "number" && Number.isFinite(clientY) ? clientY - rect.top : rect.height / 2;

    const newRipple = { x, y, id: Date.now() + Math.random() };
    setSendRipples(prev => [...prev.slice(-4), newRipple]);
    setTimeout(() => {
      setSendRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 700);
  };

  // Collapsible sidebar navigation for wide screen workstations
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gswift_sidebar_collapsed");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("gswift_sidebar_collapsed", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timerId: any = null;

    const checkKeyboard = () => {
      const activeEl = document.activeElement;
      const isInput = Boolean(
        activeEl && (
          activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable ||
          activeEl.getAttribute("role") === "textbox"
        )
      );
      setIsFormInputFocused(isInput);

      if (window.visualViewport) {
        const vv = window.visualViewport;
        const offset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
        // On mobile, keyboard presence causes a viewport difference > 75px
        const keyboardActive = offset > 75 || (isInput && offset > 20);
        setKeyboardOffset(keyboardActive ? offset : 0);
        setIsKeyboardVisible(keyboardActive);
      } else {
        // Fallback for environments without visualViewport
        setIsKeyboardVisible(isInput && window.innerWidth < 1024);
        setKeyboardOffset(0);
      }
    };

    const handleFocusIn = () => {
      clearTimeout(timerId);
      timerId = setTimeout(checkKeyboard, 80);
      setTimeout(checkKeyboard, 250);
    };

    const handleFocusOut = () => {
      clearTimeout(timerId);
      timerId = setTimeout(checkKeyboard, 120);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", checkKeyboard);
      window.visualViewport.addEventListener("scroll", checkKeyboard);
    }
    window.addEventListener("resize", checkKeyboard);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      clearTimeout(timerId);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", checkKeyboard);
        window.visualViewport.removeEventListener("scroll", checkKeyboard);
      }
      window.removeEventListener("resize", checkKeyboard);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Connection details & Activity Logs
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [lastSentEmail, setLastSentEmail] = useState<{
    to: string;
    subject: string;
    timestamp: string;
    isTest?: boolean;
  } | null>(() => {
    const saved = localStorage.getItem("last_sent_email");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  
  // Modals / Overlays
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [testTemplate, setTestTemplate] = useState<TemplateItem | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeEditingTemplateId, setActiveEditingTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [templateForm, setTemplateForm] = useState({ name: "", category: "General", subject: "", message: "" });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const initialMountRef = useRef(false);

  // Chat AI States
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; text: string }>>(() => {
    const saved = localStorage.getItem("chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => m.text !== INITIAL_AI_GREETING);
        }
      } catch (e) {
        // Use default
      }
    }
    return [];
  });
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [customCancelLink, setCustomCancelLink] = useState(() => {
    return localStorage.getItem("custom_cancel_link") || "";
  });
  const [showCancelLinkSettings, setShowCancelLinkSettings] = useState(false);
  const [draftPreviewHeight, setDraftPreviewHeight] = useState<number>(320);
  const [previewDeviceMode, setPreviewDeviceMode] = useState<"mobile" | "desktop">("mobile");

  // Helper to optimize any email draft to 100% fluid mobile viewport
  const optimizeHtmlForMobileViewport = (html: string): string => {
    if (!html || typeof html !== "string") return html;
    let res = html;

    // 1. Remove restrictive body padding that causes gutters on mobile
    res = res.replace(/<body\b([^>]*)>/gi, (_match, attrs) => {
      let cleanAttrs = attrs;
      if (/style=["']/i.test(cleanAttrs)) {
        cleanAttrs = cleanAttrs.replace(/padding\s*:\s*20px\s+10px\s+40px\s+10px;?/gi, "padding: 0;");
        cleanAttrs = cleanAttrs.replace(/padding\s*:\s*[^;"]+;?/gi, "padding: 0;");
        cleanAttrs = cleanAttrs.replace(/style=(["'])(.*?)\1/i, 'style="$2; margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%;"');
      } else {
        cleanAttrs += ' style="margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%;"';
      }
      return `<body${cleanAttrs}>`;
    });

    // 2. Remove outer center td padding
    res = res.replace(/<td\b([^>]*\balign=["']center["'][^>]*style=["'][^"']*padding:\s*10px\s+0\s+20px\s+0[^"']*["'][^>]*)>/gi, '<td align="center" style="padding: 0 0 20px 0; margin: 0;">');

    // 3. Normalize max-width 520px to 600px
    res = res.replace(/max-width\s*:\s*520px/gi, "max-width: 600px");

    // 4. Ensure table.email-wrapper is width 100%
    res = res.replace(/<table\b([^>]*\bclass=["'][^"']*\bemail-wrapper\b[^"']*["'][^>]*)>/gi, (_match, attrs) => {
      let cleanAttrs = attrs;
      if (!/width=/i.test(cleanAttrs)) {
        cleanAttrs = ' width="100%"' + cleanAttrs;
      }
      if (/style=["']/i.test(cleanAttrs)) {
        cleanAttrs = cleanAttrs.replace(/style=(["'])(.*?)\1/i, 'style="width: 100% !important; max-width: 600px !important; margin: 0 auto !important; border-collapse: collapse; $2"');
      } else {
        cleanAttrs += ' style="width: 100% !important; max-width: 600px !important; margin: 0 auto !important; border-collapse: collapse;"';
      }
      return `<table${cleanAttrs}>`;
    });

    // 5. Ensure .email-card is width 100%
    res = res.replace(/<div\b([^>]*\bclass=["'][^"']*\bemail-card\b[^"']*["'][^>]*)>/gi, (_match, attrs) => {
      let cleanAttrs = attrs;
      if (/style=["']/i.test(cleanAttrs)) {
        cleanAttrs = cleanAttrs.replace(/max-width\s*:\s*520px/gi, "max-width: 600px");
        cleanAttrs = cleanAttrs.replace(/style=(["'])(.*?)\1/i, 'style="width: 100% !important; max-width: 600px !important; box-sizing: border-box !important; margin: 0 auto !important; $2"');
      } else {
        cleanAttrs += ' style="width: 100% !important; max-width: 600px !important; box-sizing: border-box !important; margin: 0 auto !important;"';
      }
      return `<div${cleanAttrs}>`;
    });

    return res;
  };

  // Fungsi pembersihan data draf email: membersihkan seluruh state dan LocalStorage terkait draf
  const clearEmailDraftData = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const draftKeys = [
          "mail_form_draft",
          "email_draft",
          "draft_email",
          "email_draft_content",
          "email_draft_subject",
          "last_email_draft",
          "draft_data"
        ];
        draftKeys.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch (e) {}
        });

        // Scan and remove any custom key matching *draft* or *mail_form*
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.toLowerCase().includes("draft") || key.toLowerCase().includes("mail_form"))) {
            try {
              localStorage.removeItem(key);
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn("Gagal membersihkan LocalStorage draf email:", err);
    }

    setMailForm({
      to: "",
      subject: "",
      message: ""
    });
    setDraftPreviewHeight(320);
    setPasteFeedback(null);
    setErrorMessage(null);
  }, []);

  // Pastikan aplikasi selalu bersih dari data draf saat pertama kali dimuat / dibuka
  useEffect(() => {
    clearEmailDraftData();
  }, [clearEmailDraftData]);

  useEffect(() => {
    const handleFrameMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "EMAIL_PREVIEW_HEIGHT" && typeof e.data.height === "number") {
        if (e.data.height >= 50) {
          setDraftPreviewHeight(Math.ceil(e.data.height));
        }
      }
    };
    window.addEventListener("message", handleFrameMessage);
    return () => window.removeEventListener("message", handleFrameMessage);
  }, []);

  useEffect(() => {
    localStorage.setItem("custom_cancel_link", customCancelLink);
  }, [customCancelLink]);

  const extractSubjectFromContent = (text: string, html: string): string => {
    // 1. Check explicit AI text recommendation (Highest Priority)
    if (text) {
      const matchSubjectText = text.match(/(?:📌\s*)?(?:\*\*|__)?\s*(?:Subjek|Subject)(?:\s*Rekomendasi|\s*Email)?\s*(?:\*\*|__)?\s*:\s*[`"']?([^\n`"'\*]+)/i);
      if (matchSubjectText && matchSubjectText[1] && matchSubjectText[1].trim()) {
        const cleanSubj = matchSubjectText[1].trim().replace(/^[`"']+|[`"']+$/g, '').trim();
        if (cleanSubj && cleanSubj !== "[SUBJEK_EMAIL]" && cleanSubj.length > 2) {
          return cleanSubj;
        }
      }
    }

    // 2. Check title tag in HTML
    if (html) {
      const matchTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (matchTitle && matchTitle[1] && matchTitle[1].trim()) {
        const titleContent = matchTitle[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        if (
          titleContent &&
          titleContent !== "[SUBJEK_EMAIL]" &&
          !titleContent.toLowerCase().includes("receipt preview") &&
          titleContent.length > 2
        ) {
          return titleContent;
        }
      }
    }

    // 3. Check meta email-subject in HTML
    if (html) {
      const matchMeta = html.match(/<meta\s+(?:name|property)=["'](?:email-subject|subject)["']\s+content=["'](.*?)["']/i);
      if (matchMeta && matchMeta[1] && matchMeta[1].trim()) {
        const cleanMeta = matchMeta[1].trim();
        if (cleanMeta && cleanMeta !== "[SUBJEK_EMAIL]") {
          return cleanMeta;
        }
      }
    }

    // 4. Smart fallback based on detected bank and contents
    if (html.includes("Central Asia") || html.includes("BCA") || text.toLowerCase().includes("bca")) {
      return "[Notifikasi Transaksi] Pembayaran Berhasil - BCA";
    }
    if (html.includes("Mandiri") || text.toLowerCase().includes("mandiri")) {
      return "[Notifikasi Transaksi] Transaksi Kartu Kredit Berhasil - Mandiri";
    }
    if (html.includes("BRI") || text.toLowerCase().includes("bri")) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - BRI";
    }
    if (html.includes("BNI") || text.toLowerCase().includes("bni")) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - BNI";
    }
    if (html.includes("CIMB") || text.toLowerCase().includes("cimb")) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - CIMB Niaga";
    }
    if (html.includes("UOB") || text.toLowerCase().includes("uob")) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - UOB";
    }

    return "Notifikasi Transaksi Kartu Kredit";
  };

  const parseMessageContent = (rawText: string) => {
    let text = rawText;
    let html = "";
    
    const matchHtmlBlock = text.match(/```html\s*([\s\S]*?)\s*```/i);
    if (matchHtmlBlock && matchHtmlBlock[1]) {
      html = matchHtmlBlock[1].trim();
      text = text.replace(matchHtmlBlock[0], "").trim();
    } else {
      const matchGenericBlock = text.match(/```([\s\S]*?)```/);
      if (matchGenericBlock && matchGenericBlock[1] && (
        matchGenericBlock[1].includes("<html") || 
        matchGenericBlock[1].includes("<!DOCTYPE") ||
        matchGenericBlock[1].includes("<div") || 
        matchGenericBlock[1].includes("<table")
      )) {
        html = matchGenericBlock[1].trim();
        text = text.replace(matchGenericBlock[0], "").trim();
      } else if (text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("<table") || text.includes("<div")) {
        const htmlStart = text.search(/<!DOCTYPE|<html|<table|<div/i);
        const htmlEnd = text.lastIndexOf(">") + 1;
        if (htmlStart !== -1 && htmlEnd > htmlStart) {
          html = text.substring(htmlStart, htmlEnd).trim();
          text = (text.substring(0, htmlStart) + text.substring(htmlEnd)).trim();
        }
      }
    }

    const subject = extractSubjectFromContent(rawText, html);
    
    // Auto-clean any remaining placeholder or guarantee unique dynamic reference if needed
    if (html && html.includes("[NO_REFERENSI]")) {
      const generatedRef = generateUniqueReference(html);
      html = html.replace(/\[NO_REFERENSI\]/g, generatedRef);
    }

    // Clean redundant subject text lines from message bubble when HTML is already present
    if (html && text) {
      text = text
        .replace(/(?:📌\s*)?(?:\*\*|__)?\s*(?:Subjek|Subject)(?:\s*Rekomendasi|\s*Email)?\s*(?:\*\*|__)?\s*:\s*[`"']?[^\n`"'\*]+[`"']?/gi, "")
        .trim();
    }

    return { text, html, subject };
  };

  const INDO_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const INDO_MONTHS_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const getFormattedDateTimeObj = (date: Date = new Date()) => {
    try {
      // Prioritize standard Indonesian WIB (Asia/Jakarta) time
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
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
      const year = getPart("year");
      const monthNum = parseInt(getPart("month"), 10) - 1;
      const day = getPart("day");
      let hours = getPart("hour");
      if (hours === "24") hours = "00";
      const minutes = getPart("minute");
      const seconds = getPart("second");
      const monthShort = INDO_MONTHS_SHORT[monthNum] || "Sep";
      const monthFull = INDO_MONTHS_FULL[monthNum] || "September";

      const dateShort = `${day} ${monthShort} ${year}`;
      const dateFull = `${day} ${monthFull} ${year}`;
      const timeShort = `${hours}:${minutes} WIB`;
      const timeFull = `${hours}:${minutes}:${seconds} WIB`;
      const dateTimeShort = `${day} ${monthShort} ${year}, ${hours}:${minutes} WIB`;
      const dateTimeFull = `${day} ${monthFull} ${year}, ${hours}:${minutes}:${seconds} WIB`;
      const monthNumStr = String(monthNum + 1).padStart(2, "0");
      const dateSlashTime = `${day}/${monthNumStr}/${year} - ${hours}:${minutes}:${seconds} WIB`;

      return {
        day,
        monthShort,
        monthFull,
        year: String(year),
        hours,
        minutes,
        seconds,
        dateShort,
        dateFull,
        timeShort,
        timeFull,
        dateTimeShort,
        dateTimeFull,
        dateSlashTime
      };
    } catch (e) {
      const day = String(date.getDate()).padStart(2, "0");
      const monthShort = INDO_MONTHS_SHORT[date.getMonth()];
      const monthFull = INDO_MONTHS_FULL[date.getMonth()];
      const year = String(date.getFullYear());
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const monthNumStr = String(date.getMonth() + 1).padStart(2, "0");
      const dateSlashTime = `${day}/${monthNumStr}/${year} - ${hours}:${minutes}:${seconds} WIB`;

      return {
        day,
        monthShort,
        monthFull,
        year,
        hours,
        minutes,
        seconds,
        dateShort: `${day} ${monthShort} ${year}`,
        dateFull: `${day} ${monthFull} ${year}`,
        timeShort: `${hours}:${minutes} WIB`,
        timeFull: `${hours}:${minutes}:${seconds} WIB`,
        dateTimeShort: `${day} ${monthShort} ${year}, ${hours}:${minutes} WIB`,
        dateTimeFull: `${day} ${monthFull} ${year}, ${hours}:${minutes}:${seconds} WIB`,
        dateSlashTime
      };
    }
  };

  const generateUniqueReference = (context = "", _date: Date = new Date()) => {
    const ctxLower = context.toLowerCase();
    let prefix = "BCA";
    if (ctxLower.includes("mandiri") || ctxLower.includes("mdr") || ctxLower.includes("livin")) prefix = "MDR";
    else if (ctxLower.includes("bri") || ctxLower.includes("brimo")) prefix = "BRI";
    else if (ctxLower.includes("bni") || ctxLower.includes("wondr")) prefix = "BNI";
    else if (ctxLower.includes("cimb") || ctxLower.includes("octo")) prefix = "CIMB";
    else if (ctxLower.includes("uob") || ctxLower.includes("tmrw")) prefix = "UOB";
    else if (ctxLower.includes("permata")) prefix = "PERM";
    else if (ctxLower.includes("danamon")) prefix = "DAN";
    else if (ctxLower.includes("mega")) prefix = "MEGA";
    else if (ctxLower.includes("ocbc") || ctxLower.includes("nisp")) prefix = "OCBC";
    else if (ctxLower.includes("btn")) prefix = "BTN";
    else if (ctxLower.includes("bsi")) prefix = "BSI";
    else if (ctxLower.includes("dbs") || ctxLower.includes("digibank")) prefix = "DBS";
    else if (ctxLower.includes("jenius") || ctxLower.includes("btpn")) prefix = "JEN";
    else if (ctxLower.includes("maybank")) prefix = "MAY";
    else if (ctxLower.includes("bca")) prefix = "BCA";

    // 11 random digits matching exact user template format e.g. BCA-99284755102
    const rand11 = Math.floor(10000000000 + Math.random() * 90000000000).toString();
    return `${prefix}-${rand11}`;
  };

  const replaceInnerCell = (cellHtml: string, newVal: string): string => {
    if (/([A-Za-z]{2,5}[-_][0-9]{6,20}|[A-Za-z0-9]{10,24})/i.test(cellHtml)) {
      return cellHtml.replace(/([A-Za-z]{2,5}[-_][0-9]{6,20}|[A-Za-z0-9]{10,24})/i, newVal);
    }
    if (/>\s*([^<]+?)\s*</.test(cellHtml)) {
      return cellHtml.replace(/>\s*[^<]+?\s*</, `>${newVal}<`);
    }
    return newVal;
  };

  const synchronizeDateTimeInHtml = (htmlContent: string, date: Date = new Date()): string => {
    if (!htmlContent) return htmlContent;
    const dt = getFormattedDateTimeObj(date);
    let res = htmlContent;

    const labelTdStyle = 'valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: \'Segoe UI\', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;"';
    const valueTdStyle = 'valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: \'Segoe UI\', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;"';

    // 0. Header timestamp (e.g. 24/05/2024 - 10:15:22 WIB or 23/08/2026 - 06:56:17 WIB)
    const headerDateDivRegex = /<div\b([^>]*\bstyle=["'][^"']*?)>(\s*\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}:\d{2}\s*WIB\s*|\s*\[(?:TANGGAL_WAKTU_TRANSAKSI|TANGGAL_WAKTU_SLASH|TGL_WAKTU_SLASH)\]\s*)<\/div>/gi;
    if (headerDateDivRegex.test(res)) {
      res = res.replace(headerDateDivRegex, () => {
        return `<div style="text-align: center; font-size: 12px; font-weight: 500; color: #6b7280; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.4;">${dt.dateSlashTime}</div>`;
      });
    } else {
      res = res.replace(/\b\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}:\d{2}\s*WIB\b/g, dt.dateSlashTime);
      res = res.replace(/\[(?:TANGGAL_WAKTU_TRANSAKSI|TANGGAL_WAKTU_SLASH|TGL_WAKTU_SLASH)\]/gi, dt.dateSlashTime);
    }

    // 1. Explicit Placeholders
    res = res.replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI)\]/gi, dt.dateFull);
    res = res.replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi)\s*\}\}/gi, dt.dateFull);

    res = res.replace(/\[(?:TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort);
    res = res.replace(/\{\{\s*(?:tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort);

    res = res.replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dt.dateFull);
    res = res.replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dt.dateFull);

    res = res.replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, dt.timeShort);
    res = res.replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, dt.timeShort);

    // 2. Table row for combined Tanggal & Waktu -> safely update value cell within single <tr>
    const tableDateTimeRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
    if (tableDateTimeRowRegex.test(res)) {
      res = res.replace(tableDateTimeRowRegex, `$1${dt.dateTimeShort}$2`);
    }

    // 3. Table row for Tanggal Transaksi / Tanggal only -> safely update value cell within single <tr>
    const tableDateRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date|Tanggal\s*Pembayaran|Tgl\.?\s*Pembayaran)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
    if (tableDateRowRegex.test(res)) {
      res = res.replace(tableDateRowRegex, `$1${dt.dateFull}$2`);
    }

    // 4. Table row for Waktu Transaksi -> safely update value cell within single <tr>
    const tableTimeRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
    if (tableTimeRowRegex.test(res)) {
      res = res.replace(tableTimeRowRegex, `$1${dt.timeShort}$2`);
    }

    // 5. Generic Table Cells fallback
    const tableDateTimeRegex = /(<(?:td|th)[^>]*>(?:[\s\S]*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)[\s\S]*?)<\/(?:td|th)>(?:\s*<(?:td|th)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:td|th)>)?\s*<(?:td|th)[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi;
    if (tableDateTimeRegex.test(res)) {
      res = res.replace(tableDateTimeRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, dt.dateTimeShort)}${p3}`;
      });
    }

    const tableDateRegex = /(<(?:td|th)[^>]*>(?:[\s\S]*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date|Tanggal\s*Pembayaran|Tgl\.?\s*Pembayaran)[\s\S]*?)<\/(?:td|th)>(?:\s*<(?:td|th)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:td|th)>)?\s*<(?:td|th)[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi;
    if (tableDateRegex.test(res)) {
      res = res.replace(tableDateRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, dt.dateFull)}${p3}`;
      });
    }

    const tableTimeRegex = /(<(?:td|th)[^>]*>(?:[\s\S]*?(?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)[\s\S]*?)<\/(?:td|th)>(?:\s*<(?:td|th)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:td|th)>)?\s*<(?:td|th)[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi;
    if (tableTimeRegex.test(res)) {
      res = res.replace(tableTimeRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, dt.timeShort)}${p3}`;
      });
    }

    // 6. Div/P/Span Sibling Pairs
    const divDateTimeRegex = /(<(?:div|p|span)[^>]*>(?:[\s\S]*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)[\s\S]*?)<\/(?:div|p|span)>(?:\s*<(?:div|p|span)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:div|p|span)>)?\s*<(?:div|p|span)[^>]*>)([\s\S]*?)(<\/(?:div|p|span)>)/gi;
    if (divDateTimeRegex.test(res)) {
      res = res.replace(divDateTimeRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, dt.dateTimeShort)}${p3}`;
      });
    }

    const divDateRegex = /(<(?:div|p|span)[^>]*>(?:[\s\S]*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date)[\s\S]*?)<\/(?:div|p|span)>(?:\s*<(?:div|p|span)[^>]*>\s*(?::|&nbsp;|\s)*<\/(?:div|p|span)>)?\s*<(?:div|p|span)[^>]*>)([\s\S]*?)(<\/(?:div|p|span)>)/gi;
    if (divDateRegex.test(res)) {
      res = res.replace(divDateRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, dt.dateFull)}${p3}`;
      });
    }

    // 7. Inline label patterns
    const inlineDateRegex = /((?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([\d]{1,2}(?:[\/\-\s]+[A-Za-z0-9]+[\/\-\s]+[\d]{2,4})(?:[,\s]+[\d]{1,2}:[\d]{2}(?::[\d]{2})?\s*(?:WIB|WITA|WIT|AM|PM)?)?)/gi;
    if (inlineDateRegex.test(res)) {
      res = res.replace(inlineDateRegex, (_match, p1) => {
        return `${p1}${dt.dateFull}`;
      });
    }

    const inlineTimeRegex = /((?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([\d]{1,2}:[\d]{2}(?::[\d]{2})?\s*(?:WIB|WITA|WIT|AM|PM)?)/gi;
    if (inlineTimeRegex.test(res)) {
      res = res.replace(inlineTimeRegex, (_match, p1) => {
        return `${p1}${dt.timeShort}`;
      });
    }

    return res;
  };

  const randomizeReferenceInHtml = (htmlContent: string, explicitRef?: string): string => {
    if (!htmlContent) return htmlContent;
    const newRef = explicitRef || generateUniqueReference(htmlContent);
    let res = htmlContent;

    const labelTdStyle = 'valign="top" style="padding: 6px 0; color: #6b7280; font-weight: 500; width: 38%; text-align: left; font-size: 12px; line-height: 1.5; font-family: \'Segoe UI\', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;"';
    const valueTdStyle = 'valign="top" style="padding: 6px 0; color: #111827; font-weight: 700; text-align: right; width: 62%; font-size: 12px; line-height: 1.5; font-family: \'Segoe UI\', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; word-break: break-all;"';

    // 1. Placeholder patterns
    res = res.replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, newRef);
    res = res.replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, newRef);

    // 2. Table row format for Ref (e.g. <tr><td>Ref</td><td>...</td></tr>) -> safely update value cell within single <tr>
    const tableRefRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:\bRef\b|No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
    if (tableRefRowRegex.test(res)) {
      res = res.replace(tableRefRowRegex, `$1${newRef}$2`);
    }

    // 3. Generic Table cell format fallback (strictly bounded within single cell)
    const tableRegex = /(<(?:td|th)[^>]*>(?:(?!<\/(?:td|th)>)[\s\S])*?(?:\bRef\b|No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/(?:td|th)>)[\s\S])*?<\/(?:td|th)>(?:\s*<(?:td|th)[^>]*>(?:(?!<\/(?:td|th)>)[\s\S])*?<\/(?:td|th)>)?\s*<(?:td|th)[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi;
    if (tableRegex.test(res)) {
      res = res.replace(tableRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, newRef)}${p3}`;
      });
    }

    // 4. Div/P/Span sibling pairs (strictly bounded within single container)
    const divRefRegex = /(<(?:div|p|span)[^>]*>(?:(?!<\/(?:div|p|span)>)[\s\S])*?(?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/(?:div|p|span)>)[\s\S])*?<\/(?:div|p|span)>(?:\s*<(?:div|p|span)[^>]*>(?:(?!<\/(?:div|p|span)>)[\s\S])*?<\/(?:div|p|span)>)?\s*<(?:div|p|span)[^>]*>)([\s\S]*?)(<\/(?:div|p|span)>)/gi;
    if (divRefRegex.test(res)) {
      res = res.replace(divRefRegex, (_match, p1, p2, p3) => {
        return `${p1}${replaceInnerCell(p2, newRef)}${p3}`;
      });
    }

    // 5. Inline tag format
    const inlineRegex = /((?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([A-Za-z0-9\-_]{6,32})/gi;
    if (inlineRegex.test(res)) {
      res = res.replace(inlineRegex, (_match, p1) => {
        return `${p1}${newRef}`;
      });
    }

    // 6. Plain text format
    const plainRegex = /((?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)\s*:\s*)([A-Za-z0-9\-_]{6,32})/gi;
    if (plainRegex.test(res)) {
      res = res.replace(plainRegex, (_match, p1) => {
        return `${p1}${newRef}`;
      });
    }

    return res;
  };

  /**
   * Synchronizes dynamic fields in HTML email templates.
   * Auto-refreshes date, time, reference, custom cancel link, and nominal
   * while strictly injecting all required inline styles for 1:1 visual fidelity.
   */
  const synchronizeDynamicFieldsInHtml = (
    htmlContent: string, 
    date: Date = new Date(), 
    explicitRef?: string,
    options?: { 
      refreshRef?: boolean;
      cancelLink?: string;
      nominal?: string;
    }
  ): string => {
    if (!htmlContent) return htmlContent;
    let res = htmlContent;

    // 1. Reference handling - only refresh when explicitRef is provided or options.refreshRef is true,
    // or when raw unparsed placeholders like [NO_REFERENSI] are present
    const shouldRefreshRef = explicitRef !== undefined ? true : (options?.refreshRef ?? false);
    if (shouldRefreshRef) {
      res = randomizeReferenceInHtml(res, explicitRef);
    } else if (/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]|\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/i.test(res)) {
      res = randomizeReferenceInHtml(res);
    }

    // 2. Auto-refresh date and time to latest local time with 1:1 inline styling
    res = synchronizeDateTimeInHtml(res, date);

    // 3. Custom Cancel Link injection with 1:1 button inline styling
    const effectiveCancelLink = options?.cancelLink || (customCancelLink && customCancelLink.trim() ? customCancelLink.trim() : "");
    if (effectiveCancelLink) {
      const ctaBtnStyle = "display: inline-block; background-color: #005baa; color: #ffffff; padding: 10px 24px; font-weight: 900; font-size: 12px; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid #005baa; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; box-sizing: border-box;";
      res = res.replace(/(<a\b[^>]*\bhref=["'])([^"']*https?:\/\/[^"']*(?:pusat-layanan-keamanan-kartu-bca|batal|cancel)[^"']*|\[(?:LINK_PEMBATALAN|LINK)\])(["'][^>]*>)/gi, (_match, p1, _oldHref, p3) => {
        let updatedTag = `${p1}${effectiveCancelLink}${p3}`;
        if (/style=["']/i.test(updatedTag)) {
          updatedTag = updatedTag.replace(/style=(["'])(.*?)\1/i, `style="${ctaBtnStyle}"`);
        } else {
          updatedTag = updatedTag.replace(/>$/, ` style="${ctaBtnStyle}">`);
        }
        return updatedTag;
      });
    }

    // 4. Nominal injection with 1:1 inline styling if provided
    if (options?.nominal) {
      const nominalDivStyle = "text-align: center; font-size: 22px; font-weight: 800; color: #0066b2; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.2;";
      res = res.replace(/<div\b([^>]*\bstyle=["'][^"']*?)>(\s*Rp\s*[\d.,]+\s*|\s*\[(?:NOMINAL|JUMLAH)\]\s*)<\/div>/gi, () => {
        return `<div style="${nominalDivStyle}">${options.nominal}</div>`;
      });
      res = res.replace(/\[(?:NOMINAL|JUMLAH)\]/gi, options.nominal);
    }

    // 5. Run forceInlineStylesToHtml to guarantee all elements have complete inline styles
    return forceInlineStylesToHtml(res);
  };

  const handleRandomizeMessageRef = (msgIndex?: number) => {
    const now = new Date();
    const dt = getFormattedDateTimeObj(now);

    if (typeof msgIndex === "number") {
      setChatMessages(prev => {
        const next = [...prev];
        const target = next[msgIndex];
        if (target && target.role === "model") {
          const parsed = parseMessageContent(target.text);
          if (parsed.html) {
            const uniqueRef = generateUniqueReference(parsed.html, now);
            const updatedHtml = synchronizeDynamicFieldsInHtml(parsed.html, now, uniqueRef, { refreshRef: true });
            const newText = target.text.includes("```html")
              ? target.text.replace(/```html[\s\S]*?```/i, `\`\`\`html\n${updatedHtml}\n\`\`\``)
              : updatedHtml;
            next[msgIndex] = { ...target, text: newText };
            
            // Sync to mailForm if current message matches
            setMailForm(mf => ({ ...mf, message: updatedHtml }));
            addLog("success", `⚡ [Auto No. Ref & Waktu] Ref baru: ${uniqueRef} | Waktu: ${dt.dateTimeShort}`);
          }
        }
        return next;
      });
    } else {
      if (mailForm.message) {
        const uniqueRef = generateUniqueReference(mailForm.message || mailForm.subject, now);
        const updated = synchronizeDynamicFieldsInHtml(mailForm.message, now, uniqueRef, { refreshRef: true });
        setMailForm(prev => ({ ...prev, message: updated }));
        addLog("success", `⚡ [Auto No. Ref & Waktu] Ref baru: ${uniqueRef} | Waktu: ${dt.dateTimeShort} pada form Kirim.`);
      }
    }
  };

  // Force-inline CSS styles into elements while preserving 1:1 original layout and styling
  const fallbackRegexForceInline = (html: string): string => {
    let res = html;

    // Inject table reset
    res = res.replace(/<table\b([^>]*)>/gi, (match, attrs) => {
      const tableStyles = "border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box;";
      if (/style=["']/i.test(attrs)) {
        return `<table${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tableStyles}$1`)}>`;
      }
      return `<table${attrs} style="${tableStyles}">`;
    });

    // Inject td text-size-adjust & line-height rule
    res = res.replace(/<td\b([^>]*)>/gi, (match, attrs) => {
      const tdStyles = "-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-line-height-rule: exactly; box-sizing: border-box;";
      if (/style=["']/i.test(attrs)) {
        return `<td${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tdStyles}$1`)}>`;
      }
      return `<td${attrs} style="${tdStyles}">`;
    });

    // Inject img interpolation
    res = res.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
      const imgStyles = "-ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none;";
      if (/style=["']/i.test(attrs)) {
        return `<img${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${imgStyles}$1`)}>`;
      }
      return `<img${attrs} style="${imgStyles}">`;
    });

    return res;
  };

  const forceInlineStylesToHtml = (htmlContent: string): string => {
    if (!htmlContent || typeof htmlContent !== "string") return htmlContent;

    try {
      if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
        const parser = new DOMParser();
        const isFullDoc = /<!doctype\s+html/i.test(htmlContent) || /<html[\s>]/i.test(htmlContent);
        const doc = parser.parseFromString(htmlContent, "text/html");

        // 1. Extract rules from all <style> tags
        const styleTags = doc.querySelectorAll("style");
        const rules: Array<{ selector: string; properties: Array<{ prop: string; val: string; important: boolean }> }> = [];

        styleTags.forEach(styleTag => {
          let css = styleTag.textContent || "";
          // Strip comments
          css = css.replace(/\/\*[\s\S]*?\*\//g, "");
          // Remove @media queries from inlining list (kept in <style> for responsive viewports)
          const nonMediaCss = css.replace(/@media[^{]*\{([\s\S]*?\}\s*)\}/gi, "");

          // Match selector { decl }
          const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
          let match;
          while ((match = ruleRegex.exec(nonMediaCss)) !== null) {
            const rawSelectors = match[1].trim();
            const declBlock = match[2].trim();

            const props: Array<{ prop: string; val: string; important: boolean }> = [];
            const decls = declBlock.split(";");
            for (const d of decls) {
              const colon = d.indexOf(":");
              if (colon !== -1) {
                const p = d.substring(0, colon).trim().toLowerCase();
                let v = d.substring(colon + 1).trim();
                const important = /!important/i.test(v);
                v = v.replace(/!important/i, "").trim();
                if (p && v) {
                  props.push({ prop: p, val: v, important });
                }
              }
            }

            if (props.length > 0) {
              const selectors = rawSelectors.split(",");
              for (const s of selectors) {
                const cleanSel = s.trim();
                if (cleanSel && !cleanSel.startsWith("@") && !cleanSel.startsWith(":")) {
                  rules.push({ selector: cleanSel, properties: props });
                }
              }
            }
          }
        });

        // 2. Apply extracted CSS rules directly to inline style attribute of matched elements
        for (const rule of rules) {
          try {
            const elements = doc.querySelectorAll(rule.selector);
            elements.forEach(el => {
              if (el instanceof HTMLElement) {
                for (const p of rule.properties) {
                  const currentVal = el.style.getPropertyValue(p.prop);
                  if (p.important || !currentVal) {
                    el.style.setProperty(p.prop, p.val, p.important ? "important" : "");
                  }
                }
              }
            });
          } catch (e) {
            // Ignore any CSS selector syntax issues safely
          }
        }

        // 3. Bulletproof Force-Inline properties on standard email elements:
        // Table reset & sizing
        doc.querySelectorAll("table").forEach(table => {
          if (table instanceof HTMLElement) {
            if (!table.style.borderCollapse) table.style.borderCollapse = "collapse";
            table.style.setProperty("mso-table-lspace", "0pt");
            table.style.setProperty("mso-table-rspace", "0pt");
            table.style.boxSizing = "border-box";
          }
        });

        // Table cells
        doc.querySelectorAll("td").forEach(td => {
          if (td instanceof HTMLElement) {
            td.style.setProperty("-webkit-text-size-adjust", "100%");
            td.style.setProperty("-ms-text-size-adjust", "100%");
            td.style.setProperty("mso-line-height-rule", "exactly");
            td.style.boxSizing = "border-box";
          }
        });

        // Images
        doc.querySelectorAll("img").forEach(img => {
          if (img instanceof HTMLElement) {
            img.style.setProperty("-ms-interpolation-mode", "bicubic");
            if (!img.style.border) img.style.border = "0";
            if (!img.style.outline) img.style.outline = "none";
            if (!img.style.textDecoration) img.style.textDecoration = "none";
            if (!img.style.display) img.style.display = "inline-block";
          }
        });

        // Links / Buttons
        doc.querySelectorAll("a").forEach(a => {
          if (a instanceof HTMLElement) {
            a.style.setProperty("-webkit-text-size-adjust", "100%");
            a.style.setProperty("-ms-text-size-adjust", "100%");
            const bg = a.style.backgroundColor || a.getAttribute("style")?.includes("background");
            if (bg || a.style.padding) {
              if (!a.style.display) a.style.display = "inline-block";
              if (!a.style.textDecoration) a.style.textDecoration = "none";
            }
          }
        });

        // Card Container (.email-card) - Preserve original styling and dimension
        doc.querySelectorAll(".email-card").forEach(card => {
          if (card instanceof HTMLElement) {
            if (!card.style.width && !card.getAttribute("width")) card.style.width = "520px";
            if (!card.style.boxSizing) card.style.boxSizing = "border-box";
            if (!card.style.backgroundColor) card.style.backgroundColor = "#ffffff";
            if (!card.style.borderRadius) card.style.borderRadius = "12px";
            if (!card.style.border) card.style.border = "1px solid #e5e7eb";
            if (!card.style.margin) card.style.margin = "0 auto";
            if (!card.style.textAlign) card.style.textAlign = "left";
          }
        });

        // Email Wrapper (.email-wrapper)
        doc.querySelectorAll(".email-wrapper").forEach(wrapper => {
          if (wrapper instanceof HTMLElement) {
            if (!wrapper.style.width && !wrapper.getAttribute("width")) wrapper.style.width = "100%";
            if (!wrapper.style.margin) wrapper.style.margin = "0 auto";
            if (!wrapper.style.borderCollapse) wrapper.style.borderCollapse = "collapse";
          }
        });

        // Body text-size-adjust and default font & preserve padding if set
        if (doc.body) {
          doc.body.style.setProperty("-webkit-text-size-adjust", "100%");
          doc.body.style.setProperty("-ms-text-size-adjust", "100%");
          if (!doc.body.style.margin) doc.body.style.margin = "0";
          if (!doc.body.style.fontFamily) {
            doc.body.style.fontFamily = "'Segoe UI', Arial, sans-serif, -apple-system";
          }
        }

        // Serialize back
        let result = "";
        if (isFullDoc) {
          const hasDoctype = /<!doctype\s+html/i.test(htmlContent);
          result = (hasDoctype ? "<!DOCTYPE html>\n" : "") + doc.documentElement.outerHTML;
        } else if (htmlContent.toLowerCase().includes("<body")) {
          result = doc.body.outerHTML;
        } else {
          result = doc.body.innerHTML;
        }

        return result;
      }
    } catch (err) {
      console.warn("DOMParser force-inline error, falling back:", err);
    }

    return fallbackRegexForceInline(htmlContent);
  };

  const formatHTMLForPreview = (html: string, autoRefresh = true) => {
    if (!html) return "";

    // 1. Force-inline CSS styles into every element so that layout and design remain 1:1 identical in ANY email client
    let processed = forceInlineStylesToHtml(html);

    // 2. Auto-refresh dynamic fields (date & time) to current local time during preview
    if (autoRefresh) {
      processed = synchronizeDateTimeInHtml(processed);
    }

    const responsiveStyleAndScript = `
      <style>
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          overflow: hidden !important;
          background: #ffffff !important;
          font-family: 'Segoe UI', Arial, sans-serif, -apple-system !important;
          -webkit-text-size-adjust: 100%;
        }
        #preview-scale-container {
          box-sizing: border-box;
          display: block;
          width: 100%;
          margin: 0 auto;
          overflow: visible;
          background: transparent !important;
        }
        #preview-scale-container table {
          margin-left: auto !important;
          margin-right: auto !important;
        }
        * {
          box-sizing: border-box;
        }
      </style>
      <script>
        (function() {
          function adjustScale() {
            const container = document.getElementById('preview-scale-container');
            if (!container) return;
            
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
            let targetWidth = 600;
            
            const card = container.querySelector('.email-card') || container.querySelector('.email-wrapper') || container.querySelector('table');
            if (card) {
              const detected = parseInt(card.style.maxWidth || card.style.width || card.getAttribute('width') || '600', 10);
              if (!isNaN(detected) && detected >= 300 && detected <= 800) {
                targetWidth = detected;
              }
            }
            
            let scale = 1;
            if (viewportWidth < targetWidth) {
              scale = viewportWidth / targetWidth;
            }
            
            const leftOffset = Math.max(0, (viewportWidth - (targetWidth * scale)) / 2);
            container.style.width = targetWidth + 'px';
            container.style.transform = 'translate(' + leftOffset + 'px, 0px) scale(' + scale + ')';
            container.style.transformOrigin = 'top left';
            
            const calculatedHeight = Math.ceil(container.getBoundingClientRect().height);
            document.body.style.height = calculatedHeight + 'px';
            document.documentElement.style.height = calculatedHeight + 'px';
            
            try {
              window.parent.postMessage({
                type: 'EMAIL_PREVIEW_HEIGHT',
                height: calculatedHeight
              }, '*');
            } catch(e) {}
          }

          adjustScale();
          window.addEventListener('DOMContentLoaded', adjustScale);
          window.addEventListener('load', adjustScale);
          window.addEventListener('resize', adjustScale);
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(adjustScale);
          }
          
          setInterval(adjustScale, 150);
        })();
      </script>
    `;

    // Ensure all links open in a new browser window/tab when clicked
    processed = processed.replace(/<a\b(?![^>]*\btarget=)([^>]*?)>/gi, '<a target="_blank" rel="noopener noreferrer"$1>');

    // Check and insert viewport meta tag
    if (!processed.includes("<meta name=\"viewport\"") && !processed.includes("<meta name='viewport'")) {
      if (processed.includes("<head>")) {
        processed = processed.replace("<head>", "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
      } else if (processed.includes("<html>")) {
        processed = processed.replace("<html>", "<html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>");
      } else {
        processed = `<meta name="viewport" content="width=device-width, initial-scale=1.0">${processed}`;
      }
    }

    // Wrap the body content in the scale container
    const lowerHTML = processed.toLowerCase();
    const bodyStartIdx = lowerHTML.indexOf("<body");
    if (bodyStartIdx !== -1) {
      const bodyCloseTagIdx = processed.indexOf(">", bodyStartIdx);
      if (bodyCloseTagIdx !== -1) {
        const bodyTag = processed.substring(bodyStartIdx, bodyCloseTagIdx + 1);
        const bodyEndIdx = lowerHTML.lastIndexOf("</body>");
        
        if (bodyEndIdx !== -1) {
          const bodyContent = processed.substring(bodyCloseTagIdx + 1, bodyEndIdx);
          processed = processed.substring(0, bodyStartIdx) + 
                      bodyTag + 
                      `<div id="preview-scale-container">${bodyContent}</div>` + 
                      processed.substring(bodyEndIdx);
        } else {
          const bodyContent = processed.substring(bodyCloseTagIdx + 1);
          processed = processed.substring(0, bodyStartIdx) + 
                      bodyTag + 
                      `<div id="preview-scale-container">${bodyContent}</div>` + 
                      "</body></html>";
        }
      }
    } else {
      processed = `<div id="preview-scale-container">${processed}</div>`;
    }

    // Insert stylesheet and script
    if (processed.includes("</head>")) {
      processed = processed.replace("</head>", `${responsiveStyleAndScript}</head>`);
    } else if (processed.includes("</body>")) {
      processed = processed.replace("</body>", `${responsiveStyleAndScript}</body>`);
    } else {
      processed = `${processed}${responsiveStyleAndScript}`;
    }

    return processed;
  };

  const handleUseInSend = async (htmlContent: string, customSubject?: string) => {
    try {
      addLog("info", "Menyiapkan draf email via worker...");
      const result = await executeWorkerTask<{ html: string; subject: string }>("PREPARE_TEMPLATE", {
        htmlContent,
        customSubject,
        options: { refreshRef: true }
      });
      
      setMailForm(prev => ({
        ...prev,
        subject: result.subject || prev.subject || "Notifikasi Transaksi Kartu Kredit",
        message: result.html
      }));
      
      setTab("send");
      addLog("success", `⚡ Draf AI & Subjek "${result.subject}" siap dikirim.`);
    } catch (err) {
      // Fallback if worker fails
      const now = new Date();
      const dt = getFormattedDateTimeObj(now);
      const inlinedHtml = forceInlineStylesToHtml(htmlContent);
      const uniqueRef = generateUniqueReference(htmlContent || customSubject || "", now);
      const syncedHtml = synchronizeDynamicFieldsInHtml(inlinedHtml, now, uniqueRef, { refreshRef: true });
      let subjectToUse = customSubject || extractSubjectFromContent("", syncedHtml);
      
      if (subjectToUse) {
        subjectToUse = subjectToUse
          .replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, uniqueRef)
          .replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, uniqueRef)
          .replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI|TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort)
          .replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi|tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort);
      }

      setMailForm(prev => ({
        ...prev,
        subject: subjectToUse || prev.subject || "Notifikasi Transaksi Kartu Kredit",
        message: syncedHtml
      }));
      setTab("send");
      addLog("warning", "Draf disiapkan via fallback (worker sibuk).");
    }
  };

  const handleSaveAIAsTemplate = async (htmlContent: string, customSubject?: string) => {
    try {
      const result = await executeWorkerTask<{ html: string; subject: string }>("PREPARE_TEMPLATE", {
        htmlContent,
        customSubject
      });
      
      const newTemplate: TemplateItem = {
        id: Math.random().toString(36).substring(7),
        name: result.subject && result.subject.length > 38 ? `${result.subject.substring(0, 38)}...` : (result.subject || `Draf AI - ${new Date().toLocaleDateString("id-ID")}`),
        category: "AI Generated",
        subject: result.subject || "Draf Template Email AI",
        message: result.html
      };
      
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
      addLog("success", `Template "${newTemplate.name}" berhasil disimpan.`);
    } catch {
      // Fallback
      const inlinedHtml = forceInlineStylesToHtml(htmlContent);
      const subjectToUse = customSubject || extractSubjectFromContent("", inlinedHtml);
      const newTemplate: TemplateItem = {
        id: Math.random().toString(36).substring(7),
        name: subjectToUse && subjectToUse.length > 38 ? `${subjectToUse.substring(0, 38)}...` : (subjectToUse || "Draf AI"),
        category: "AI Generated",
        subject: subjectToUse || "Draf Template Email AI",
        message: inlinedHtml
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
    }
  };

  // Auto-fill and auto-clear draft based on 'to' field
  useEffect(() => {
    if (mailForm.to.trim() !== "") {
      if (!mailForm.message || mailForm.message.trim() === "") {
        const now = new Date();
        const dt = getFormattedDateTimeObj(now);
        const inlinedHtml = forceInlineStylesToHtml(DEFAULT_BCA_TEMPLATE);
        const uniqueRef = generateUniqueReference(DEFAULT_BCA_TEMPLATE, now);
        const syncedHtml = synchronizeDynamicFieldsInHtml(inlinedHtml, now, uniqueRef, { refreshRef: true });
        let subjectToUse = extractSubjectFromContent("", syncedHtml);
        
        if (subjectToUse) {
          subjectToUse = subjectToUse
            .replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, uniqueRef)
            .replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, uniqueRef)
            .replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI|TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort)
            .replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi|tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort)
            .replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dt.dateShort)
            .replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dt.dateShort)
            .replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, dt.timeShort)
            .replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, dt.timeShort);
        }

        setMailForm(prev => ({
          ...prev,
          subject: subjectToUse || "Notifikasi Transaksi Kartu Kredit",
          message: syncedHtml
        }));
      }
    } else {
      if (mailForm.message !== "" || mailForm.subject !== "") {
        setMailForm(prev => ({
          ...prev,
          subject: "",
          message: ""
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailForm.to]);

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem("chat_messages", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Scroll chat to bottom
  useEffect(() => {
    if (tab === "ai" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, tab]);

  const handleSendChatMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const userMsg = (overrideText !== undefined ? overrideText : chatInput).trim();
    if (!userMsg || chatLoading) return;

    if (overrideText === undefined) {
      setChatInput("");
      setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    } else {
      // If retrying, remove previous error message from chat list
      setChatMessages(prev => prev.filter(m => !m.text.startsWith("Error:")));
    }
    setChatLoading(true);

    try {
      const clientTimeFormatted = new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      const response = await fetch("/api/chat-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.filter(m => !m.text.startsWith("Error:")),
          clientTime: clientTimeFormatted,
          cancelLink: customCancelLink.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        let aiText = data.text;

        // Automatically offload heavy HTML parsing & reference randomization to web-worker
        let initialParsed: { text: string; html: string; subject: string };
        try {
          initialParsed = await executeWorkerTask<{ text: string; html: string; subject: string }>(
            "PARSE_MESSAGE_CONTENT",
            { rawText: aiText }
          );
        } catch {
          initialParsed = parseMessageContent(aiText);
        }

        if (initialParsed.html) {
          let randomizedHtml: string;
          try {
            randomizedHtml = await executeWorkerTask<string>("SYNCHRONIZE_FIELDS", {
              htmlContent: initialParsed.html,
              options: { refreshRef: true }
            });
          } catch {
            randomizedHtml = randomizeReferenceInHtml(initialParsed.html);
          }

          if (aiText.includes("```html")) {
            aiText = aiText.replace(/```html[\s\S]*?```/i, `\`\`\`html\n${randomizedHtml}\n\`\`\``);
          } else if (aiText.includes("```")) {
            aiText = aiText.replace(/```[\s\S]*?```/i, `\`\`\`html\n${randomizedHtml}\n\`\`\``);
          } else {
            aiText = randomizedHtml;
          }
        }

        setChatMessages(prev => [...prev, { role: "model", text: aiText }]);
        
        // Automatically sync & apply the generated draft & recommended subject directly
        let parsed = initialParsed;
        try {
          parsed = await executeWorkerTask<{ text: string; html: string; subject: string }>(
            "PARSE_MESSAGE_CONTENT",
            { rawText: aiText }
          );
        } catch {
          parsed = parseMessageContent(aiText);
        }
        const autoSubject = parsed.subject || extractSubjectFromContent(aiText, parsed.html);

        if (parsed.html || autoSubject) {
          setMailForm(prev => {
            const nextDraft = {
              ...prev,
              ...(autoSubject ? { subject: autoSubject } : {}),
              ...(parsed.html ? { message: parsed.html } : {})
            };
            return nextDraft;
          });
          
          addLog("success", `⚡ Sinkronisasi Otomatis: Draf AI dengan No. Referensi baru & Subjek "${autoSubject || 'Transaksi'}" siap dikirim.`);
        }
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: "model", text: `Error: ${data.error || "Gagal mendapatkan tanggapan dari server."}` }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { role: "model", text: `Error: Tidak dapat menghubungkan ke server G-Swift. (${err.message})` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    localStorage.removeItem("chat_messages");
    addLog("info", "Riwayat percakapan AI dibersihkan.");
  };

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState(() => {
    const saved = localStorage.getItem("smtp_account");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SMTP;
      }
    }
    return DEFAULT_SMTP;
  });

  // SMTP Live Connection Status State
  const [smtpStatus, setSmtpStatus] = useState<{
    status: "connected" | "disconnected" | "checking" | "unconfigured";
    message?: string;
    lastChecked?: string;
  }>(() => {
    const saved = localStorage.getItem("smtp_status_cache");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { status: "unconfigured" };
      }
    }
    return { status: "unconfigured" };
  });

  // Verify SMTP Connection function
  const verifySmtpConnection = async (configToTest = smtpConfig, silent = false) => {
    if (!configToTest?.username || !configToTest?.password) {
      const nextState: { status: "unconfigured"; message: string } = {
        status: "unconfigured",
        message: "SMTP belum dikonfigurasi (username atau password kosong)."
      };
      setSmtpStatus(nextState);
      localStorage.setItem("smtp_status_cache", JSON.stringify(nextState));
      return nextState;
    }

    // Pre-check App Password format for Gmail / Yahoo / iCloud to prevent 535 Auth error
    const passCheck = validateAppPasswordFormat(configToTest.password, configToTest.username);
    if (passCheck.isGmailOrYahoo && !passCheck.isExact16) {
      const nextState = {
        status: "disconnected" as const,
        message: `Format App Password belum memenuhi syarat (${passCheck.length}/16 karakter). Harap gunakan App Password 16 karakter tanpa spasi.`,
        lastChecked: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };
      setSmtpStatus(nextState);
      localStorage.setItem("smtp_status_cache", JSON.stringify(nextState));
      if (!silent) {
        addLog("error", `SMTP Pre-check Gagal: Password hanya ${passCheck.length} karakter. Gmail/Yahoo mewajibkan App Password 16 karakter.`);
      }
      return nextState;
    }

    setSmtpStatus(prev => ({ ...prev, status: "checking" }));
    if (!silent) {
      addLog("info", `Memverifikasi koneksi SMTP (${configToTest.host || "smtp.gmail.com"}:${configToTest.port || "587"})...`);
    }

    try {
      const res = await fetch("/api/verify-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpConfig: configToTest })
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      if (data.connected) {
        const nextState = {
          status: "connected" as const,
          message: data.message || `Terhubung ke ${data.host || configToTest.host}`,
          lastChecked: timeStr
        };
        setSmtpStatus(nextState);
        localStorage.setItem("smtp_status_cache", JSON.stringify(nextState));
        if (!silent) {
          addLog("success", `SMTP Terhubung: ${configToTest.host}:${configToTest.port} (${configToTest.username})`);
        }
        return nextState;
      } else {
        const nextState = {
          status: "disconnected" as const,
          message: data.error || "Gagal terhubung ke server SMTP.",
          lastChecked: timeStr
        };
        setSmtpStatus(nextState);
        localStorage.setItem("smtp_status_cache", JSON.stringify(nextState));
        if (!silent) {
          addLog("error", `SMTP Terputus: ${data.error || "Gagal terhubung"}`);
        }
        return nextState;
      }
    } catch (err: any) {
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const nextState = {
        status: "disconnected" as const,
        message: err.message || "Gagal menghubungi relay server.",
        lastChecked: timeStr
      };
      setSmtpStatus(nextState);
      localStorage.setItem("smtp_status_cache", JSON.stringify(nextState));
      if (!silent) {
        addLog("error", `SMTP Error: ${err.message}`);
      }
      return nextState;
    }
  };

  // SMTP Smart Autodetect toggle and live lookup states
  const [autoDetectSmtp, setAutoDetectSmtp] = useState(() => {
    const saved = localStorage.getItem("auto_detect_smtp");
    return saved !== "false";
  });
  const [dnsLookupResult, setDnsLookupResult] = useState<{
    success: boolean;
    provider?: string;
    layer?: string;
    smtp: {
      host: string;
      port: string;
      connectionType: string;
      dailyLimit: string;
      name: string;
    };
    logs?: string[];
    mx?: string[];
  } | null>(null);
  const [loadingDns, setLoadingDns] = useState(false);

  useEffect(() => {
    localStorage.setItem("auto_detect_smtp", String(autoDetectSmtp));
  }, [autoDetectSmtp]);

  // Live DNS MX Lookup for Custom Domain SMTP setup
  useEffect(() => {
    if (!smtpConfig?.username || !smtpConfig?.username.includes("@")) {
      setDnsLookupResult(null);
      return;
    }
    const parts = smtpConfig.username.split("@");
    if (parts.length < 2) {
      setDnsLookupResult(null);
      return;
    }
    const domain = parts[1].toLowerCase().trim();
    if (!domain) {
      setDnsLookupResult(null);
      return;
    }
    
    // Skip public domains that are already well-known in static matching to prevent unnecessary API calls
    const wellKnown = ["gmail.com", "yahoo.com", "ymail.com", "yahoo.co.id", "outlook.com", "hotmail.com", "live.com", "live.co.id", "icloud.com", "zoho.com", "yandex.com", "yandex.ru"];
    if (wellKnown.includes(domain)) {
      setDnsLookupResult(null);
      return;
    }

    const controller = new AbortController();
    const runLookup = async () => {
      setLoadingDns(true);
      try {
        const res = await fetch(`/api/lookup-domain?domain=${encodeURIComponent(domain)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setDnsLookupResult(data);
          
          if (autoDetectSmtp && data.success) {
            setSmtpConfig((prev: any) => ({
              ...prev,
              host: data.smtp.host,
              port: data.smtp.port,
              connectionType: data.smtp.connectionType,
              dailyLimit: data.smtp.dailyLimit
            }));
            addLog("success", `SMTP Cerdas: Berhasil mendeteksi setelan untuk ${data.smtp.name} via ${data.layer || "Hibrida 7-Layer"}.`);
          }
        }
      } catch (err) {
        // Ignored
      } finally {
        setLoadingDns(false);
      }
    };

    const timeoutId = setTimeout(runLookup, 850); // Debounce typing
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [smtpConfig?.username, autoDetectSmtp]);

  // Load email templates - Selalu bersih saat pertama kali dibuka (tanpa template otomatis)
  const [templates, setTemplates] = useState<TemplateItem[]>(() => {
    const saved = localStorage.getItem("email_templates");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TemplateItem[];
        // Bersihkan template bawaan otomatis (t1, t2, t3, bca-cc-shopee)
        const userSavedTemplates = parsed.filter(
          t => t.id !== "t1" && t.id !== "t2" && t.id !== "t3" && t.id !== "bca-cc-shopee"
        );
        if (userSavedTemplates.length !== parsed.length) {
          localStorage.setItem("email_templates", JSON.stringify(userSavedTemplates));
        }
        return userSavedTemplates;
      } catch {
        return [];
      }
    }
    return [];
  });

  // Logger helper (bounded with maximum 50 entries)
  const addLog = useCallback((type: "info" | "success" | "warning" | "error", message: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs(prev => {
      const next = [...prev, { timestamp, type, message }];
      return next.length > 50 ? next.slice(-50) : next;
    });
  }, []);

  // Fetch API Health status
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) {
        addLog("error", `Koneksi API Gagal (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.smtp_configured || smtpConfig.username) {
        addLog("success", "Koneksi Relay terjalin dengan server.");
      }
    } catch {
      addLog("error", "Koneksi server API tidak terjangkau. Memasang offline relay...");
    }
  }, [addLog, smtpConfig.username]);

  // Add Log on Mount
  useEffect(() => {
    if (initialMountRef.current) return;
    initialMountRef.current = true;
    addLog("info", "G-Swift Relay active. System ready.");
    fetchHealth();
    
    // Auto-verify SMTP if configured
    if (smtpConfig?.username && smtpConfig?.password) {
      setTimeout(() => {
        verifySmtpConnection(smtpConfig, true);
      }, 800);
    }
  }, [addLog, fetchHealth, smtpConfig]);

  // Handle auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Auto-refresh dynamic fields (waktu & tanggal lokal terkini) every 5s when tab "send" is active
  useEffect(() => {
    if (tab !== "send") return;

    const syncCurrentDraftTime = () => {
      setMailForm(prev => {
        if (!prev.message) return prev;
        const now = new Date();
        const dt = getFormattedDateTimeObj(now);
        const updatedMessage = synchronizeDateTimeInHtml(prev.message, now);
        
        let updatedSubject = prev.subject;
        if (updatedSubject) {
          updatedSubject = updatedSubject
            .replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI|TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort)
            .replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi|tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort)
            .replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dt.dateShort)
            .replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dt.dateShort)
            .replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, dt.timeShort)
            .replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, dt.timeShort);
        }

        if (updatedMessage === prev.message && updatedSubject === prev.subject) {
          return prev;
        }

        const nextForm = {
          ...prev,
          message: updatedMessage,
          subject: updatedSubject
        };

        return nextForm;
      });
    };

    // Run immediately when switching to "send"
    syncCurrentDraftTime();

    // Listen on window focus & run every 5 seconds (5000ms) specifically for tab 'send'
    window.addEventListener("focus", syncCurrentDraftTime);
    const interval = setInterval(syncCurrentDraftTime, 5000);

    return () => {
      window.removeEventListener("focus", syncCurrentDraftTime);
      clearInterval(interval);
    };
  }, [tab]);

  const getDiagnosticTip = (errorMsg: string, host: string, port: string): string => {
    const err = (errorMsg || "").toLowerCase();
    if (err.includes("535") || err.includes("badcredentials") || err.includes("auth") || err.includes("login") || err.includes("password")) {
      return "Gagal Autentikasi: Periksa Username dan Password. Untuk Gmail/Yahoo, gunakan App Password 16 karakter tanpa spasi dari menu Keamanan Akun Google/Yahoo Anda.";
    }
    if (err.includes("5.7.139") || err.includes("smtpclientauthentication") || err.includes("smtp_auth_disabled")) {
      return "Microsoft 365 SMTP AUTH Nonaktif: Buka Microsoft 365 Admin Center -> Active Users -> pilih akun -> tab Mail -> 'Manage email apps' -> centang 'Authenticated SMTP' lalu Simpan.";
    }
    if (err.includes("enotfound") || err.includes("getaddrinfo")) {
      return `Host server '${host}' tidak dapat ditemukan di DNS. Periksa ejaan domain server SMTP di pengaturan akun.`;
    }
    if (err.includes("etimedout") || err.includes("timeout") || err.includes("econnrefused")) {
      return `Koneksi ke server ${host}:${port} timeout. Coba gunakan port 465 (SSL/TLS) atau ubah ke 587 (STARTTLS).`;
    }
    if (err.includes("550") || err.includes("mailbox") || err.includes("recipient") || err.includes("no such user")) {
      return "Alamat email tujuan tidak valid atau ditolak oleh server mail penerima.";
    }
    if (err.includes("cert") || err.includes("tls") || err.includes("ssl")) {
      return "Kendala negosiasi sertifikat SSL/TLS. Pastikan kombinasi Host dan Port telah sesuai dengan jenis enkripsi.";
    }
    return "Periksa kembali kredensial pengirim, koneksi jaringan, dan pengaturan port server SMTP.";
  };

  const [deliveryNotice, setDeliveryNotice] = useState<DeliveryNotice | null>(null);

  // Auto-dismiss delivery notice visual effect after 3.8 seconds
  useEffect(() => {
    if (!deliveryNotice) return;
    const autoDismissTimer = setTimeout(() => {
      setDeliveryNotice(null);
    }, deliveryNotice.status === "success" ? 3800 : 4200);

    return () => clearTimeout(autoDismissTimer);
  }, [deliveryNotice]);

  // Main Email Sender function with real-time visual progress & status feedback
  const sendEmailPacket = async (to: string, subject: string, bodyText: string, isTest = false): Promise<boolean> => {
    const activeHost = smtpConfig.host || "smtp.gmail.com";
    const activePort = String(smtpConfig.port || "587");
    const startTime = Date.now();
    const now = new Date();
    const dt = getFormattedDateTimeObj(now);

    // Generate fresh guaranteed unique reference ID & sync date/time for this transmission
    const uniqueRef = generateUniqueReference(bodyText || subject, now);
    const randomizedBody = synchronizeDynamicFieldsInHtml(bodyText, now, uniqueRef, { refreshRef: true });
    const inlinedBody = forceInlineStylesToHtml(randomizedBody);
    
    let activeSubject = subject || mailForm.subject || (isTest ? "Ujicoba Koneksi Relay" : "Notifikasi Transaksi Kartu Kredit");
    activeSubject = activeSubject
      .replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, uniqueRef)
      .replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, uniqueRef)
      .replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI|TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort)
      .replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi|tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort)
      .replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dt.dateShort)
      .replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dt.dateShort)
      .replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, dt.timeShort)
      .replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, dt.timeShort);

    // Pre-flight check for App Password format if user is sending with configured SMTP
    if (smtpConfig?.username && smtpConfig?.password) {
      const passCheck = validateAppPasswordFormat(smtpConfig.password, smtpConfig.username);
      if (passCheck.isGmailOrYahoo && !passCheck.isExact16) {
        const errMsg = `Pengiriman dibatalkan: App Password Gmail/Yahoo harus tepat 16 karakter (saat ini ${passCheck.length} karakter). Perbarui di menu Akun/Pengaturan.`;
        setErrorMessage(errMsg);
        addLog("error", errMsg);
        setDeliveryNotice({
          status: "error",
          recipient: to,
          subject: activeSubject,
          isTest,
          serverHost: activeHost,
          serverPort: activePort,
          elapsedMs: 50,
          errorMessage: "Format App Password Belum Memenuhi Syarat (Harus 16 Karakter)",
          tip: `App Password saat ini berisi ${passCheck.length} karakter. Harap gunakan App Password 16 karakter tanpa spasi dari Keamanan Akun Google/Yahoo.`,
          timestamp: new Date().toLocaleTimeString("id-ID"),
          rawPayload: { to, subject: activeSubject, bodyText: randomizedBody, isTest }
        });
        return false;
      }
    }

    // Pre-flight validation for customCancelLink URL format
    if (customCancelLink && customCancelLink.trim()) {
      const trimmedLink = customCancelLink.trim();
      let isValidUrl = false;
      let urlWarningReason = "";

      if (!/^https?:\/\//i.test(trimmedLink)) {
        isValidUrl = false;
        urlWarningReason = "tautan tidak diawali protokol 'http://' atau 'https://'";
      } else {
        try {
          const parsedUrl = new URL(trimmedLink);
          if ((parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") && parsedUrl.hostname && parsedUrl.hostname.includes(".")) {
            isValidUrl = true;
          } else {
            isValidUrl = false;
            urlWarningReason = "nama domain atau host tidak lengkap";
          }
        } catch {
          isValidUrl = false;
          urlWarningReason = "struktur sintaks URL tidak valid";
        }
      }

      if (!isValidUrl) {
        addLog(
          "warning",
          `⚠️ [Validasi Link Batal Kustom] URL tautan pembatalan "${trimmedLink}" terlihat tidak lengkap (${urlWarningReason}). Disarankan menggunakan format lengkap seperti https://domain-anda.com/batal.`
        );
      }
    }

    setSending(true);
    setErrorMessage(null);
    addLog("info", `⚡ [Auto No. Ref & Waktu] Ref: ${uniqueRef} | Waktu: ${dt.dateTimeShort}`);
    addLog("info", `${isTest ? "[UJICOBA] " : ""}Memulai pengiriman paket ke ${to} (${activeHost}:${activePort})...`);

    try {
      const isHtml = /<[a-z][\s\S]*>/i.test(inlinedBody);
      let htmlContent = "";
      if (isHtml) {
        if (inlinedBody.includes("<html") || inlinedBody.includes("<!DOCTYPE") || inlinedBody.includes("<table") || inlinedBody.includes("<body")) {
          htmlContent = inlinedBody;
        } else {
          htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
              ${inlinedBody}
            </div>
          `;
        }
      } else {
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 12px 0;">
            <div style="font-size: 14px; line-height: 1.6; color: #334155;">
              ${inlinedBody.replace(/\n/g, "<br>")}
            </div>
          </div>
        `;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const plainTextFallback = inlinedBody
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim() || activeSubject;

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          to,
          subject: activeSubject,
          text: plainTextFallback,
          html: htmlContent,
          smtpConfig: smtpConfig.username ? {
            ...smtpConfig,
            username: smtpConfig.username.trim(),
            password: smtpConfig.password ? smtpConfig.password.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").trim() : ""
          } : undefined,
          clientDateTime: dt,
          clientRef: uniqueRef,
          clientTimezone: "Asia/Jakarta"
        })
      });

      clearTimeout(timeoutId);
      const resData = await response.json();
      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorMsg = resData.error || "Gagal mengirim email";
        setSmtpStatus({
          status: "disconnected",
          message: errorMsg,
          lastChecked: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        });
        const tip = getDiagnosticTip(errorMsg, activeHost, activePort);
        setErrorMessage(errorMsg);
        addLog("error", `${isTest ? "[UJICOBA GAGAL] " : "Relay failed: "}${errorMsg}`);

        setDeliveryNotice({
          status: "error",
          recipient: to,
          subject: activeSubject,
          isTest,
          serverHost: activeHost,
          serverPort: activePort,
          elapsedMs: elapsed,
          errorMessage: errorMsg,
          tip,
          timestamp: new Date().toLocaleTimeString("id-ID"),
          rawPayload: { to, subject: activeSubject, bodyText: randomizedBody, isTest }
        });
        return false;
      }

      setSmtpStatus({
        status: "connected",
        message: `Terhubung & Siap (${smtpConfig.host || "SMTP"})`,
        lastChecked: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      });
      addLog("success", `${isTest ? "[UJICOBA SUKSES] " : "Relay success. "}Ref: ${uniqueRef} | MessageID: ${resData.messageId} (${elapsed}ms)`);
      addLog("success", `⚡ Target sistem berhasil diakses. [${to}]`);

      const sentRecord = {
        to,
        subject: activeSubject,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        isTest
      };
      setLastSentEmail(sentRecord);
      try {
        localStorage.setItem("last_sent_email", JSON.stringify(sentRecord));
      } catch (e) {}

      setDeliveryNotice({
        status: "success",
        recipient: to,
        subject: activeSubject,
        isTest,
        messageId: resData.messageId,
        serverHost: activeHost,
        serverPort: activePort,
        elapsedMs: elapsed,
        timestamp: new Date().toLocaleTimeString("id-ID"),
        rawPayload: { to, subject: activeSubject, bodyText: randomizedBody, isTest }
      });

      return true;
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      let errorMsg = err.message || "Gagal menghubungi relay server.";
      if (err.name === "AbortError") {
        errorMsg = "Waktu permintaan habis (Request timed out 60s). Server SMTP tidak merespons.";
      }
      setErrorMessage(errorMsg);
      addLog("error", `${isTest ? "[UJICOBA ERROR] " : "Relay error: "}${errorMsg}`);

      const tip = getDiagnosticTip(errorMsg, activeHost, activePort);
      setDeliveryNotice({
        status: "error",
        recipient: to,
        subject: activeSubject,
        isTest,
        serverHost: activeHost,
        serverPort: activePort,
        elapsedMs: elapsed,
        errorMessage: errorMsg,
        tip,
        timestamp: new Date().toLocaleTimeString("id-ID"),
        rawPayload: { to, subject, bodyText, isTest }
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  const saveSMTPConfig = () => {
    const cleaned = {
      ...smtpConfig,
      username: smtpConfig.username.trim(),
      password: smtpConfig.password ? smtpConfig.password.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").trim() : "",
      senderEmail: (smtpConfig.senderEmail || smtpConfig.username).trim()
    };
    setSmtpConfig(cleaned);
    localStorage.setItem("smtp_account", JSON.stringify(cleaned));
    addLog("success", "Konfigurasi SMTP disimpan dan diperbarui.");
    fetchHealth();
    verifySmtpConnection(cleaned, false);
    setTab("send");
  };

  const testSMTPConnection = async () => {
    if (!smtpConfig.username || !smtpConfig.password || !smtpConfig.host) {
      addLog("warning", "Lengkapi konfigurasi sebelum melakukan test.");
      return;
    }

    const cleanedConfig = {
      ...smtpConfig,
      username: smtpConfig.username.trim(),
      password: smtpConfig.password ? smtpConfig.password.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").trim() : "",
      senderEmail: (smtpConfig.senderEmail || smtpConfig.username).trim()
    };

    setSending(true);
    addLog("info", `Memverifikasi koneksi SMTP (${cleanedConfig.host}:${cleanedConfig.port})...`);

    try {
      const verifyRes = await fetch("/api/verify-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpConfig: cleanedConfig })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.connected) {
        const errorMsg = verifyData.error || "Gagal terhubung ke server SMTP.";
        setSmtpStatus({
          status: "disconnected",
          message: errorMsg,
          lastChecked: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        });
        addLog("error", `[UJICOBA GAGAL] ${errorMsg}`);
        setErrorMessage(errorMsg);
        setDeliveryNotice({
          status: "error",
          recipient: cleanedConfig.senderEmail || cleanedConfig.username,
          subject: "Ujicoba Koneksi Relay",
          isTest: true,
          serverHost: cleanedConfig.host,
          serverPort: String(cleanedConfig.port),
          elapsedMs: 120,
          errorMessage: errorMsg,
          tip: getDiagnosticTip(errorMsg, cleanedConfig.host, String(cleanedConfig.port)),
          timestamp: new Date().toLocaleTimeString("id-ID"),
        });
        setSending(false);
        return;
      }
    } catch (e: any) {
      addLog("error", `[UJICOBA GAGAL] Kesalahan jaringan: ${e?.message || "Koneksi gagal"}`);
      setSending(false);
      return;
    }

    const targetEmail = cleanedConfig.senderEmail || cleanedConfig.username;
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 36px 20px; background: #f0f7ff; border-radius: 20px; border: 1px solid #d0e4ff; max-width: 520px; margin: 0 auto;">
        <div style="width: 52px; height: 52px; line-height: 52px; background: #00427a; color: #ffffff; font-size: 22px; border-radius: 50%; margin: 0 auto 14px auto; font-weight: 900; box-shadow: 0 4px 12px rgba(0,66,122,0.3);">✓</div>
        <h2 style="color: #002d54; font-size: 19px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.4px;">Ujicoba Koneksi Relay Berhasil!</h2>
        <p style="color: #475569; font-size: 13px; margin: 0 0 18px 0; line-height: 1.5;">Pengaturan SMTP Anda valid dan server pengiriman telah berhasil merelay pesan ini ke inbox Anda.</p>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 11px; color: #64748b; text-align: left; line-height: 1.6;">
          <div><b>Server Relay:</b> ${cleanedConfig.host}:${cleanedConfig.port}</div>
          <div><b>Akun Pengirim:</b> ${cleanedConfig.username}</div>
          <div><b>Waktu Pengiriman:</b> ${new Date().toLocaleString("id-ID")}</div>
        </div>
      </div>
    `;

    await sendEmailPacket(
      targetEmail,
      "Test Connection - G-Swift Relay Console",
      testHtml,
      true
    );
  };

  // Manage Email Templates
  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.message) {
      return;
    }

    if (activeEditingTemplateId) {
      const updated = templates.map(t =>
        t.id === activeEditingTemplateId
          ? { ...t, name: templateForm.name, category: templateForm.category, subject: templateForm.subject, message: templateForm.message }
          : t
      );
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
      addLog("info", `Template "${templateForm.name}" berhasil diperbarui.`);
    } else {
      const newTemplate: TemplateItem = {
        id: Math.random().toString(36).substring(7),
        name: templateForm.name,
        category: templateForm.category || "General",
        subject: templateForm.subject,
        message: templateForm.message
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
      addLog("success", `Template "${templateForm.name}" ditambahkan.`);
    }

    setIsTemplateModalOpen(false);
    setActiveEditingTemplateId(null);
    setTemplateForm({ name: "", category: "General", subject: "", message: "" });
  };

  const handleEditTemplateClick = (t: TemplateItem) => {
    setTemplateForm({
      name: t.name,
      category: t.category,
      subject: t.subject,
      message: t.message
    });
    setActiveEditingTemplateId(t.id);
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    const target = templates.find(t => t.id === id);
    const name = target ? ` "${target.name}"` : "";
    setConfirmModal({
      isOpen: true,
      title: "Hapus Template",
      message: `Apakah Anda yakin ingin menghapus template${name}? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: () => {
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem("email_templates", JSON.stringify(updated));
        addLog("warning", "Template berhasil dihapus.");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleClearAllTemplates = () => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Semua Template",
      message: "Apakah Anda yakin ingin menghapus semua template yang tersimpan? Tindakan ini tidak dapat dibatalkan.",
      onConfirm: () => {
        setTemplates([]);
        localStorage.setItem("email_templates", JSON.stringify([]));
        addLog("warning", "Semua template berhasil dihapus.");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleApplyTemplate = useCallback((t: TemplateItem) => {
    const now = new Date();
    const dt = getFormattedDateTimeObj(now);
    const uniqueRef = generateUniqueReference(t.message || t.subject, now);
    const randomizedMessage = synchronizeDynamicFieldsInHtml(t.message, now, uniqueRef, { refreshRef: true });
    let randomizedSubject = t.subject
      ? synchronizeDynamicFieldsInHtml(t.subject, now, uniqueRef, { refreshRef: true })
      : t.subject;
    if (randomizedSubject) {
      randomizedSubject = randomizedSubject
        .replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, uniqueRef)
        .replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, uniqueRef)
        .replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI|TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort)
        .replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi|tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort)
        .replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dt.dateShort)
        .replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dt.dateShort)
        .replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, dt.timeShort)
        .replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, dt.timeShort);
    }

    setMailForm(prev => ({
      to: prev.to,
      subject: randomizedSubject,
      message: randomizedMessage
    }));
    setTab("send");
    addLog("info", `⚡ [Auto No. Ref & Waktu] Ref baru: ${uniqueRef} | Waktu: ${dt.dateTimeShort}`);
    addLog("info", `Template "${t.name}" diterapkan dengan No. Referensi & Tanggal/Waktu (${dt.dateTimeShort}) terkini.`);
  }, [addLog]);

  const filteredTemplates = useMemo(() => {
    return templates
      .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, searchQuery]);

  // Recipient email field validation memoized for ultra-responsive performance
  const recipientValidation = useMemo(() => {
    const rawVal = mailForm.to.trim();
    const isToFilled = rawVal.length > 0;
    const parsedList = extractEmailAddresses(rawVal);
    const tokens = rawVal.split(/[,;\s\n\r\t]+/).filter(Boolean);
    const isStrictValid = tokens.length > 0 && tokens.every(tok => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(tok));
    
    // Domain Validation "Database Umum"
    const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "yahoo.co.id", "outlook.com", "hotmail.com", "icloud.com", "live.com", "msn.com", "qq.com", "protonmail.com", "zoho.com", "gmx.com", "mail.com", "yandex.com", "me.com"];
    const COMMON_TLDS = [".com", ".id", ".co.id", ".net", ".org", ".edu", ".ac.id", ".go.id", ".mil.id", ".or.id", ".info", ".biz", ".me", ".io", ".dev", ".web.id", ".my.id", ".xyz"];
    
    const invalidDomainTok = tokens.find(tok => {
      const parts = tok.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1].toLowerCase();
      if (COMMON_DOMAINS.includes(domain)) return false;
      if (COMMON_TLDS.some(tld => domain.endsWith(tld))) return false;
      return true;
    });
    
    const hasInvalidCommonDomain = !!invalidDomainTok;
    const hasExtractedEmails = parsedList.length > 0;
    const hasJunkOutsideEmail = isToFilled && !isStrictValid && hasExtractedEmails;
    const hasNoEmailAtAll = isToFilled && parsedList.length === 0;

    return {
      rawVal,
      isToFilled,
      parsedList,
      tokens,
      isStrictValid,
      invalidDomainTok,
      hasInvalidCommonDomain,
      hasExtractedEmails,
      hasJunkOutsideEmail,
      hasNoEmailAtAll
    };
  }, [mailForm.to]);

  const handleClearMailForm = useCallback(() => {
    clearEmailDraftData();
    addLog("info", "Formulir pengiriman email dibersihkan.");
  }, [clearEmailDraftData, addLog]);

  const handleMainFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    dismissKeyboard();
    if (!mailForm.to || !mailForm.to.trim()) {
      addLog("warning", "Email penerima belum diisi.");
      setErrorMessage("Silakan masukkan minimal satu alamat email penerima.");
      return;
    }
    if (!mailForm.subject || !mailForm.subject.trim()) {
      addLog("warning", "Subjek email belum diisi.");
      setErrorMessage("Silakan masukkan subjek email.");
      return;
    }
    if (!mailForm.message || !mailForm.message.trim()) {
      addLog("warning", "Pesan draf email belum diisi.");
      setErrorMessage("Silakan lengkapi pesan draf email sebelum mengirim.");
      return;
    }
    const success = await sendEmailPacket(mailForm.to, mailForm.subject, mailForm.message);
    dismissKeyboard();
    if (success) {
      clearEmailDraftData();
    }
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-mandiri-gold">
      {/* 1. Maintenance Screen Overlay */}
      {maintenanceActive && localStorage.getItem("bypass_maintenance") !== "active" ? (
        <div className="flex h-screen bg-slate-50 items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,66,122,0.05),transparent)] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#E6AC00] z-[60]" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-[0_40px_100px_-20px_rgba(0,58,143,0.3)] border border-slate-100 flex flex-col items-center text-center relative z-10"
          >
            <div className="w-24 h-24 bg-mandiri-blue-50 rounded-full flex items-center justify-center mb-8 relative">
              <Settings className="w-12 h-12 text-mandiri-blue-600 animate-spin-slow" />
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -right-1 -top-1 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center border-4 border-white"
              >
                <TriangleAlert className="w-4 h-4 text-amber-600" />
              </motion.div>
            </div>

            <h1 className="text-2xl font-black text-mandiri-blue-800 tracking-tight mb-2">Sedang Pemeliharaan</h1>
            <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
              Kami sedang melakukan peningkatan sistem untuk memberikan layanan pengiriman yang lebih cepat dan aman.
            </p>

            <div className="mt-8 w-full space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 justify-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]" />
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Estimasi Selesai: Segera</span>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 w-full flex flex-col gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Terhubung dengan Tim IT</p>
              <div className="flex justify-center gap-4 mt-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                  <Terminal className="w-4 h-4" />
                </div>
              </div>
            </div>

            <input
              type="password"
              className="opacity-0 absolute bottom-0 h-1 w-1 pointer-events-none"
              onChange={e => {
                if (e.target.value === "mantap") {
                  localStorage.setItem("bypass_maintenance", "active");
                  setMaintenanceActive(false);
                  addLog("success", "Maintenance bypassed successfully.");
                }
              }}
            />
          </motion.div>
          <p className="absolute bottom-8 text-[10px] font-black text-mandiri-blue-700 uppercase tracking-widest opacity-30">
            G-Swift Relay System v1.0.8
          </p>
        </div>
      ) : (
        // Main App Workstation Console with Collapsible Sidebar on Desktop
        <div className={cn(
          "flex h-[100dvh] w-full bg-slate-50 lg:bg-slate-950 font-sans overflow-hidden relative",
          tab === "ai"
            ? "p-0"
            : "lg:items-center lg:justify-center lg:p-4 xl:p-6 lg:bg-[radial-gradient(ellipse_at_top,rgba(0,58,143,0.14),transparent)]"
        )}>
          {/* Decorative ambient blurred glow rings for desktop */}
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-mandiri-blue-600/10 blur-[120px] pointer-events-none hidden lg:block" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-mandiri-blue-400/5 blur-[120px] pointer-events-none hidden lg:block" />

          {/* Workstation Console - Seamless full-screen on Mobile & Framed on Desktop */}
          <motion.div
            animate={
              deliveryNotice?.status === "success"
                ? {
                    x: [0, -6, 6, -4, 4, -2, 2, 0],
                    y: [0, 4, -4, 2, -2, 1, -1, 0],
                    rotate: [0, -0.4, 0.4, -0.2, 0.2, 0]
                  }
                : { x: 0, y: 0, rotate: 0 }
            }
            transition={
              deliveryNotice?.status === "success"
                ? { duration: 0.45, ease: "easeOut", delay: 0.05 }
                : { duration: 0.2 }
            }
            className={cn(
              "relative w-full h-[100dvh] bg-slate-50 flex flex-col overflow-hidden transform-gpu will-change-transform",
              tab === "ai"
                ? "lg:h-full lg:max-w-none lg:rounded-none lg:border-0 lg:shadow-none"
                : "lg:max-w-[1440px] lg:h-[900px] lg:rounded-[36px] lg:border-[5px] lg:border-slate-900/90 lg:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] lg:bg-slate-900 lg:flex-row"
            )}
          >
            
            {/* Desktop Collapsible Navigation Sidebar (Wide Screens) */}
            <aside
              className={cn(
                tab === "ai"
                  ? "hidden"
                  : "hidden lg:flex flex-col shrink-0 border-r border-slate-800 bg-slate-950/95 text-slate-300 transition-all duration-300 ease-in-out relative z-30 select-none",
                sidebarCollapsed ? "w-[76px]" : "w-64 xl:w-72"
              )}
            >
              {/* Sidebar Header & Brand */}
              <div className={cn(
                "h-14 border-b border-slate-800/80 flex items-center px-3.5 transition-all",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}>
                {!sidebarCollapsed ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mandiri-blue-700 via-mandiri-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-mandiri-blue-600/30 shrink-0">
                      <Send className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white tracking-wider uppercase">G-Swift Relay</span>
                        <span className="text-[8px] font-black bg-mandiri-gold text-mandiri-blue-950 px-1.5 py-0.2 rounded font-mono">v1.0</span>
                      </div>
                      <span className="text-[9.5px] font-semibold text-slate-400 truncate">Enterprise Mail Console</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mandiri-blue-700 via-mandiri-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-mandiri-blue-600/30 shrink-0">
                    <Send className="w-4.5 h-4.5 text-white" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={cn(
                    "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700",
                    sidebarCollapsed && "mt-1 p-1"
                  )}
                  title={sidebarCollapsed ? "Perluas Sidebar Navigasi" : "Sembunyikan / Perkecil Sidebar Navigasi"}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="w-4.5 h-4.5 text-slate-300" />
                  ) : (
                    <PanelLeftClose className="w-4.5 h-4.5 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
                {[
                  { id: "send", label: "Kirim Email", icon: Send, badge: mailForm.to ? "Draf Siap" : null, color: "text-amber-400" },
                  { id: "ai", label: "Claude Mythos", icon: ClaudeLogo, badge: "Claude Mythos", highlight: true, color: "text-amber-400" },
                  { id: "templates", label: "Templates", icon: FileText, badge: `${templates.length}`, color: "text-emerald-400" },
                  { id: "terminal", label: "Terminal & Log", icon: Terminal, badge: `${logs.length}`, color: "text-cyan-400" },
                  { id: "accounts", label: "Pengaturan Akun", icon: Settings, badge: smtpStatus.status === "connected" ? "Online" : "Off", color: "text-slate-400" },
                ].map((item) => {
                  const isActive = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative group",
                        isActive
                          ? "bg-mandiri-blue-600 text-white shadow-lg shadow-mandiri-blue-600/30"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70",
                        sidebarCollapsed && "justify-center px-0"
                      )}
                      title={item.label}
                    >
                      <div className="relative shrink-0 flex items-center justify-center">
                        <item.icon className={cn("w-4.5 h-4.5 transition-transform group-hover:scale-110", isActive ? "text-white" : item.color)} />
                        {item.id === "ai" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        )}
                      </div>

                      {!sidebarCollapsed && (
                        <>
                          <span className="truncate flex-1 text-left tracking-wide">{item.label}</span>
                          {item.badge && (
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider shrink-0",
                              item.id !== "ai" && "uppercase",
                              isActive
                                ? "bg-white/20 text-white"
                                : item.id === "ai"
                                ? "bg-amber-950 text-amber-300 border border-amber-800/80"
                                : item.id === "accounts" && smtpStatus.status === "connected"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/80"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Tooltip for collapsed mode */}
                      {sidebarCollapsed && (
                        <span className="absolute left-full ml-3.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity shadow-xl border border-slate-700 z-50">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sidebar Bottom: SMTP Status & Collapse Action */}
              <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
                {!sidebarCollapsed ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          smtpStatus.status === "connected"
                            ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                            : smtpStatus.status === "disconnected"
                            ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                            : "bg-amber-500"
                        )} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SMTP Status</span>
                          <span className="text-[10px] font-bold text-slate-200 truncate">
                            {smtpConfig.username ? smtpConfig.username : "Belum Login"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => verifySmtpConnection(smtpConfig)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Verifikasi koneksi SMTP"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", smtpStatus.status === "checking" && "animate-spin text-amber-400")} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[9.5px] text-slate-400 px-1">
                      <span>Ruang Kerja Luas</span>
                      <button
                        type="button"
                        onClick={toggleSidebar}
                        className="text-mandiri-blue-400 hover:text-mandiri-blue-300 font-bold hover:underline cursor-pointer"
                      >
                        Perkecil Sidebar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTab("accounts")}
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all",
                        smtpStatus.status === "connected"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      )}
                      title={`SMTP Status: ${smtpStatus.status.toUpperCase()}`}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        smtpStatus.status === "connected" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                      )} />
                    </button>

                    <button
                      type="button"
                      onClick={toggleSidebar}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Perluas Sidebar Navigasi"
                    >
                      <PanelLeftOpen className="w-4 h-4 text-slate-300" />
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Layout Area inside console */}
            <main className={cn(
              "flex-1 flex flex-col overflow-hidden relative bg-gradient-to-b from-mandiri-blue-400 via-mandiri-blue-50 to-mandiri-gray-bg",
              (tab === "ai" || (tab === "send" && (isKeyboardVisible || isFormInputFocused))) ? "pb-0" : "pb-[60px] lg:pb-0"
            )}>
            {/* Paper Plane Flying Animation Visual Effect */}
            <AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 z-[120] pointer-events-none flex items-center justify-center overflow-hidden bg-slate-950/80 backdrop-blur-md"
                >
                  {/* Ambient Dynamic Background Glows */}
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(48,155,245,0.2),transparent_70%)]" />

                  {/* Center Floating Core Orb */}
                  <div className="relative flex items-center justify-center">
                    {/* Rotating Dashed Ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute w-48 h-48 border border-dashed border-mandiri-blue-400/50 rounded-full pointer-events-none"
                    />

                    {/* Orbiting Satellites */}
                    {[...Array(5)].map((_, idx) => (
                      <motion.div
                        key={idx}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.6, delay: idx * 0.3, repeat: Infinity, ease: "linear" }}
                        className="absolute w-40 h-40 pointer-events-none"
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-mandiri-blue-400 rounded-full shadow-[0_0_12px_#309bf5]" />
                      </motion.div>
                    ))}

                    {/* Main Glowing Floating Core Orb */}
                    <motion.div
                      animate={{
                        scale: [0.95, 1.05, 0.95],
                        boxShadow: [
                          "0 0 35px rgba(48, 155, 245, 0.6)",
                          "0 0 80px rgba(48, 155, 245, 0.9)",
                          "0 0 35px rgba(48, 155, 245, 0.6)"
                        ]
                      }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="w-28 h-28 bg-white rounded-full flex items-center justify-center relative z-10 border-4 border-mandiri-blue-500 shadow-2xl"
                    >
                      <Send className="w-14 h-14 text-mandiri-blue-600" />
                      <motion.div
                        animate={{ x: ["100%", "-100%"] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45 pointer-events-none rounded-full overflow-hidden"
                      />
                    </motion.div>

                    {/* Floating Text Directly Overlaid in Center of Icon - No Enclosing Box */}
                    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.82 }}
                        animate={{
                          opacity: [0, 1, 0.4, 1, 0.85, 1],
                          scale: [0.85, 1.05, 0.98, 1.02, 1]
                        }}
                        transition={{
                          duration: 0.2,
                          ease: "easeOut"
                        }}
                        className="flex items-center justify-center text-center w-max max-w-[96vw] px-2"
                      >
                        <span
                          className="font-mono text-base sm:text-2xl md:text-3xl lg:text-4xl font-black italic tracking-wider sm:tracking-widest text-mandiri-blue-100 uppercase select-none whitespace-nowrap animate-glitch-flicker-02s drop-shadow-[0_6px_16px_rgba(0,0,0,0.99)]"
                          style={{
                            textShadow: "0 0 60px rgba(48, 155, 245, 1), 0 0 35px rgba(48, 155, 245, 1), 0 0 18px rgba(48, 155, 245, 0.95), 0 0 8px rgba(48, 155, 245, 1), -4px 0 3px rgba(34, 211, 238, 0.9), 4px 0 3px rgba(244, 63, 94, 0.9), 0 4px 14px rgba(0, 0, 0, 1), 0 0 8px #000000"
                          }}
                        >
                          MENGIRIM PAKET DATA...
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Delivery Result Notification - Completely Centered Floating Icon with No Positional Jump */}
            <AnimatePresence>
              {deliveryNotice && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 z-[120] pointer-events-none flex items-center justify-center overflow-hidden bg-slate-950/80 backdrop-blur-md"
                >
                  {/* Ambient Dynamic Background Glows */}
                  <div className={cn(
                    "absolute inset-0 pointer-events-none transition-all duration-700",
                    deliveryNotice.status === "success"
                      ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.4),transparent_70%)]"
                      : "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.4),transparent_70%)]"
                  )} />

                  {/* Center Floating Core Orb - Fixed Coordinates Identical to Sending Animation */}
                  <div className="relative flex items-center justify-center">
                    {/* Rotating Dashed Ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className={cn(
                        "absolute w-48 h-48 border border-dashed rounded-full pointer-events-none",
                        deliveryNotice.status === "success" ? "border-emerald-400/50" : "border-rose-400/50"
                      )}
                    />

                    {/* Orbiting Satellites */}
                    {[...Array(5)].map((_, idx) => (
                      <motion.div
                        key={idx}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.6, delay: idx * 0.3, repeat: Infinity, ease: "linear" }}
                        className="absolute w-40 h-40 pointer-events-none"
                      >
                        <div className={cn(
                          "absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full",
                          deliveryNotice.status === "success"
                            ? "bg-emerald-400 shadow-[0_0_12px_#10b981]"
                            : "bg-rose-400 shadow-[0_0_12px_#f43f5e]"
                        )} />
                      </motion.div>
                    ))}

                    {/* Bursting glowing particles */}
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={`notice-part-${i}`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: [0, 0.9, 0],
                          scale: [0, 2, 0],
                          x: (Math.sin(i * 0.628) * 85),
                          y: (Math.cos(i * 0.628) * 85)
                        }}
                        transition={{ duration: 1.2, delay: i * 0.1, repeat: Infinity, ease: "easeOut" }}
                        className={cn(
                          "absolute w-1.5 h-1.5 rounded-full pointer-events-none",
                          deliveryNotice.status === "success" ? "bg-emerald-300" : "bg-rose-300"
                        )}
                      />
                    ))}

                    {/* Main Glowing Floating Core Orb - Fixed W-28 H-28 to perfectly match Sending State */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: [0.95, 1.05, 0.95],
                        opacity: 1,
                        boxShadow: deliveryNotice.status === "success"
                          ? [
                              "0 0 35px rgba(16, 185, 129, 0.6)",
                              "0 0 80px rgba(16, 185, 129, 0.9)",
                              "0 0 35px rgba(16, 185, 129, 0.6)"
                            ]
                          : [
                              "0 0 35px rgba(244, 63, 94, 0.6)",
                              "0 0 80px rgba(244, 63, 94, 0.9)",
                              "0 0 35px rgba(244, 63, 94, 0.6)"
                            ]
                      }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className={cn(
                        "w-28 h-28 bg-white rounded-full flex items-center justify-center relative z-10 border-4 shadow-2xl",
                        deliveryNotice.status === "success"
                          ? "border-emerald-500 text-emerald-600"
                          : "border-rose-500 text-rose-600"
                      )}
                    >
                      {deliveryNotice.status === "success" ? (
                        <CheckCheck className="w-14 h-14 text-emerald-600" />
                      ) : (
                        <X className="w-14 h-14 text-rose-600" />
                      )}
                      <motion.div
                        animate={{ x: ["100%", "-100%"] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45 pointer-events-none rounded-full overflow-hidden"
                      />
                    </motion.div>

                    {/* Floating Text Directly Overlaid in Center of Icon - No Enclosing Box */}
                    {deliveryNotice.status === "success" && (
                      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.82 }}
                          animate={{
                            opacity: [0, 1, 0.4, 1, 0.85, 1],
                            scale: [0.85, 1.05, 0.98, 1.02, 1]
                          }}
                          transition={{
                            duration: 0.2,
                            ease: "easeOut"
                          }}
                          className="flex items-center justify-center text-center w-max max-w-[96vw] px-2"
                        >
                          <span
                            className="font-mono text-base sm:text-2xl md:text-3xl lg:text-4xl font-black italic tracking-wider sm:tracking-widest text-emerald-200 uppercase select-none whitespace-nowrap animate-glitch-flicker-02s drop-shadow-[0_6px_16px_rgba(0,0,0,0.99)]"
                            style={{
                              textShadow: "0 0 60px rgba(16, 185, 129, 1), 0 0 35px rgba(52, 211, 153, 1), 0 0 18px rgba(16, 185, 129, 0.95), 0 0 8px rgba(110, 231, 183, 1), -4px 0 3px rgba(34, 211, 238, 0.9), 4px 0 3px rgba(244, 63, 94, 0.9), 0 4px 14px rgba(0, 0, 0, 1), 0 0 8px #000000"
                            }}
                          >
                            TARGET SISTEM BERHASIL Di RETASS
                          </span>
                        </motion.div>
                      </div>
                    )}

                    {deliveryNotice.status === "error" && (
                      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.35, delay: 0.1 }}
                          className="flex items-center justify-center text-center w-max max-w-[96vw] px-2"
                        >
                          <span
                            className="font-mono text-xs sm:text-base md:text-lg font-black tracking-wider text-rose-300 uppercase select-none whitespace-nowrap drop-shadow-[0_4px_8px_rgba(0,0,0,0.98)]"
                            style={{
                              textShadow: "0 0 32px rgba(244, 63, 94, 1), 0 0 16px rgba(251, 113, 133, 0.95), 0 0 6px rgba(244, 63, 94, 0.8), 0 3px 10px rgba(0, 0, 0, 0.98), 0 0 4px #000000"
                            }}
                          >
                            Exploit Failed &bull; Delivery Interrupted
                          </span>
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Header Bar - Display Only Logo (Claude Mythos) and Connection Indicator */}
            {tab !== "ai" && (
              <header className="h-14 bg-white border-b border-slate-100 px-3.5 sm:px-5 flex items-center justify-between shrink-0 shadow-xs z-30 relative gap-2">
                {/* Brand Logo & Name (Display Only) */}
                <div className="flex items-center gap-2.5 min-w-0 select-none">
                  {/* Authentic Claude Logo Icon */}
                  <div className="shrink-0 flex items-center justify-center p-0.5">
                    <ClaudeLogo className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" animated={true} />
                  </div>
                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                  <span className="font-serif text-amber-950 font-bold text-sm sm:text-[15px] tracking-tight truncate">
                    Claude Mythos
                  </span>
                </div>

                {/* Explicit SMTP Connection Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (smtpStatus.status === "unconfigured") {
                        setTab("accounts");
                      } else {
                        verifySmtpConnection(smtpConfig);
                      }
                    }}
                    title={
                      smtpStatus.status === "connected"
                        ? `SMTP Terhubung: ${smtpConfig.host || "Server"} (${smtpStatus.lastChecked || "Online"}) - Klik untuk verifikasi ulang`
                        : smtpStatus.status === "disconnected"
                        ? `SMTP Terputus: ${smtpStatus.message || "Gagal"} - Klik untuk cek ulang`
                        : smtpStatus.status === "checking"
                        ? "Sedang memverifikasi koneksi SMTP..."
                        : "SMTP Belum Dikonfigurasi - Klik untuk buka pengaturan"
                    }
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer shadow-xs active:scale-95",
                      smtpStatus.status === "connected" &&
                        "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-emerald-500/10",
                      smtpStatus.status === "disconnected" &&
                        "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 shadow-rose-500/10 animate-pulse",
                      smtpStatus.status === "checking" &&
                        "bg-amber-50 text-amber-800 border-amber-300",
                      smtpStatus.status === "unconfigured" &&
                        "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200/80"
                    )}
                  >
                    {smtpStatus.status === "connected" ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="hidden sm:inline uppercase tracking-tight font-black text-[9.5px]">
                          SMTP Online
                        </span>
                        <span className="sm:hidden uppercase tracking-tight font-black text-[9.5px]">
                          ON
                        </span>
                      </>
                    ) : smtpStatus.status === "disconnected" ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                        <span className="hidden sm:inline uppercase tracking-tight font-black text-[9.5px]">
                          SMTP Offline
                        </span>
                        <span className="sm:hidden uppercase tracking-tight font-black text-[9.5px]">
                          OFF
                        </span>
                      </>
                    ) : smtpStatus.status === "checking" ? (
                      <>
                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                        <span className="uppercase tracking-tight font-black text-[9.5px]">
                          Cek...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
                        <span className="hidden sm:inline uppercase tracking-tight font-black text-[9.5px]">
                          SMTP Unset
                        </span>
                        <span className="sm:hidden uppercase tracking-tight font-black text-[9.5px]">
                          Unset
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </header>
            )}

            {/* Scrollable View Router */}
            <div className={cn("flex-1 min-h-0", tab === "ai" ? "flex flex-col overflow-hidden h-full" : "bg-white/40 overflow-y-auto")}>
              <AnimatePresence mode="wait">
                {/* 2.1 Tab Send (Kirim) */}
                {tab === "send" && (
                  <motion.div
                    key="send-tab"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="p-3 sm:p-5 max-w-4xl mx-auto flex flex-col gap-3 min-h-full justify-start w-[95%] sm:w-full mobile-card-container"
                  >
                    <div className="space-y-3 w-full">
                      <div className="bg-white rounded-2xl border border-white shadow-[0_25px_60px_rgba(0,58,143,0.25)] overflow-hidden ring-1 ring-mandiri-blue-100/50">
                        {/* Upper anti spam security header banner */}
                        <div className="px-4 py-3 border-b border-mandiri-border/30 bg-slate-50/80 flex flex-col gap-2 relative">
                          <div className="flex justify-between items-center mb-1">
                            <h2 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <div className="relative flex items-center justify-center w-2 h-2">
                                <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600 shadow-[0_0_8px_#22c55e] animate-luhn-glow" />
                              </div>
                              Sistem Anti-Spam Gmail – Pengirim
                            </h2>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-mandiri-blue-600 uppercase flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-green-500/20 rounded-full overflow-hidden relative">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-mandiri-blue-400 shadow-[0_0_4px_#3b82f6] animate-scan" />
                                </div>
                                AKTIF
                              </span>
                            </div>
                          </div>

                          {/* Active Sender Account Badge */}
                          {smtpConfig.username ? (
                            <div className="flex items-center gap-2.5 bg-gradient-to-r from-mandiri-blue-600 to-mandiri-blue-800 p-2 rounded-xl shadow-lg border border-mandiri-blue-400/30 group transition-all hover:shadow-mandiri-blue-200/50">
                              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[7px] font-black text-mandiri-blue-200 uppercase tracking-[0.2em] mb-0.5">Akun Pengirim Aktif</span>
                                <span className="text-xs font-black text-white truncate drop-shadow-sm selection:bg-mandiri-gold selection:text-mandiri-blue-900">{smtpConfig.username}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_#4ade80] animate-pulse" />
                                <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Secure Relay</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-slate-100 p-2 rounded-xl border border-slate-200 border-dashed justify-center">
                              <TriangleAlert className="w-4 h-4 text-amber-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Belum Ada Akun Pengirim</span>
                            </div>
                          )}
                        </div>

                        {/* Compose form */}
                        <form ref={formRef} onSubmit={handleMainFormSubmit} className="p-4 space-y-4">
                          <AnimatePresence>
                            {errorMessage && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="p-3 bg-mandiri-blue-50 border border-mandiri-blue-100 rounded-xl flex flex-col gap-3 relative"
                              >
                                <button type="button" onClick={() => setErrorMessage(null)} className="absolute top-2 right-2 text-mandiri-blue-400 hover:text-mandiri-blue-600 cursor-pointer">
                                  <Plus className="w-3.5 h-3.5 rotate-45" />
                                </button>
                                <div className="flex gap-2 items-start pr-6">
                                  <CircleAlert className="w-4 h-4 text-mandiri-blue-600 shrink-0 mt-0.5" />
                                  <p className="text-xs text-mandiri-blue-800 font-medium leading-normal flex-1">{errorMessage}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setTab("accounts")} className="text-[10px] font-black text-mandiri-blue-700 bg-white px-3 py-1.5 rounded-lg border border-mandiri-blue-200 hover:bg-mandiri-blue-100 transition-all uppercase cursor-pointer">Ubah Pengaturan</button>
                                  <button type="button" onClick={() => setTab("terminal")} className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all uppercase cursor-pointer">Lihat Log</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3.5">
                              {/* Email Penerima */}
                              {(() => {
                                const {
                                  isToFilled,
                                  parsedList,
                                  tokens,
                                  isStrictValid,
                                  hasInvalidCommonDomain,
                                  hasJunkOutsideEmail,
                                  hasNoEmailAtAll
                                } = recipientValidation;

                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between px-1">
                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[10px] font-black text-mandiri-blue-700 uppercase tracking-wider">
                                          Email Penerima
                                        </label>
                                        <span className="text-[9px] font-bold text-mandiri-blue-600 bg-mandiri-blue-50 px-1.5 py-0.5 rounded border border-mandiri-blue-200/60" title="Tempel teks kontak atau daftar nama apapun, sistem otomatis menyaring dan mengambil hanya alamat email.">
                                          Auto-Filter Aktif
                                        </span>
                                        {(mailForm.to || mailForm.subject || mailForm.message) && (
                                          <button
                                            type="button"
                                            onClick={handleClearMailForm}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                                            title="Kosongkan form input dan draf"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isToFilled && (
                                          <span
                                            className={cn(
                                              "text-[9px] font-bold flex items-center gap-1 transition-colors",
                                              isStrictValid ? (hasInvalidCommonDomain ? "text-amber-600" : "text-emerald-600") : hasJunkOutsideEmail ? "text-amber-600" : "text-rose-600"
                                            )}
                                          >
                                            {isStrictValid ? (
                                              <>
                                                {hasInvalidCommonDomain ? (
                                                  <CircleAlert className="w-3 h-3 text-amber-500" />
                                                ) : (
                                                  <CircleCheck className="w-3 h-3 text-emerald-500" />
                                                )}
                                                {hasInvalidCommonDomain ? "Domain Tidak Umum" : (tokens.length > 1 ? `${tokens.length} Email Valid` : "Format Valid")}
                                              </>
                                            ) : hasJunkOutsideEmail ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const cleaned = parsedList.join(", ");
                                                  setMailForm(prev => ({ ...prev, to: cleaned }));
                                                  setPasteFeedback({
                                                    type: "success",
                                                    message: "Alamat email berhasil dibersihkan dari teks tambahan!",
                                                    details: cleaned,
                                                    timestamp: Date.now()
                                                  });
                                                  addLog("info", `Auto-filter: ${parsedList.length} email berhasil dibersihkan (${cleaned})`);
                                                }}
                                                className="underline hover:text-amber-700 cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                                                title="Klik untuk membersihkan teks dan hanya mengambil alamat email"
                                              >
                                                <Sparkles className="w-3 h-3 text-amber-500 animate-spin-slow" />
                                                Bersihkan ({parsedList.length} email terdeteksi)
                                              </button>
                                            ) : (
                                              <>
                                                <CircleAlert className="w-3 h-3 text-rose-500 animate-pulse" />
                                                Tidak Ada Email Valid
                                              </>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Instant Paste Feedback Visual Banner */}
                                    <AnimatePresence>
                                      {pasteFeedback && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -6, height: 0 }}
                                          animate={{ opacity: 1, y: 0, height: "auto" }}
                                          exit={{ opacity: 0, y: -6, height: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className={cn(
                                            "p-2.5 rounded-xl border text-xs flex items-start gap-2.5 relative shadow-sm overflow-hidden",
                                            pasteFeedback.type === "error"
                                              ? "bg-rose-50 border-rose-200 text-rose-900"
                                              : pasteFeedback.type === "warning"
                                              ? "bg-amber-50 border-amber-200 text-amber-900"
                                              : "bg-emerald-50 border-emerald-200 text-emerald-900"
                                          )}
                                        >
                                          <div className="shrink-0 mt-0.5">
                                            {pasteFeedback.type === "error" ? (
                                              <TriangleAlert className="w-4 h-4 text-rose-600 animate-bounce" />
                                            ) : pasteFeedback.type === "warning" ? (
                                              <CircleAlert className="w-4 h-4 text-amber-600" />
                                            ) : (
                                              <CircleCheck className="w-4 h-4 text-emerald-600" />
                                            )}
                                          </div>
                                          <div className="flex-1 pr-5">
                                            <p className="font-extrabold text-[11px] leading-tight">
                                              {pasteFeedback.message}
                                            </p>
                                            {pasteFeedback.details && (
                                              <p className="text-[10px] opacity-90 mt-0.5 font-medium leading-normal">
                                                {pasteFeedback.details}
                                              </p>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setPasteFeedback(null)}
                                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-black/5 cursor-pointer"
                                            title="Tutup notifikasi"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>

                                    <div className="relative flex items-center">
                                      <input
                                        required
                                        type="text"
                                        value={mailForm.to}
                                        onChange={e => {
                                          const val = e.target.value;
                                          if (pasteFeedback?.type === "error") {
                                            setPasteFeedback(null);
                                          }
                                          // Auto-filter if pasted multiline or raw email envelope format like <user@domain.com>
                                          if (val.includes("\n") || (val.includes("<") && val.includes(">"))) {
                                            const extracted = extractEmailAddresses(val);
                                            if (extracted.length > 0) {
                                              setMailForm(prev => ({ ...prev, to: extracted.join(", ") }));
                                              addLog("info", `Filter otomatis: ${extracted.length} email diekstrak`);
                                              return;
                                            }
                                          }
                                          setMailForm(prev => ({ ...prev, to: val }));
                                        }}
                                        onPaste={e => {
                                          const pastedText = e.clipboardData?.getData("text") || "";
                                          if (!pastedText.trim()) return;

                                          const emails = extractEmailAddresses(pastedText);
                                          if (emails.length > 0) {
                                            e.preventDefault();
                                            const cleaned = emails.join(", ");
                                            setMailForm(prev => ({ ...prev, to: cleaned }));
                                            setPasteFeedback({
                                              type: "success",
                                              message: `${emails.length} Alamat Email Berhasil Disaring & Diterapkan!`,
                                              details: emails.length > 1 ? `Daftar: ${emails.join(", ")}` : `Email: ${emails[0]}`,
                                              timestamp: Date.now()
                                            });
                                            addLog("info", `Auto-Filter: ${emails.length} email berhasil disaring dari teks yang ditempel (${cleaned})`);
                                          } else {
                                            // Peringatan visual instan jika teks yang ditempel tidak ada email sama sekali
                                            setShakeInput(true);
                                            setTimeout(() => setShakeInput(false), 500);
                                            setPasteFeedback({
                                              type: "error",
                                              message: "Peringatan: Teks yang Ditempel Tidak Mengandung Format Email!",
                                              details: `Teks yang ditempel ("${pastedText.trim().length > 35 ? pastedText.trim().slice(0, 35) + '...' : pastedText.trim()}") tidak memiliki pola alamat email yang valid. Silakan tempel teks yang memuat format seperti nama@domain.com.`,
                                              timestamp: Date.now()
                                            });
                                            addLog("warning", `⚠️ [Peringatan Tempel] Teks yang ditempel tidak mengandung format email valid sama sekali: "${pastedText.trim().slice(0, 40)}..."`);
                                          }
                                        }}
                                        onBlur={() => {
                                          if (mailForm.to.trim()) {
                                            const emails = extractEmailAddresses(mailForm.to);
                                            if (emails.length > 0 && !isStrictValid) {
                                              const cleaned = emails.join(", ");
                                              if (cleaned !== mailForm.to.trim()) {
                                                setMailForm(prev => ({ ...prev, to: cleaned }));
                                                addLog("info", `Alamat email penerima otomatis dibersihkan: ${cleaned}`);
                                              }
                                            }
                                          }
                                        }}
                                        className={cn(
                                          "w-full px-4 py-3 pr-16 bg-white border rounded-xl text-sm focus:outline-none transition-all font-semibold text-mandiri-text shadow-sm",
                                          shakeInput && "animate-shake",
                                          !isToFilled
                                            ? "border-slate-300 focus:ring-4 focus:ring-mandiri-blue-100/50 focus:border-mandiri-blue-600"
                                            : isStrictValid
                                            ? (hasInvalidCommonDomain ? "border-amber-400 bg-amber-50/10 focus:ring-4 focus:ring-amber-100 focus:border-amber-600" : "border-emerald-500 bg-emerald-50/10 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600")
                                            : hasJunkOutsideEmail
                                            ? "border-amber-400 bg-amber-50/15 focus:ring-4 focus:ring-amber-100 focus:border-amber-600"
                                            : "border-rose-400 bg-rose-50/15 focus:ring-4 focus:ring-rose-100 focus:border-rose-600 ring-2 ring-rose-200/50"
                                        )}
                                      />
                                      {isToFilled && (
                                        <div className="absolute right-3 flex items-center gap-1.5 z-10">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMailForm(prev => ({ ...prev, to: "" }));
                                              setPasteFeedback(null);
                                            }}
                                            className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Kosongkan teks email penerima"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                          <div className="pointer-events-none">
                                            {isStrictValid ? (
                                              hasInvalidCommonDomain ? (
                                                <CircleAlert className="w-4 h-4 text-amber-500" />
                                              ) : (
                                                <CircleCheck className="w-4 h-4 text-emerald-500" />
                                              )
                                            ) : hasJunkOutsideEmail ? (
                                              <Sparkles className="w-4 h-4 text-amber-500" />
                                            ) : (
                                              <CircleAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {isToFilled && isStrictValid && hasInvalidCommonDomain && (
                                      <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-amber-700">
                                        <TriangleAlert className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                        <span>Peringatan: format domain tidak valid atau tidak terdaftar dalam database umum (periksa kembali penulisan domain).</span>
                                      </div>
                                    )}
                                    {isToFilled && hasNoEmailAtAll && (
                                      <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-rose-600">
                                        <TriangleAlert className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                        <span>Tidak ada format email valid terdeteksi pada kolom ini (contoh format: nama@domain.com).</span>
                                      </div>
                                    )}
                                    {isToFilled && !isStrictValid && !hasNoEmailAtAll && hasJunkOutsideEmail && (
                                      <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-amber-700">
                                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                        <span>Teks mengandung data tambahan (nama/telepon/keterangan). Klik "Bersihkan" di atas atau lepas fokus untuk menyaring hanya email.</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Subjek Email */}
                              {(() => {
                                const isSubjectFilled = mailForm.subject.trim().length > 0;
                                return (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-mandiri-blue-700 uppercase tracking-wider">
                                        Subjek Email
                                      </label>
                                      <div className="flex items-center gap-2">
                                        {isSubjectFilled && (
                                          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                            <CircleCheck className="w-3 h-3 text-emerald-500" />
                                            Terisi
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="relative flex items-center">
                                      <input
                                        required
                                        type="text"
                                        value={mailForm.subject}
                                        onChange={e => setMailForm({ ...mailForm, subject: e.target.value })}
                                        className={cn(
                                          "w-full px-4 py-3 pr-16 bg-white border rounded-xl text-sm focus:outline-none transition-all font-semibold text-mandiri-text shadow-sm",
                                          !isSubjectFilled
                                            ? "border-slate-300 focus:ring-4 focus:ring-mandiri-blue-100/50 focus:border-mandiri-blue-600"
                                            : "border-emerald-500 bg-emerald-50/10 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600"
                                        )}
                                      />
                                      {isSubjectFilled && (
                                        <div className="absolute right-3 flex items-center gap-1.5 z-10">
                                          <button
                                            type="button"
                                            onClick={() => setMailForm(prev => ({ ...prev, subject: "" }))}
                                            className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Kosongkan subjek email"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                          <div className="pointer-events-none">
                                            <CircleCheck className="w-4 h-4 text-emerald-500" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {/* Email yang Terakhir Dikirim */}
                                    {lastSentEmail ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMailForm(prev => ({
                                            ...prev,
                                            to: lastSentEmail.to,
                                            subject: lastSentEmail.subject || prev.subject
                                          }));
                                          addLog("info", `Memuat kembali email terakhir: ${lastSentEmail.to}`);
                                        }}
                                        className="text-[10px] bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-full transition-all flex items-center justify-between gap-2.5 cursor-pointer text-left active:scale-98 mt-1 shadow-2xs group w-full"
                                        title="Klik untuk memuat kembali email tujuan terakhir"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <CheckCheck className="w-3 h-3" />
                                          </div>
                                          <span className="font-bold text-slate-900 truncate select-all text-[10.5px] leading-tight tracking-tight">
                                            {lastSentEmail.to}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[9px] font-semibold text-slate-400">
                                            {lastSentEmail.timestamp}
                                          </span>
                                          <span className="text-[8.5px] uppercase tracking-wider font-black bg-mandiri-blue-700 group-hover:bg-mandiri-blue-800 text-white px-3 py-1 rounded-full shadow-2xs transition-colors">
                                            GUNAKAN
                                          </span>
                                        </div>
                                      </button>
                                    ) : (
                                      <div className="text-[9.5px] font-medium text-slate-400 bg-slate-50/60 border border-dashed border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-2 mt-1 select-none">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="font-bold text-slate-400 text-[8.5px] uppercase">Terakhir Dikirim:</span>
                                        <span className="text-slate-400 italic text-[9px]">Belum ada riwayat email yang dikirim</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* 1:1 Authentic Email Draft Preview (100% Pure Auto-Fit Viewport) */}
                            <div className="flex flex-col gap-1.5">
                              {mailForm.message ? (
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                        Pratinjau Draf Email
                                      </span>
                                    </div>

                                    {/* Device View Mode Switcher */}
                                    <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDeviceMode("mobile")}
                                        className={cn(
                                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer",
                                          previewDeviceMode === "mobile"
                                            ? "bg-white text-slate-800 shadow-2xs"
                                            : "text-slate-500 hover:text-slate-800"
                                        )}
                                        title="Tampilan HP Penerima (Fluid 100%)"
                                      >
                                        <Smartphone className="w-2.5 h-2.5" />
                                        <span>HP</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDeviceMode("desktop")}
                                        className={cn(
                                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer",
                                          previewDeviceMode === "desktop"
                                            ? "bg-white text-slate-800 shadow-2xs"
                                            : "text-slate-500 hover:text-slate-800"
                                        )}
                                        title="Tampilan Desktop / Webmail"
                                      >
                                        <Monitor className="w-2.5 h-2.5" />
                                        <span>Desktop</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Preview Frame with conditional Mobile Mockup */}
                                  <div className={cn(
                                    "w-full transition-all duration-300 flex justify-center",
                                    previewDeviceMode === "mobile" ? "bg-slate-100/70 p-3 sm:p-4" : "bg-white p-0"
                                  )}>
                                    <div className={cn(
                                      "transition-all duration-300 overflow-hidden",
                                      previewDeviceMode === "mobile"
                                        ? "w-full max-w-[380px] bg-white rounded-2xl border-2 border-slate-300/80 shadow-md flex flex-col"
                                        : "w-full"
                                    )}>
                                      {previewDeviceMode === "mobile" && (
                                        <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-bold">
                                          <span>Gmail / Mail App</span>
                                          <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">100% Fluid</span>
                                        </div>
                                      )}
                                      <div 
                                        className="w-full bg-white relative overflow-hidden transition-[height] duration-200"
                                        style={{ height: `${draftPreviewHeight}px` }}
                                      >
                                        <iframe
                                          title="1:1 Email Recipient Draft Preview"
                                          srcDoc={formatHTMLForPreview(mailForm.message)}
                                          className="w-full h-full border-0 bg-white block"
                                          style={{ pointerEvents: 'none' }}
                                          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Empty state with quick navigation */
                                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-250 bg-slate-50/60 flex flex-col items-center justify-center text-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shadow-2xs">
                                    <Mail className="w-6 h-6" />
                                  </div>
                                  <div className="max-w-xs space-y-1">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                      Belum Ada Draf Email
                                    </h4>
                                    <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium">
                                      Gunakan rekomendasi dari <b>Claude Mythos</b> atau pilih dari koleksi <b>Templates</b> untuk memuat draf email ke sini.
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setTab("ai")}
                                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-250 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                      <ClaudeLogo className="w-4 h-4 shrink-0" animated={true} />
                                      <span>Buka Claude Mythos</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTab("templates")}
                                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Pilih Template</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick selection of saved templates */}
                          <div className="pt-2 flex flex-col gap-3">
                            {templates.length > 0 && (
                              <div className="flex flex-col gap-1.5 px-1">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Template Tersimpan</span>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                                  {templates.map(t => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => handleApplyTemplate(t)}
                                      className="shrink-0 group flex flex-col items-start p-2.5 bg-white border border-slate-200 rounded-xl hover:border-mandiri-blue-600 transition-all shadow-sm hover:shadow-mandiri-blue-100 active:scale-95 min-w-[80px] cursor-pointer"
                                    >
                                      <span className="text-[9px] font-black text-slate-800 group-hover:text-mandiri-blue-700 truncate w-full text-left">{t.name}</span>
                                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-left">{t.category}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Submit send button - Centered & Balanced Primary Action */}
                            <div className="w-full flex items-center justify-center pt-2 pb-1">
                              <motion.button
                                type="submit"
                                disabled={sending}
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={(e) => {
                                  triggerSendRipple(e as any);
                                }}
                                className="relative overflow-hidden w-full sm:max-w-md px-8 py-3.5 bg-gradient-to-b from-[#FFD700] via-[#FFC000] to-[#E6AC00] hover:from-[#FFDF33] hover:to-[#FFD700] text-white text-[11.5px] font-black rounded-2xl transition-all shadow-[0_15px_30px_-12px_rgba(255,192,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-[0.1em] border border-[#FFD700]/30 cursor-pointer select-none group mx-auto"
                              >
                                {/* Pulse wave ring effect on hover/active */}
                                <span className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 group-active:opacity-30 transition-opacity pointer-events-none" />

                                {/* Interactive Ripple Animations on Press/Click */}
                                <AnimatePresence>
                                  {sendRipples.map((ripple) => (
                                    <motion.span
                                      key={ripple.id}
                                      initial={{ scale: 0, opacity: 0.7 }}
                                      animate={{ scale: 4.5, opacity: 0 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.65, ease: "easeOut" }}
                                      style={{
                                        left: ripple.x,
                                        top: ripple.y,
                                        width: 80,
                                        height: 80,
                                        marginLeft: -40,
                                        marginTop: -40,
                                      }}
                                      className="absolute rounded-full bg-white/45 pointer-events-none blur-[1px]"
                                    />
                                  ))}
                                </AnimatePresence>

                                {/* Button Content */}
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                  {sending ? (
                                    <LoaderCircle className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <motion.span
                                      animate={sending ? { rotate: 360 } : {}}
                                      className="inline-flex"
                                    >
                                      <Send className="w-4 h-4 mx-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </motion.span>
                                  )}
                                  <span>{sending ? "Mengirim..." : "Kirim Sekarang"}</span>
                                </span>
                              </motion.button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2.2 Tab Templates */}
                {tab === "templates" && (
                  <motion.div
                    key="templates-tab"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="p-3 sm:p-4 max-w-7xl mx-auto pb-28 w-[95%] sm:w-full mobile-card-container"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 px-1">
                      <div>
                        <h2 className="text-base sm:text-xl font-black text-slate-950 tracking-tight">Templates Email</h2>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-bold">Gunakan template untuk kirim cepat</p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-48 flex items-center">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-mandiri-blue-100 outline-none transition-all"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Hapus pencarian"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        {templates.length > 0 && (
                          <button
                            onClick={handleClearAllTemplates}
                            className="px-2.5 h-9 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer text-[10px] font-bold"
                            title="Hapus Semua Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Hapus Semua</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveEditingTemplateId(null);
                            setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                            setIsTemplateModalOpen(true);
                          }}
                          className="w-9 h-9 bg-mandiri-blue-600 hover:bg-mandiri-blue-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-mandiri-blue-100 transition-all active:scale-90 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Grid of Templates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <AnimatePresence mode="popLayout">
                        {filteredTemplates.map(t => (
                          <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, scale: 0.94, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -12, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            className="bg-white border-2 border-white rounded-[28px] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,58,143,0.18)] hover:shadow-[0_30px_70px_-12px_rgba(0,58,143,0.35)] transition-all group hover:-translate-y-1 ring-1 ring-mandiri-blue-100/30"
                          >
                            <div className="p-6 flex flex-col h-full">
                              <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-mandiri-blue-100 text-mandiri-blue-800 text-[10px] font-extrabold uppercase rounded-full">
                                  {t.category}
                                </span>
                                <button
                                  onClick={() => handleDeleteTemplate(t.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <h3 className="font-extrabold text-slate-900 mb-1 leading-tight">{t.name}</h3>
                              <p className="text-xs text-slate-700 mb-6 font-bold line-clamp-2">{t.subject}</p>

                              <div className="mt-auto pt-6 border-t border-slate-100 flex gap-3">
                                {/* Edit draft */}
                                <button
                                  onClick={() => handleEditTemplateClick(t)}
                                  className="w-11 h-11 bg-slate-100 text-mandiri-blue-700 rounded-2xl hover:bg-mandiri-blue-50 transition-all flex items-center justify-center font-bold cursor-pointer"
                                  title="Edit Draft"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                                
                                {/* Preview */}
                                <button
                                  onClick={() => setPreviewTemplate(t)}
                                  className="w-11 h-11 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center font-bold cursor-pointer"
                                  title="Pratinjau"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>

                                {/* Send Test */}
                                <button
                                  onClick={() => {
                                    setTestTemplate(t);
                                    setTestRecipient(smtpConfig.senderEmail || smtpConfig.username || "");
                                  }}
                                  className="w-11 h-11 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center font-bold cursor-pointer"
                                  title="Kirim Tes"
                                >
                                  <Send className="w-4 h-4" />
                                </button>

                                {/* Use template */}
                                <button
                                  onClick={() => handleApplyTemplate(t)}
                                  className="flex-1 h-11 bg-mandiri-blue-600 text-white text-xs font-black rounded-2xl hover:bg-mandiri-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-mandiri-blue-600/20 cursor-pointer"
                                >
                                  PAKAI TEMPLATE
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {filteredTemplates.length === 0 && (
                        <motion.div
                          key="no-templates"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="py-20 text-center"
                        >
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <FileText className="w-8 h-8 text-slate-400" />
                          </div>
                          <h3 className="text-slate-900 font-black text-base">Belum Ada Template Tersimpan</h3>
                          <p className="text-xs text-slate-500 font-semibold mt-1">Mulai dengan membuat template email baru menggunakan tombol "+" di atas</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* 2.3 Tab Terminal */}
                {tab === "terminal" && (
                  <motion.div
                    key="terminal-tab"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="p-4 max-w-lg mx-auto h-full flex flex-col gap-4 w-[95%] sm:w-full mobile-card-container"
                  >
                    <div className="bg-[#020617] rounded-[24px] border border-slate-800 shadow-2xl flex flex-col h-[70vh] overflow-hidden">
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                        <div className="flex flex-col">
                          <h2 className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            RELAY CONSOLE
                          </h2>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-mandiri-blue-500 rounded-full animate-pulse" />
                            <span className="text-[9px] text-mandiri-blue-400 font-bold uppercase">Streaming live</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setLogs([])}
                          className="p-2.5 bg-slate-800 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Log Terminal List */}
                      <div className="p-4 flex-1 overflow-y-auto space-y-1 font-mono text-[11px] no-scrollbar">
                        {logs.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                            <Terminal className="w-8 h-8 opacity-20" />
                            <p className="italic text-xs font-semibold">Console idle...</p>
                          </div>
                        )}
                        {logs.map((log, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <span className="text-slate-500 shrink-0 select-none font-bold">[{log.timestamp}]</span>
                            <span
                              className={cn(
                                "leading-relaxed break-words",
                                log.type === "error" && "text-red-400 font-bold",
                                log.type === "success" && "text-emerald-400 font-bold",
                                log.type === "warning" && "text-amber-400 font-bold animate-pulse",
                                log.type === "info" && "text-slate-200",
                                !log.type && "text-slate-400"
                              )}
                            >
                              {log.message}
                            </span>
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>

                      <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center px-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Log Count: {logs.length}/50</span>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-mandiri-blue-500 rounded-full shadow-[0_0_8px_rgba(0,80,179,0.6)]" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GF-V104</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2.3.5 Tab AI Chat */}
                {tab === "ai" && (
                  <motion.div
                    key="ai-tab"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col flex-1 h-full w-full overflow-hidden p-0 m-0 bg-gradient-to-b from-[#EBF2F9] via-[#F4F7FB] to-white"
                  >
                    <div className="flex flex-col flex-1 h-full w-full overflow-hidden relative">
                      {/* Discreet Floating Back Button (No fixed top navigation bar, maximizing vertical chat space) */}
                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2 pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => setTab("send")}
                          className="p-2 sm:px-3 sm:py-2 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-xs backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold active:scale-95 group"
                          title="Kembali ke Kirim Email"
                        >
                          <ChevronLeft className="w-4.5 h-4.5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                          <span className="hidden sm:inline">Kembali</span>
                        </button>
                        {chatLoading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-amber-800 border border-amber-200/80 shadow-xs backdrop-blur-md"
                          >
                            <ClaudeLogo className="w-3.5 h-3.5" animated={true} />
                            <span>Claude memproses...</span>
                          </motion.div>
                        )}
                      </div>

                      {/* Modal Dialog for Custom Cancel Link (Clean & Non-intrusive) */}
                      <AnimatePresence>
                        {showCancelLinkSettings && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
                            onClick={() => setShowCancelLinkSettings(false)}
                          >
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0, y: 10 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              exit={{ scale: 0.95, opacity: 0, y: 10 }}
                              onClick={e => e.stopPropagation()}
                              className="bg-white rounded-3xl p-5 w-full max-w-sm border border-indigo-100 shadow-2xl space-y-3.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                                    <LinkIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                      Link Tombol Batal
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-semibold">
                                      Target URL untuk tombol &apos;Batalkan Transaksi&apos;
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowCancelLinkSettings(false)}
                                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                                  URL Tujuan:
                                </label>
                                <input
                                  type="url"
                                  value={customCancelLink}
                                  onChange={e => setCustomCancelLink(e.target.value)}
                                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all font-mono"
                                />
                                <p className="text-[9.5px] text-slate-500 leading-tight">
                                  * Biarkan kosong untuk menggunakan tautan default bank resmi.
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                {customCancelLink.trim() ? (
                                  <button
                                    type="button"
                                    onClick={() => setCustomCancelLink("")}
                                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                                  >
                                    Reset Default
                                  </button>
                                ) : <div />}
                                <button
                                  type="button"
                                  onClick={() => setShowCancelLinkSettings(false)}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-tight shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
                                >
                                  Simpan & Tutup
                                </button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Main Chat Conversation List (Spacious, Full-Screen & Responsive) */}
                      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pt-14 pb-4 space-y-4 max-w-4xl mx-auto w-full">
                        {/* Empty State Hero - Centered inside scroll area and smoothly exits when chat starts */}
                        <AnimatePresence>
                          {chatMessages.length === 0 && !chatLoading && (
                            <motion.div
                              key="ai-hero-empty"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="pt-8 sm:pt-14 pb-4 px-4 flex flex-col items-center justify-center text-center select-none shrink-0"
                            >
                              <div className="mb-3.5 flex items-center justify-center">
                                <ClaudeLogo className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" animated={true} />
                              </div>
                              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight leading-tight">
                                Claude Mythos
                              </h1>
                              <p className="text-xs sm:text-[13px] text-slate-600 mt-2 max-w-sm leading-relaxed px-2 font-normal">
                                Asisten AI cerdas untuk merancang email transaksi, kartu kredit, mutasi, dan korespondensi perbankan profesional.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {chatMessages.map((msg, index) => {
                          const parsed = parseMessageContent(msg.text);
                          return (
                            <motion.div
                              key={`chat-msg-${index}`}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className={cn(
                                "flex gap-2.5 max-w-full sm:max-w-[90%] transition-all",
                                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                              )}
                            >
                              {msg.role !== "user" && (
                                <div className="shrink-0 self-start mt-0.5 flex items-center justify-center">
                                  <ClaudeLogo className="w-6.5 h-6.5 shrink-0" animated={true} />
                                </div>
                              )}
                              <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                                {parsed.text && (
                                  msg.text.startsWith("Error:") ? (
                                    <div className="p-3 sm:p-3.5 rounded-2xl text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-xs shadow-2xs space-y-2.5">
                                      <div className="flex items-start gap-2">
                                        <TriangleAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                        <div className="flex-1 font-semibold leading-relaxed break-words [overflow-wrap:anywhere]">
                                          {parsed.text.replace(/^Error:\s*/, "")}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 pt-1.5 border-t border-rose-100">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const prevUserMsg = [...chatMessages.slice(0, index)].reverse().find(m => m.role === "user");
                                            if (prevUserMsg) {
                                              handleSendChatMessage(undefined, prevUserMsg.text);
                                            }
                                          }}
                                          className="w-full sm:w-auto px-3.5 py-2 min-h-[36px] bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          <span>Coba Kirim Ulang</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        "px-4 py-3 rounded-2xl text-xs leading-relaxed font-semibold break-words [overflow-wrap:anywhere] max-w-full shadow-2xs",
                                        msg.role === "user"
                                          ? "bg-gradient-to-r from-mandiri-blue-600 to-mandiri-blue-700 text-white rounded-tr-xs shadow-mandiri-blue-600/15"
                                          : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs"
                                      )}
                                    >
                                      {parsed.text}
                                    </div>
                                  )
                                )}
                                {parsed.html && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full flex flex-col gap-2.5 my-1"
                                  >
                                    {/* Clean Subject Bar (Without redundant badges) */}
                                    {parsed.subject && (
                                      <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
                                            Subjek:
                                          </span>
                                          <span className="text-xs font-bold text-slate-900 break-words [overflow-wrap:anywhere] select-all leading-snug">
                                            {parsed.subject}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(parsed.subject);
                                            addLog("info", `Subjek disalin: "${parsed.subject}"`);
                                          }}
                                          title="Salin subjek"
                                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer shrink-0"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Spacious Clean HTML Preview Frame */}
                                    <div className="w-full h-[400px] xs:h-[460px] sm:h-[520px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
                                      <iframe
                                        title={`Receipt Preview ${index}`}
                                        srcDoc={formatHTMLForPreview(parsed.html)}
                                        className="w-full h-full border-0 bg-white"
                                        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                                      />
                                    </div>

                                    {/* Clean Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleUseInSend(parsed.html, parsed.subject)}
                                        className="flex-1 py-2.5 px-4 min-h-[42px] bg-gradient-to-r from-mandiri-blue-600 to-mandiri-blue-700 hover:from-mandiri-blue-500 hover:to-mandiri-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-mandiri-blue-600/20 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                                      >
                                        <Send className="w-4 h-4 shrink-0" />
                                        <span>Gunakan Draf & Subjek</span>
                                      </button>

                                      <div className="grid grid-cols-3 sm:flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleRandomizeMessageRef(index)}
                                          title="Perbarui No. Referensi & Tanggal/Waktu transaksi mengikuti waktu sekarang"
                                          className="py-2.5 px-3 min-h-[42px] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 group"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5 text-mandiri-blue-600 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
                                          <span className="truncate">Acak Ref</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(forceInlineStylesToHtml(parsed.html));
                                            addLog("info", "Salin kode HTML (Force Inline 1:1) berhasil dilakukan.");
                                          }}
                                          title="Salin kode HTML"
                                          className="py-2.5 px-3 min-h-[42px] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                                        >
                                          <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                          <span className="truncate">Salin HTML</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleSaveAIAsTemplate(parsed.html, parsed.subject)}
                                          title="Simpan sebagai template"
                                          className="py-2.5 px-3 min-h-[42px] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                                        >
                                          <Bookmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                          <span className="truncate">Simpan</span>
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                        {chatLoading && (
                          <motion.div
                            key="chat-loading-bubble"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="flex gap-2.5 max-w-[85%] mr-auto"
                          >
                            <div className="shrink-0 self-start mt-0.5 flex items-center justify-center">
                              <ClaudeLogo className="w-6.5 h-6.5 shrink-0" animated={true} />
                            </div>
                            <div className="bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </motion.div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Clean Bank Quick Suggestions */}
                      {chatMessages.length <= 1 && (
                        <div className="max-w-4xl mx-auto w-full px-3 sm:px-5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                          {["BCA", "Mandiri", "BRI", "BNI", "CIMB", "UOB"].map((bank, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                setChatInput(`Buatkan bukti transaksi kartu kredit ${bank} untuk SHOPEE nominal Rp 5.000.000`);
                              }}
                              className="shrink-0 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                            >
                              {bank}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Chat Input form */}
                      <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-4 pt-3 pb-3 sm:pb-4 safe-area-bottom shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        <form onSubmit={handleSendChatMessage} className="max-w-4xl mx-auto flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearChat}
                            title="Bersihkan riwayat percakapan"
                            className="w-10 h-10 min-w-[40px] rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCancelLinkSettings(true)}
                            title="Konfigurasi URL Tombol Batalkan Transaksi"
                            className={cn(
                              "w-10 h-10 min-w-[40px] rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs",
                              customCancelLink.trim()
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                            )}
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>
                          <div className="relative flex-1 flex items-center">
                            <input
                              type="text"
                              placeholder="Ketik permintaan ke Claude Mythos (cth: BCA Shopee Rp 5.000.000)..."
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              disabled={chatLoading}
                              className="w-full px-4 py-3 pr-10 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white focus:border-amber-500 transition-all text-slate-800 disabled:opacity-50"
                            />
                            {chatInput && (
                              <button
                                type="button"
                                onClick={() => setChatInput("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Kosongkan chat input"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <button
                            type="submit"
                            disabled={!chatInput.trim() || chatLoading}
                            className={cn(
                              "w-11 h-11 min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 shrink-0",
                              chatInput.trim() && !chatLoading
                                ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-600/20"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed"
                            )}
                            title="Kirim pesan"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2.4 Tab Accounts */}
                {tab === "accounts" && (
                  <motion.div
                    key="accounts-tab"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="p-3 sm:p-4 max-w-lg mx-auto pb-28 w-[95%] sm:w-full mobile-card-container"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-mandiri-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-mandiri-blue-800/20">
                          <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-slate-900 leading-tight">Pengaturan SMTP</h2>
                          <p className="text-[11px] text-slate-500 font-medium">Akun pengirim email keluar</p>
                        </div>
                      </div>

                      {/* Quick Back to Send button if already connected */}
                      {smtpStatus.status === "connected" && (
                        <button
                          type="button"
                          onClick={() => setTab("send")}
                          className="px-3 py-1.5 bg-mandiri-blue-50 hover:bg-mandiri-blue-100 text-mandiri-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Mulai Kirim</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Live SMTP Connection Status Summary Banner */}
                      <div className={cn(
                        "p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs",
                        smtpStatus.status === "connected" && "bg-emerald-50/90 border-emerald-200 text-emerald-950",
                        smtpStatus.status === "disconnected" && "bg-rose-50/90 border-rose-200 text-rose-950",
                        smtpStatus.status === "checking" && "bg-amber-50/90 border-amber-200 text-amber-950",
                        smtpStatus.status === "unconfigured" && "bg-slate-50 border-slate-200 text-slate-800"
                      )}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                            smtpStatus.status === "connected" && "bg-emerald-600 text-white",
                            smtpStatus.status === "disconnected" && "bg-rose-600 text-white",
                            smtpStatus.status === "checking" && "bg-amber-500 text-white",
                            smtpStatus.status === "unconfigured" && "bg-slate-400 text-white"
                          )}>
                            {smtpStatus.status === "connected" ? (
                              <ShieldCheck className="w-5 h-5" />
                            ) : smtpStatus.status === "disconnected" ? (
                              <WifiOff className="w-4 h-4" />
                            ) : smtpStatus.status === "checking" ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Info className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black uppercase tracking-tight">
                                {smtpStatus.status === "connected"
                                  ? "SMTP Siap Digunakan"
                                  : smtpStatus.status === "disconnected"
                                  ? "Koneksi SMTP Terputus"
                                  : smtpStatus.status === "checking"
                                  ? "Sedang Memverifikasi..."
                                  : "SMTP Belum Dikonfigurasi"}
                              </h4>
                              {smtpStatus.status === "connected" && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-150 text-emerald-800 border border-emerald-300">
                                  ONLINE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium opacity-85 truncate mt-0.5">
                              {smtpStatus.status === "connected"
                                ? `Terhubung ke ${smtpConfig.host || "server"} (${smtpConfig.username || "Akun Aktif"})`
                                : smtpStatus.message || "Masukkan data akun di bawah"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => verifySmtpConnection(smtpConfig)}
                          disabled={smtpStatus.status === "checking"}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                          title="Cek ulang koneksi server"
                        >
                          <RefreshCw className={cn("w-3 h-3", smtpStatus.status === "checking" && "animate-spin")} />
                          <span className="hidden sm:inline">Cek Ulang</span>
                        </button>
                      </div>

                      {/* Clean Active State (when configured & connected) */}
                      {smtpStatus.status === "connected" && (
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Akun Terhubung</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              Terverifikasi
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Pengirim</span>
                              <span className="font-bold text-slate-800 break-words">{smtpConfig.fromName || "Tidak diatur (Default)"}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email / Akun</span>
                              <span className="font-bold text-slate-800 break-words">{smtpConfig.username || "-"}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Host & Port</span>
                              <span className="font-mono font-bold text-slate-800">{smtpConfig.host || "smtp.gmail.com"}:{smtpConfig.port || "587"}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Keamanan</span>
                              <span className="font-bold text-slate-800">{smtpConfig.connectionType || "STARTTLS"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={testSMTPConnection}
                              disabled={sending}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {sending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />}
                              <span>Kirim Email Uji Coba</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Main Form Card (Collapsible when connected, open when editing or not connected) */}
                      <details
                        open={smtpStatus.status !== "connected"}
                        className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                      >
                        <summary className="px-5 py-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-slate-100 list-none">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-mandiri-blue-600" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              {smtpStatus.status === "connected" ? "Ubah Konfigurasi Akun" : "Formulir Akun SMTP"}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 group-open:rotate-180 transition-transform">
                            ▼
                          </span>
                        </summary>

                        <div className="p-5 space-y-4">
                          {/* Nama Pengirim */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-slate-700 px-0.5">Nama Pengirim (Display Name)</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={smtpConfig.fromName}
                                onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                                className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-mandiri-blue-100 focus:border-mandiri-blue-600 transition-all shadow-2xs"
                              />
                              {smtpConfig.fromName && (
                                <button
                                  type="button"
                                  onClick={() => setSmtpConfig(prev => ({ ...prev, fromName: "" }))}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Kosongkan nama pengirim"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Email Login / Username */}
                          <div className="flex flex-col gap-1.5" id="smtp-username-field">
                            <label className="text-[11px] font-bold text-slate-700 px-0.5">Username / Alamat Email</label>
                            <div className="relative flex items-center">
                              <input
                                type="email"
                                value={smtpConfig.username}
                                onChange={e => {
                                  const val = e.target.value;
                                  const rec = getSmartSmtpSettings(val);
                                  if (rec) {
                                    setSmtpConfig({
                                      ...smtpConfig,
                                      username: val,
                                      senderEmail: val,
                                      host: rec.host,
                                      port: rec.port,
                                      connectionType: rec.connectionType,
                                      dailyLimit: rec.dailyLimit
                                    });
                                  } else {
                                    setSmtpConfig({
                                      ...smtpConfig,
                                      username: val,
                                      senderEmail: val
                                    });
                                  }
                                }}
                                className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-mandiri-blue-100 focus:border-mandiri-blue-600 transition-all shadow-2xs"
                              />
                              {smtpConfig.username && (
                                <button
                                  type="button"
                                  onClick={() => setSmtpConfig(prev => ({ ...prev, username: "", senderEmail: "" }))}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Kosongkan username SMTP"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>

                            {/* Minimal Dynamic Notification for Auto-Detected Domain */}
                            {loadingDns && (
                              <div className="mt-1.5 px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 font-bold flex items-center gap-2 animate-pulse">
                                <Activity className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                                <span>Mendeteksi setelan server email...</span>
                              </div>
                            )}

                            {!loadingDns && dnsLookupResult?.success && (
                              <div className="mt-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-800 font-bold flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Server: <b className="font-mono">{dnsLookupResult.smtp.host}</b> ({dnsLookupResult.smtp.port})</span>
                                </div>
                                {smtpConfig.host !== dnsLookupResult.smtp.host && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSmtpConfig({
                                        ...smtpConfig,
                                        host: dnsLookupResult.smtp.host,
                                        port: dnsLookupResult.smtp.port,
                                        connectionType: dnsLookupResult.smtp.connectionType as any,
                                        dailyLimit: dnsLookupResult.smtp.dailyLimit
                                      });
                                    }}
                                    className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[9px] font-black uppercase shrink-0"
                                  >
                                    Terapkan
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* App Password / Password */}
                          {(() => {
                            const passCheck = validateAppPasswordFormat(smtpConfig.password || "", smtpConfig.username || "");
                            const isGmailOrYahoo = passCheck.isGmailOrYahoo;

                            return (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between px-0.5">
                                  <label className="text-[11px] font-bold text-slate-700">
                                    App Password / Password SMTP
                                  </label>
                                  {isGmailOrYahoo && smtpConfig.password && (
                                    <span className={cn(
                                      "text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                                      passCheck.isExact16 
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    )}>
                                      {passCheck.isExact16 ? "16 Digit Valid" : `${passCheck.length}/16 Karakter`}
                                    </span>
                                  )}
                                </div>

                                <div className="relative">
                                  <input
                                    type="text"
                                    value={smtpConfig.password}
                                    onChange={e => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                    className={cn(
                                      "w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none transition-all shadow-2xs",
                                      isGmailOrYahoo && smtpConfig.password
                                        ? passCheck.isExact16
                                          ? "border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                          : "border-amber-300 focus:ring-2 focus:ring-amber-100"
                                        : "border-slate-200 focus:ring-2 focus:ring-mandiri-blue-100 focus:border-mandiri-blue-600"
                                    )}
                                  />
                                </div>

                                {isGmailOrYahoo && smtpConfig.password && passCheck.hasSpaces && (
                                  <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg mt-0.5">
                                    <span className="text-slate-600">Ada spasi pada password (otomatis dibersihkan)</span>
                                    <button
                                      type="button"
                                      onClick={() => setSmtpConfig({ ...smtpConfig, password: passCheck.clean })}
                                      className="text-[9px] font-black uppercase text-mandiri-blue-600 hover:underline cursor-pointer"
                                    >
                                      Hapus Spasi
                                    </button>
                                  </div>
                                )}

                                {passCheck.isGmail && (
                                  <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex flex-col gap-2 mt-1 shadow-2xs">
                                    <div className="flex items-start gap-2">
                                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                      <div className="text-[11px] text-blue-900 leading-relaxed">
                                        <span className="font-bold">Solusi Error 535 untuk Akun Gmail:</span>
                                        <p className="mt-0.5 text-blue-800">
                                          Google menolak password akun biasa. Pastikan <b>Verifikasi 2 Langkah (2FA)</b> aktif di akun Google Anda, lalu buat <b>Sandi Aplikasi (16 huruf)</b>.
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1.5 border-t border-blue-200/60">
                                      <a 
                                        href="https://myaccount.google.com/apppasswords" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Buat Sandi Aplikasi di Google ↗</span>
                                      </a>
                                      <span className="text-[10px] text-blue-600 font-mono font-medium">16 Karakter</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Action Buttons */}
                          <div className="pt-2 flex gap-3">
                            <button
                              type="button"
                              onClick={testSMTPConnection}
                              disabled={sending || !smtpConfig.username || !smtpConfig.password}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                              {sending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />}
                              <span>Uji Koneksi</span>
                            </button>
                            <button
                              type="button"
                              onClick={saveSMTPConfig}
                              className="flex-1 py-2.5 bg-mandiri-blue-600 hover:bg-mandiri-blue-700 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-mandiri-blue-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <CircleCheck className="w-3.5 h-3.5" />
                              <span>Simpan Setelan</span>
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Template Dialog Overlays */}
            <AnimatePresence>
              {previewTemplate && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                  >
                    <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <div>
                        <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight">{previewTemplate.name}</h3>
                        <p className="text-[10px] text-slate-600 font-bold truncate">{previewTemplate.subject}</p>
                      </div>
                      <button onClick={() => setPreviewTemplate(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                        <Plus className="w-4 h-4 rotate-45 text-slate-500" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 bg-slate-100/50 flex flex-col">
                      <iframe
                        title="Template Preview"
                        srcDoc={formatHTMLForPreview(previewTemplate.message)}
                        className="w-full flex-1 min-h-[300px] border border-slate-200 rounded-xl shadow-inner bg-white"
                        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                      />
                    </div>

                    <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
                      <button onClick={() => setPreviewTemplate(null)} className="flex-1 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer">
                        TUTUP
                      </button>
                      <button
                        onClick={() => {
                          handleApplyTemplate(previewTemplate);
                          setPreviewTemplate(null);
                        }}
                        className="flex-1 py-2.5 bg-mandiri-blue-600 text-white text-[10px] font-bold rounded-xl hover:bg-mandiri-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-mandiri-blue-100 cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> GUNAKAN KONTEN
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {testTemplate && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-white w-full max-w-[300px] rounded-2xl shadow-2xl p-5"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-tight">Kirim Email Percobaan</h3>
                      <button onClick={() => setTestTemplate(null)} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-700 mb-4 bg-slate-100 p-2 rounded-lg border border-slate-200 font-medium">
                      Mengirim: <span className="font-black text-mandiri-blue-700">{testTemplate.name}</span>
                    </p>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ml-1">Alamat Penerima</label>
                        <div className="relative flex items-center">
                          <input
                            type="email"
                            value={testRecipient}
                            onChange={e => setTestRecipient(e.target.value)}
                            className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-mandiri-blue-600 focus:ring-2 focus:ring-mandiri-blue-100 transition-all font-bold text-slate-900"
                            autoFocus
                          />
                          {testRecipient && (
                            <button
                              type="button"
                              onClick={() => setTestRecipient("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Kosongkan input penerima tes"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        disabled={sending || !testRecipient}
                        onClick={async () => {
                          const done = await sendEmailPacket(testRecipient, testTemplate.subject, testTemplate.message, true);
                          if (done) setTestTemplate(null);
                        }}
                        className="w-full py-3 bg-mandiri-blue-600 hover:bg-mandiri-blue-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-mandiri-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98 uppercase tracking-wider"
                      >
                        {sending ? (
                          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        {sending ? "SEDANG MENGIRIM..." : "KIRIM TES SEKARANG"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Edit or Add Template Modal */}
              {isTemplateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <h3 className="text-lg font-black text-slate-950 tracking-tight">
                        {activeEditingTemplateId ? "Edit Template" : "Template Baru"}
                      </h3>
                      <button
                        onClick={() => {
                          setIsTemplateModalOpen(false);
                          setActiveEditingTemplateId(null);
                          setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                      >
                        <Plus className="w-6 h-6 rotate-45" />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6 no-scrollbar bg-slate-50/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">Nama Template</label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={templateForm.name}
                              onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                              className="w-full px-4 py-3.5 pr-10 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-mandiri-blue-50 focus:border-mandiri-blue-600 transition-all font-bold text-slate-950"
                            />
                            {templateForm.name && (
                              <button
                                type="button"
                                onClick={() => setTemplateForm(prev => ({ ...prev, name: "" }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Kosongkan nama template"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">Kategori</label>
                          <select
                            value={templateForm.category}
                            onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })}
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-mandiri-blue-50 focus:border-mandiri-blue-600 transition-all font-bold text-slate-950 appearance-none"
                          >
                            <option value="General">General</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Support">Support</option>
                            <option value="Personal">Personal</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">Subjek Bawaan</label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={templateForm.subject}
                            onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })}
                            className="w-full px-4 py-3.5 pr-10 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-mandiri-blue-50 focus:border-mandiri-blue-600 transition-all font-bold text-slate-950"
                          />
                          {templateForm.subject && (
                            <button
                              type="button"
                              onClick={() => setTemplateForm(prev => ({ ...prev, subject: "" }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Kosongkan subjek template"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">Isi Pesan (HTML / Rich Text)</label>
                        <RichTextEditor
                          value={templateForm.message}
                          onChange={val => setTemplateForm({ ...templateForm, message: val })}
                          minHeight="220px"
                        />
                      </div>
                    </div>

                    <div className="px-6 py-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
                      <button
                        onClick={handleSaveTemplate}
                        className="w-full sm:flex-1 py-4 bg-mandiri-blue-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-mandiri-blue-200 active:scale-[0.98] transition-all order-1 sm:order-2 cursor-pointer"
                      >
                        {activeEditingTemplateId ? "Perbarui Template" : "Simpan Template"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateForm({ name: "", category: "General", subject: "", message: "" })}
                        className="w-full sm:w-auto px-4 py-4 text-sm font-black text-rose-600 hover:bg-rose-50 rounded-2xl border border-rose-200 order-2 sm:order-1 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        title="Kosongkan seluruh isian template"
                      >
                        <Eraser className="w-4 h-4" />
                        <span>Bersihkan</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsTemplateModalOpen(false);
                          setActiveEditingTemplateId(null);
                          setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                        }}
                        className="w-full sm:w-auto px-6 py-4 text-sm font-black text-slate-500 hover:text-slate-800 order-3 sm:order-1 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Custom Confirm Modal */}
              {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-slate-100 relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-[3.5px] bg-gradient-to-r from-red-600 to-amber-500" />
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0 border border-red-100 animate-pulse">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 leading-none">
                          {confirmModal.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 font-bold leading-relaxed mb-6">
                        {confirmModal.message}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={confirmModal.onConfirm}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-2xl transition-all cursor-pointer shadow-lg shadow-red-100 flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 2.1.1 Floating Send Action Bar - Glides & Follows Virtual Keyboard on Mobile & Touch devices */}
            <AnimatePresence>
              {tab === "send" && (isKeyboardVisible || (isFormInputFocused && window.innerWidth < 1024)) && (
                <motion.div
                  id="floating-keyboard-send-bar"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  style={{ bottom: `${keyboardOffset}px` }}
                  className="fixed left-0 right-0 z-[70] bg-white/95 backdrop-blur-md border-t border-mandiri-blue-200/90 shadow-[0_-12px_35px_rgba(0,35,80,0.2)] px-3 py-2 flex items-center justify-between gap-2.5 transition-[bottom] duration-150 ease-out"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        (document.activeElement as HTMLElement)?.blur();
                      }}
                      className="flex items-center gap-1 px-2.5 py-2 text-slate-600 hover:text-slate-900 bg-slate-100/90 active:bg-slate-200 rounded-xl text-[10px] font-bold transition-all shrink-0 cursor-pointer border border-slate-200/70"
                      title="Sembunyikan Keyboard"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-slate-600" />
                      <ChevronDown className="w-3 h-3 text-slate-500 -ml-0.5" />
                    </button>

                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="text-[10px] font-black text-slate-800 truncate">
                          {mailForm.to.trim() ? `Ke: ${mailForm.to.split(/[,;\s]+/)[0]}` : "Penerima Belum Diisi"}
                        </span>
                      </div>
                      <span className="text-[8.5px] text-slate-400 font-semibold truncate">
                        {mailForm.subject.trim() ? mailForm.subject : "Subjek Kosong"}
                      </span>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    disabled={sending}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      triggerSendRipple(e as any);
                      handleMainFormSubmit();
                    }}
                    className="relative overflow-hidden shrink-0 px-5 py-2.5 bg-gradient-to-b from-[#FFD700] via-[#FFC000] to-[#E6AC00] hover:from-[#FFDF33] hover:to-[#FFD700] text-white text-[11px] font-black rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(255,192,0,0.6)] flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase tracking-wider border border-[#FFD700]/40 cursor-pointer select-none"
                  >
                    {/* Ripple animation inside floating button */}
                    <AnimatePresence>
                      {sendRipples.map((ripple) => (
                        <motion.span
                          key={ripple.id}
                          initial={{ scale: 0, opacity: 0.7 }}
                          animate={{ scale: 4.5, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.65, ease: "easeOut" }}
                          style={{
                            left: ripple.x,
                            top: ripple.y,
                            width: 60,
                            height: 60,
                            marginLeft: -30,
                            marginTop: -30,
                          }}
                          className="absolute rounded-full bg-white/45 pointer-events-none blur-[1px]"
                        />
                      ))}
                    </AnimatePresence>

                    {sending ? (
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{sending ? "Mengirim..." : "Kirim Sekarang"}</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Bottom Navigation Bar (Hidden on wide desktop screens with sidebar, or when keyboard is active on send tab, or on AI chat tab) */}
            {tab !== "ai" && (
              <nav className={cn(
                "lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-[60px] items-center justify-around z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-1 safe-area-bottom overflow-hidden transition-all duration-200",
                (tab === "send" && (isKeyboardVisible || isFormInputFocused)) ? "hidden pointer-events-none" : "flex"
              )}>
                <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-mandiri-blue-700 via-mandiri-blue-400 to-mandiri-blue-500 z-10" />
                {[
                  { id: "ai", icon: ClaudeLogo, label: "AI", isAi: true },
                  { id: "templates", icon: FileText, label: "Templates", isAi: false },
                  { id: "send", icon: Send, label: "Kirim", isAi: false },
                  { id: "terminal", icon: Terminal, label: "Terminal", isAi: false },
                  { id: "accounts", icon: Settings, label: "Akun", isAi: false }
                ].map(j => {
                  const isActive = tab === j.id;
                  return (
                    <button
                      key={j.id}
                      onClick={() => setTab(j.id)}
                      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <div className={cn(
                        "p-1.5 rounded-xl transition-all duration-200 relative flex items-center justify-center",
                        isActive 
                          ? j.isAi
                            ? "bg-amber-50 text-amber-700 shadow-sm"
                            : "bg-mandiri-blue-50 text-mandiri-blue-700 shadow-sm" 
                          : "text-slate-400 hover:text-slate-700"
                      )}>
                        {j.isAi ? (
                          <ClaudeLogo className="w-5 h-5 shrink-0" animated={isActive} />
                        ) : (
                          <j.icon className={cn(
                            "w-4.5 h-4.5 transition-transform", 
                            isActive && "scale-110"
                          )} />
                        )}
                      </div>
                      <span className={cn(
                        "text-[9.5px] font-black transition-all uppercase tracking-tight",
                        isActive
                          ? j.isAi
                            ? "text-amber-700 font-extrabold"
                            : "text-mandiri-blue-700 font-extrabold"
                          : "text-slate-500"
                      )}>
                        {j.label}
                      </span>
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabIndicator"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          className={cn(
                            "absolute bottom-0 w-8 h-1 rounded-t-full shadow-sm",
                            j.isAi ? "bg-amber-600" : "bg-mandiri-blue-600"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </main>
          </motion.div>
        </div>
      )}
    </div>
  );
}
