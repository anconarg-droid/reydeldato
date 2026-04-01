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

