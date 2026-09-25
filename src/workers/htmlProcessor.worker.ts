// Web Worker for asynchronous background processing of heavy HTML email templates,
// regex replacement, force-inline CSS parsing, dynamic timestamp calculation, and reference synchronization.

export interface WorkerInputMessage {
  id: string;
  type: "PROCESS_HTML" | "SYNCHRONIZE_FIELDS" | "PARSE_MESSAGE_CONTENT" | "EXTRACT_SUBJECT" | "INLINE_STYLES" | "PREPARE_TEMPLATE";
  payload: {
    rawText?: string;
    htmlContent?: string;
    customSubject?: string;
    date?: string; // ISO string
    explicitRef?: string;
    options?: {
      refreshRef?: boolean;
      cancelLink?: string;
      nominal?: string;
    };
    autoRefresh?: boolean;
  };
}

export interface WorkerOutputMessage {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

const INDO_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const INDO_MONTHS_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function getFormattedDateTimeObj(date: Date = new Date()) {
  try {
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
  } catch {
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
}

function generateUniqueReference(context = "", _date: Date = new Date()) {
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

  const rand11 = Math.floor(10000000000 + Math.random() * 90000000000).toString();
  return `${prefix}-${rand11}`;
}

function replaceInnerCell(cellHtml: string, newVal: string): string {
  if (/([A-Za-z]{2,5}[-_][0-9]{6,20}|[A-Za-z0-9]{10,24})/i.test(cellHtml)) {
    return cellHtml.replace(/([A-Za-z]{2,5}[-_][0-9]{6,20}|[A-Za-z0-9]{10,24})/i, newVal);
  }
  if (/>\s*([^<]+?)\s*</.test(cellHtml)) {
    return cellHtml.replace(/>\s*[^<]+?\s*</, `>${newVal}<`);
  }
  return newVal;
}

function synchronizeDateTimeInHtml(htmlContent: string, date: Date = new Date()): string {
  if (!htmlContent) return htmlContent;
  const dt = getFormattedDateTimeObj(date);
  let res = htmlContent;

  const headerDateDivRegex = /<div\b([^>]*\bstyle=["'][^"']*?)>(\s*\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}:\d{2}\s*WIB\s*|\s*\[(?:TANGGAL_WAKTU_TRANSAKSI|TANGGAL_WAKTU_SLASH|TGL_WAKTU_SLASH)\]\s*)<\/div>/gi;
  if (headerDateDivRegex.test(res)) {
    res = res.replace(headerDateDivRegex, () => {
      return `<div style="text-align: center; font-size: 12px; font-weight: 500; color: #6b7280; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.4;">${dt.dateSlashTime}</div>`;
    });
  } else {
    res = res.replace(/\b\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}:\d{2}\s*WIB\b/g, dt.dateSlashTime);
    res = res.replace(/\[(?:TANGGAL_WAKTU_TRANSAKSI|TANGGAL_WAKTU_SLASH|TGL_WAKTU_SLASH)\]/gi, dt.dateSlashTime);
  }

  res = res.replace(/\[(?:TANGGAL_TRANSAKSI|TGL_TRANSAKSI)\]/gi, dt.dateFull);
  res = res.replace(/\{\{\s*(?:tanggal_transaksi|tgl_transaksi)\s*\}\}/gi, dt.dateFull);
  res = res.replace(/\[(?:TANGGAL_WAKTU|TGL_WAKTU|DATETIME|TANGGAL_DAN_WAKTU)\]/gi, dt.dateTimeShort);
  res = res.replace(/\{\{\s*(?:tanggal_waktu|tgl_waktu|datetime|tanggal_dan_waktu)\s*\}\}/gi, dt.dateTimeShort);
  res = res.replace(/\[(?:TANGGAL|TGL|DATE)\]/gi, dt.dateFull);
  res = res.replace(/\{\{\s*(?:tanggal|tgl|date)\s*\}\}/gi, dt.dateFull);
  res = res.replace(/\[(?:WAKTU_TRANSAKSI|JAM_TRANSAKSI|WAKTU|JAM|TIME)\]/gi, dt.timeShort);
  res = res.replace(/\{\{\s*(?:waktu_transaksi|jam_transaksi|waktu|jam|time)\s*\}\}/gi, dt.timeShort);

  const tableDateTimeRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Tanggal\s*(?:&amp;|&|\/)\s*Waktu|Date\s*(?:&amp;|&|\/)\s*Time)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
  if (tableDateTimeRowRegex.test(res)) {
    res = res.replace(tableDateTimeRowRegex, `$1${dt.dateTimeShort}$2`);
  }

  const tableDateRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Tanggal\s*Transaksi|Tgl\.?\s*Transaksi|Transaction\s*Date|Tanggal\s*Pembayaran|Tgl\.?\s*Pembayaran)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
  if (tableDateRowRegex.test(res)) {
    res = res.replace(tableDateRowRegex, `$1${dt.dateFull}$2`);
  }

  const tableTimeRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:Waktu\s*Transaksi|Jam\s*Transaksi|Waktu|Jam|Time)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
  if (tableTimeRowRegex.test(res)) {
    res = res.replace(tableTimeRowRegex, `$1${dt.timeShort}$2`);
  }

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
}

function randomizeReferenceInHtml(htmlContent: string, explicitRef?: string): string {
  if (!htmlContent) return htmlContent;
  const newRef = explicitRef || generateUniqueReference(htmlContent);
  let res = htmlContent;

  res = res.replace(/\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]/gi, newRef);
  res = res.replace(/\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/gi, newRef);

  const tableRefRowRegex = /(<tr\b[^>]*>(?:(?!<\/?(?:tr|table)\b)[\s\S])*?<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?(?:\bRef\b|No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/td>)[\s\S])*?<\/td>(?:\s*<td\b[^>]*>(?:(?!<\/td>)[\s\S])*?<\/td>)?\s*<td\b[^>]*>)(?:(?!<\/td>)[\s\S])*?(<\/td>\s*<\/tr>)/gi;
  if (tableRefRowRegex.test(res)) {
    res = res.replace(tableRefRowRegex, `$1${newRef}$2`);
  }

  const tableRegex = /(<(?:td|th)[^>]*>(?:(?!<\/(?:td|th)>)[\s\S])*?(?:\bRef\b|No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)(?:(?!<\/(?:td|th)>)[\s\S])*?<\/(?:td|th)>(?:\s*<(?:td|th)[^>]*>(?:(?!<\/(?:td|th)>)[\s\S])*?<\/(?:td|th)>)?\s*<(?:td|th)[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi;
  if (tableRegex.test(res)) {
    res = res.replace(tableRegex, (_match, p1, p2, p3) => {
      return `${p1}${replaceInnerCell(p2, newRef)}${p3}`;
    });
  }

  const inlineRegex = /((?:No\.?\s*Referensi|Nomor\s*Referensi|No\.?\s*Reff?\.?|Nomor\s*Reff?\.?|Kode\s*Referensi|ID\s*Referensi|Reference\s*No\.?|Reference\s*Number|Reference\s*ID|Ref\.?\s*No\.?|Ref\.?\s*Number|Ref\.?\s*ID|Ref\.?\s*#|No\.?\s*Transaksi|Nomor\s*Transaksi|ID\s*Transaksi|Kode\s*Transaksi|Transaction\s*ID|Transaction\s*No\.?|No\.?\s*Jurnal|Journal\s*No\.?|No\.?\s*Resi|No\.?\s*Bukti)\s*(?:[:=]|&nbsp;|\s)\s*(?:<[^>]+>\s*)*)([A-Za-z0-9\-_]{6,32})/gi;
  if (inlineRegex.test(res)) {
    res = res.replace(inlineRegex, (_match, p1) => {
      return `${p1}${newRef}`;
    });
  }

  return res;
}

function fallbackRegexForceInline(html: string): string {
  let res = html;
  res = res.replace(/<table\b([^>]*)>/gi, (_match, attrs) => {
    const tableStyles = "border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box;";
    if (/style=["']/i.test(attrs)) {
      return `<table${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tableStyles}$1`)}>`;
    }
    return `<table${attrs} style="${tableStyles}">`;
  });

  res = res.replace(/<td\b([^>]*)>/gi, (_match, attrs) => {
    const tdStyles = "-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-line-height-rule: exactly; box-sizing: border-box;";
    if (/style=["']/i.test(attrs)) {
      return `<td${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${tdStyles}$1`)}>`;
    }
    return `<td${attrs} style="${tdStyles}">`;
  });

  res = res.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
    const imgStyles = "-ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none;";
    if (/style=["']/i.test(attrs)) {
      return `<img${attrs.replace(/style=(["'])(.*?)\1/i, `style=$1$2; ${imgStyles}$1`)}>`;
    }
    return `<img${attrs} style="${imgStyles}">`;
  });

  return res;
}

function extractSubjectFromContent(text: string, html: string): string {
  if (text) {
    const matchSubjectText = text.match(/(?:📌\s*)?(?:\*\*|__)?\s*(?:Subjek|Subject)(?:\s*Rekomendasi|\s*Email)?\s*(?:\*\*|__)?\s*:\s*[`"']?([^\n`"'\*]+)/i);
    if (matchSubjectText && matchSubjectText[1] && matchSubjectText[1].trim()) {
      const cleanSubj = matchSubjectText[1].trim().replace(/^[`"']+|[`"']+$/g, '').trim();
      if (cleanSubj && cleanSubj !== "[SUBJEK_EMAIL]" && cleanSubj.length > 2) {
        return cleanSubj;
      }
    }
  }

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

    const matchMeta = html.match(/<meta\s+(?:name|property)=["'](?:email-subject|subject)["']\s+content=["'](.*?)["']/i);
    if (matchMeta && matchMeta[1] && matchMeta[1].trim()) {
      const cleanMeta = matchMeta[1].trim();
      if (cleanMeta && cleanMeta !== "[SUBJEK_EMAIL]") {
        return cleanMeta;
      }
    }

    if (html.includes("Central Asia") || html.includes("BCA") || (text && text.toLowerCase().includes("bca"))) {
      return "[Notifikasi Transaksi] Pembayaran Berhasil - BCA";
    }
    if (html.includes("Mandiri") || (text && text.toLowerCase().includes("mandiri"))) {
      return "[Notifikasi Transaksi] Transaksi Kartu Kredit Berhasil - Mandiri";
    }
    if (html.includes("BRI") || (text && text.toLowerCase().includes("bri"))) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - BRI";
    }
    if (html.includes("BNI") || (text && text.toLowerCase().includes("bni"))) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - BNI";
    }
    if (html.includes("CIMB") || (text && text.toLowerCase().includes("cimb"))) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - CIMB Niaga";
    }
    if (html.includes("UOB") || (text && text.toLowerCase().includes("uob"))) {
      return "[Notifikasi Transaksi] Transaksi Berhasil - UOB";
    }
  }

  return "Notifikasi Transaksi Kartu Kredit";
}

function parseMessageContent(rawText: string) {
  let text = rawText;
  let html = "";

  const matchHtmlBlock = text.match(/```html\s*([\s\S]*?)\s*```/i);
  if (matchHtmlBlock && matchHtmlBlock[1]) {
    html = matchHtmlBlock[1].trim();
    text = text.replace(matchHtmlBlock[0], "").trim();
  } else {
    const matchGenericBlock = text.match(/```([\s\S]*?)```/);
    if (
      matchGenericBlock &&
      matchGenericBlock[1] &&
      (matchGenericBlock[1].includes("<html") ||
        matchGenericBlock[1].includes("<!DOCTYPE") ||
        matchGenericBlock[1].includes("<div") ||
        matchGenericBlock[1].includes("<table"))
    ) {
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

  if (html && html.includes("[NO_REFERENSI]")) {
    const generatedRef = generateUniqueReference(html);
    html = html.replace(/\[NO_REFERENSI\]/g, generatedRef);
  }

  if (html && text) {
    text = text
      .replace(/(?:📌\s*)?(?:\*\*|__)?\s*(?:Subjek|Subject)(?:\s*Rekomendasi|\s*Email)?\s*(?:\*\*|__)?\s*:\s*[`"']?[^\n`"'\*]+[`"']?/gi, "")
      .trim();
  }

  return { text, html, subject };
}

function synchronizeDynamicFieldsInHtml(
  htmlContent: string,
  date: Date = new Date(),
  explicitRef?: string,
  options?: {
    refreshRef?: boolean;
    cancelLink?: string;
    nominal?: string;
  }
): string {
  if (!htmlContent) return htmlContent;
  let res = htmlContent;

  const shouldRefreshRef = explicitRef !== undefined ? true : (options?.refreshRef ?? false);
  if (shouldRefreshRef) {
    res = randomizeReferenceInHtml(res, explicitRef);
  } else if (
    /\[(?:NO_REFERENSI|NO_REF|REFERENCE_NO|NO_TRANSAKSI|REF_ID|KODE_REFERENSI|NOMOR_REFERENSI)\]|\{\{\s*(?:no_referensi|no_ref|reference_no|no_transaksi|ref_id|kode_referensi|nomor_referensi)\s*\}\}/i.test(
      res
    )
  ) {
    res = randomizeReferenceInHtml(res);
  }

  res = synchronizeDateTimeInHtml(res, date);

  if (options?.cancelLink && options.cancelLink.trim()) {
    const effectiveCancelLink = options.cancelLink.trim();
    const ctaBtnStyle =
      "display: inline-block; background-color: #005baa; color: #ffffff; padding: 10px 24px; font-weight: 900; font-size: 12px; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid #005baa; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; box-sizing: border-box;";
    res = res.replace(
      /(<a\b[^>]*\bhref=["'])([^"']*https?:\/\/[^"']*(?:pusat-layanan-keamanan-kartu-bca|batal|cancel)[^"']*|\[(?:LINK_PEMBATALAN|LINK)\])(["'][^>]*>)/gi,
      (_match, p1, _oldHref, p3) => {
        let updatedTag = `${p1}${effectiveCancelLink}${p3}`;
        if (/style=["']/i.test(updatedTag)) {
          updatedTag = updatedTag.replace(/style=(["'])(.*?)\1/i, `style="${ctaBtnStyle}"`);
        } else {
          updatedTag = updatedTag.replace(/>$/, ` style="${ctaBtnStyle}">`);
        }
        return updatedTag;
      }
    );
  }

  if (options?.nominal) {
    const nominalDivStyle =
      "text-align: center; font-size: 22px; font-weight: 800; color: #0066b2; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif, -apple-system; line-height: 1.2;";
    res = res.replace(/<div\b([^>]*\bstyle=["'][^"']*?)>(\s*Rp\s*[\d.,]+\s*|\s*\[(?:NOMINAL|JUMLAH)\]\s*)<\/div>/gi, () => {
      return `<div style="${nominalDivStyle}">${options.nominal}</div>`;
    });
    res = res.replace(/\[(?:NOMINAL|JUMLAH)\]/gi, options.nominal);
  }

  return fallbackRegexForceInline(res);
}

// Worker message router
self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const { id, type, payload } = event.data;
  try {
    const parsedDate = payload.date ? new Date(payload.date) : new Date();

    if (type === "PARSE_MESSAGE_CONTENT") {
      const result = parseMessageContent(payload.rawText || "");
      self.postMessage({ id, success: true, result });
    } else if (type === "SYNCHRONIZE_FIELDS") {
      const result = synchronizeDynamicFieldsInHtml(
        payload.htmlContent || "",
        parsedDate,
        payload.explicitRef,
        payload.options
      );
      self.postMessage({ id, success: true, result });
    } else if (type === "EXTRACT_SUBJECT") {
      const result = extractSubjectFromContent(payload.rawText || "", payload.htmlContent || "");
      self.postMessage({ id, success: true, result });
    } else if (type === "INLINE_STYLES") {
      const result = fallbackRegexForceInline(payload.htmlContent || "");
      self.postMessage({ id, success: true, result });
    } else if (type === "PREPARE_TEMPLATE") {
      const inlined = fallbackRegexForceInline(payload.htmlContent || "");
      const synced = synchronizeDynamicFieldsInHtml(inlined, parsedDate, payload.explicitRef, payload.options);
      const subject = payload.customSubject || extractSubjectFromContent("", synced);
      self.postMessage({ id, success: true, result: { html: synced, subject } });
    } else {
      self.postMessage({ id, success: false, error: "Unknown worker operation" });
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
