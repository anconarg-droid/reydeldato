export type EmailTypoSuggestion = {
  /** Email sugerido completo (mantiene el local-part). */
  suggestedEmail: string;
  /** Dominio detectado como typo. */
  fromDomain: string;
  /** Dominio sugerido. */
  toDomain: string;
};

function normalizeEmail(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Validación sintáctica básica (no verifica si el buzón existe).
 * - Rechaza espacios
 * - Requiere un '@' y al menos un '.'
 *
 * Preferí `validateRequiredPublicEmail` / `validateOptionalPublicEmail` en formularios
 * y APIs: rechazan dominios típicamente mal escritos (ej. gmail.co).
 */
export function isValidEmailFormat(value: string): boolean {
  const email = normalizeEmail(value);
  if (!email) return false;
  if (/\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const DOMAIN_TYPO_MAP: Record<string, string> = {
  // Gmail
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmaiil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaik.com": "gmail.com",

  // Hotmail / Outlook / Live
  "homail.com": "hotmail.com",
  "hotnail.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cm": "hotmail.com",
  "hotmai1.com": "hotmail.com",
  "hotmial.con": "hotmail.com",
  "outlook.con": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.cm": "outlook.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outloook.com": "outlook.com",
  "otulook.com": "outlook.com",
  "live.con": "live.com",
  "live.co": "live.com",
  "live.cm": "live.com",
  "liv.com": "live.com",

  // Yahoo
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.cm": "yahoo.com",
  "yahho.com": "yahoo.com",
  "yaoo.com": "yahoo.com",

  // iCloud
  "icloud.con": "icloud.com",
  "icloud.co": "icloud.com",
  "icloud.cm": "icloud.com",
  "icoud.com": "icloud.com",
  "iclod.com": "icloud.com",
  "me.con": "me.com",
  "me.co": "me.com",
  "me.cm": "me.com",

  // Proton
  "protonmail.con": "protonmail.com",
  "protonmail.co": "protonmail.com",
  "protonmail.cm": "protonmail.com",
  "protonmai.com": "protonmail.com",
  "protonmal.com": "protonmail.com",
  "proton.me.": "proton.me",

  // Zoho
  "zoho.con": "zoho.com",
  "zoho.co": "zoho.com",
  "zoho.cm": "zoho.com",

  // AOL
  "aol.con": "aol.com",
  "aol.co": "aol.com",
  "aol.cm": "aol.com",

  // Otros typos frecuentes de TLD
  "gmail.cim": "gmail.com",
  "gmail.cmo": "gmail.com",
  "hotmail.cim": "hotmail.com",
  "hotmail.cmo": "hotmail.com",
  "outlook.cmo": "outlook.com",
  "yahoo.cmo": "yahoo.com",
};

function splitEmail(email: string): { local: string; domain: string } | null {
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain) return null;
  return { local, domain };
}

/** TLD que casi siempre son errores al escribir .com / .cl */
const SUSPICIOUS_TLDS = new Set([
  "con",
  "cm",
  "cim",
  "cmo",
  "comm",
  "coom",
  "om",
  "c0m",
]);

/**
 * Proveedores de correo masivos que usan .com (o dominio propio), no .co como TLD final.
 * No afecta dominios corporativos tipo empresa.co (segundo nivel distinto).
 */
const WELL_KNOWN_MAIL_SLD_NOT_CO_TLD = new Set([
  "gmail",
  "googlemail",
  "hotmail",
  "yahoo",
  "outlook",
  "live",
  "msn",
  "icloud",
  "protonmail",
  "proton",
  "aol",
  "zoho",
  "gmx",
  "yandex",
  "mail",
]);

function validatePublicEmailNonEmpty(email: string):
  | { ok: true; normalized: string }
  | { ok: false; message: string } {
  if (/\s/.test(email)) {
    return { ok: false, message: "El correo no puede tener espacios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      message: "Escribí un correo con @ y dominio (ej. nombre@gmail.com).",
    };
  }

  const parts = splitEmail(email);
  if (!parts) {
    return { ok: false, message: "El formato del correo no es válido." };
  }

  const domain = parts.domain.replace(/\.+$/, "").toLowerCase();
  if (!domain) {
    return { ok: false, message: "Falta el dominio después de @." };
  }

  const typoTarget = DOMAIN_TYPO_MAP[domain];
  if (typoTarget) {
    return {
      ok: false,
      message: `El dominio parece incorrecto. Probá ${parts.local}@${typoTarget}`,
    };
  }

  const labels = domain.split(".").filter(Boolean);
  if (labels.length < 2) {
    return { ok: false, message: "El dominio del correo no es válido." };
  }

  const tld = labels[labels.length - 1].toLowerCase();
  if (tld.length < 2) {
    return {
      ok: false,
      message: "Revisá la terminación del dominio (.cl, .com, etc.).",
    };
  }
  if (SUSPICIOUS_TLDS.has(tld)) {
    return {
      ok: false,
      message:
        "Revisá la terminación del dominio: a veces se confunde .com con .con, .cm u otras.",
    };
  }

  const beforeTld = labels.length >= 2 ? labels[labels.length - 2].toLowerCase() : "";
  if (tld === "co" && WELL_KNOWN_MAIL_SLD_NOT_CO_TLD.has(beforeTld)) {
    return {
      ok: false,
      message: `Para ${beforeTld} el correo suele ser .com (ej. ${parts.local}@${beforeTld}.com).`,
    };
  }

  if (parts.local.length > 64) {
    return {
      ok: false,
      message: "La parte del correo antes de @ es demasiado larga.",
    };
  }
  if (domain.length > 253) {
    return { ok: false, message: "El dominio del correo es demasiado largo." };
  }
  if (
    parts.local.startsWith(".") ||
    parts.local.endsWith(".") ||
    parts.local.includes("..")
  ) {
    return {
      ok: false,
      message: "El correo tiene un formato inválido antes de @.",
    };
  }

  return { ok: true, normalized: email };
}

/** Correo obligatorio (panel, pasos que exigen email). */
export function validateRequiredPublicEmail(raw: string):
  | { ok: true; normalized: string }
  | { ok: false; message: string } {
  const email = normalizeEmail(raw);
  if (!email) {
    return { ok: false, message: "El correo electrónico es obligatorio." };
  }
  return validatePublicEmailNonEmpty(email);
}

/** Correo opcional: vacío acepta; si hay texto, misma regla estricta. */
export function validateOptionalPublicEmail(raw: string):
  | { ok: true; normalized: string }
  | { ok: false; message: string } {
  const email = normalizeEmail(raw);
  if (!email) {
    return { ok: true, normalized: "" };
  }
  return validatePublicEmailNonEmpty(email);
}

/**
 * Detecta errores comunes al escribir dominios (ej: gmal.com).
 * Solo retorna sugerencia si el formato base parece válido.
 */
export function getEmailTypoSuggestion(value: string): EmailTypoSuggestion | null {
  const email = normalizeEmail(value);
  if (!isValidEmailFormat(email)) return null;

  const parts = splitEmail(email);
  if (!parts) return null;

  const domain = parts.domain.replace(/\.+$/, ""); // tolera '.' al final
  const toDomain = DOMAIN_TYPO_MAP[domain] || null;
  if (!toDomain) return null;

  return {
    suggestedEmail: `${parts.local}@${toDomain}`,
    fromDomain: domain,
    toDomain,
  };
}

