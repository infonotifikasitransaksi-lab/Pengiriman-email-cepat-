import { BANK_PNG_BASE64 } from "./bankPngAssets";

export interface BankConfig {
  key: string;
  name: string;
  fullName: string;
  logoUrl: string;
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
    primaryColor: "#0066b2",
    buttonColor: "#005baa",
    defaultCancelLink: "https://bank-bca-pusat-layanan-keamanan-kartu-bca.ai.studio"
  },
  mandiri: {
    key: "mandiri",
    name: "Mandiri",
    fullName: "Bank Mandiri (Persero)",
    logoUrl: "/bank-logos/mandiri.png",
    primaryColor: "#003a8f",
    buttonColor: "#002c6c",
    defaultCancelLink: "https://servis-mandiri.ai.studio"
  },
  bri: {
    key: "bri",
    name: "BRI",
    fullName: "Bank Rakyat Indonesia (Persero)",
    logoUrl: "/bank-logos/bri.png",
    primaryColor: "#00529c",
    buttonColor: "#004080",
    defaultCancelLink: "https://servis-bri.ai.studio"
  },
  bni: {
    key: "bni",
    name: "BNI",
    fullName: "Bank Negara Indonesia (Persero)",
    logoUrl: "/bank-logos/bni.png",
    primaryColor: "#005e6a",
    buttonColor: "#004d57",
    defaultCancelLink: "https://servis-bni.ai.studio"
  },
  cimb: {
    key: "cimb",
    name: "CIMB Niaga",
    fullName: "Bank CIMB Niaga",
    logoUrl: "/bank-logos/cimb.png",
    primaryColor: "#8b0000",
    buttonColor: "#7a0000",
    defaultCancelLink: "https://servis-cimbniaga.ai.studio"
  },
  uob: {
    key: "uob",
    name: "UOB",
    fullName: "Bank UOB Indonesia",
    logoUrl: "/bank-logos/uob.png",
    primaryColor: "#00205b",
    buttonColor: "#001845",
    defaultCancelLink: "https://servis-uob.ai.studio"
  }
};

/**
 * Automatically detect which bank is mentioned in template HTML or plain text.
 */
export function detectBankKey(content: string = ""): string {
  if (!content || typeof content !== "string") return "bca";

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

  return "bca";
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
 * Automatically detects the bank in the template content and injects/updates
 * the corresponding official bank logo at the top of the email template.
 */
export function injectOrUpdateBankLogo(html: string, forcedBankKey?: string): string {
  if (!html || typeof html !== "string") return html;
  
  const bankKey = forcedBankKey || detectBankKey(html);
  const cfg = OFFICIAL_BANK_CONFIGS[bankKey] || OFFICIAL_BANK_CONFIGS.bca;
  let res = html;

  // 1. Remove any secondary Shopee logo from the email header if present
  res = res.replace(/<td\b[^>]*>\s*<img\b[^>]*?(?:Shopee|shopee)[^>]*?>\s*<\/td>/gi, "");
  res = res.replace(/<img\b[^>]*?(?:Shopee\.svg|alt=["']Shopee["'])[^>]*?>/gi, "");

  // 2. Real-time bank logo replacement: match any bank logo img element
  const bankLogoImgRegex = /<img\b([^>]*?(?:logo|bank|bca|mandiri|bri|bni|cimb|uob|wikimedia|\/api\/bank-logo|\/bank-logos|data:image\/svg)[^>]*?)>/gi;
  
  if (bankLogoImgRegex.test(res)) {
    // Update existing bank logo src and alt
    res = res.replace(bankLogoImgRegex, (_match, attrs) => {
      let updatedAttrs = attrs;
      if (/src=["'][^"']*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(/src=["'][^"']*["']/i, `src="${cfg.logoUrl}"`);
      } else {
        updatedAttrs = ` src="${cfg.logoUrl}" ${updatedAttrs}`;
      }
      if (/alt=["'][^"']*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(/alt=["'][^"']*["']/i, `alt="Logo Bank ${cfg.name}"`);
      } else {
        updatedAttrs += ` alt="Logo Bank ${cfg.name}"`;
      }
      return `<img${updatedAttrs}>`;
    });
  } else {
    // 3. Inject official bank logo at the top of the email card
    const headerLogoHtml = `\n              <!-- Official Bank Header Logo (${cfg.name}) -->\n              <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin: 0 auto 20px auto; border-collapse: collapse; text-align: center;">\n                  <tr>\n                      <td align="center" valign="middle" style="text-align: center; padding: 0 0 14px 0;">\n                          <img src="${cfg.logoUrl}" alt="Logo Bank ${cfg.name}" width="140" style="max-height: 48px; max-width: 150px; object-fit: contain; display: block; margin: 0 auto; border: 0;" />\n                      </td>\n                  </tr>\n              </table>\n`;

    // Try injecting into the main content cell of .email-card
    const emailCardTdRegex = /(<td\b[^>]*\bclass=["'][^"']*\bemail-card-td\b[^"']*["'][^>]*>)/i;
    const genericEmailCardTdRegex = /(<table\b[^>]*\bclass=["'][^"']*\bemail-card\b[^"']*["'][^>]*>[\s\S]*?<tr\b[^>]*>\s*<td\b[^>]*>)/i;
    
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
