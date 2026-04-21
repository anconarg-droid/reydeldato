import { fixWwwConcatenatedTypo } from "@/lib/contactoPublicoValidation";
import {
  formatChileWhatsappDisplay,
  normalizeAndValidateChileWhatsappStrict,
} from "@/utils/phone";

export function buildWhatsappUrl(phone?: string) {
  if (!phone) return null;

  const raw = String(phone).trim();
  const strict = normalizeAndValidateChileWhatsappStrict(raw);
  const clean = strict.ok
    ? strict.normalized
    : raw.replace(/\D/g, "");

  if (!clean) return null;

  return `https://wa.me/${clean}`;
}

export function buildWhatsappUrlWithPrefill(
  phone: string | undefined,
  message: string
): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  const numeroLimpio = raw.replace(/\D/g, "");
  if (!numeroLimpio) return null;
  const m = String(message ?? "").trim();
  const mensajeCodificado = encodeURIComponent(m);
  return m
    ? `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`
    : `https://wa.me/${numeroLimpio}`;
}

export function buildInstagramUrl(user?: string) {
  if (!user) return null;

  const clean = String(user).trim().replace(/^@+/, "").split("/")[0]?.split("?")[0];
  if (!clean) return null;

  return `https://instagram.com/${encodeURIComponent(clean)}`;
}

export function buildWebsiteUrl(url?: string) {
  if (!url) return null;

  const t = String(url).trim();
  if (!t) return null;

  if (/^https?:\/\//i.test(t)) return t;

  return `https://${t}`;
}

export function formatWhatsappDisplay(phone?: string) {
  if (!phone) return "";

  const raw = String(phone).trim();
  const strict = normalizeAndValidateChileWhatsappStrict(raw);
  if (strict.ok) return formatChileWhatsappDisplay(strict.normalized);
  return raw;
}

/**
 * Segundo WhatsApp solo para ficha pública: no duplicar el principal; URL solo si es válido.
 */
export function publicWhatsappSecundarioParaFicha(
  principalRaw: string | undefined,
  secundarioRaw: string | undefined
): { url: string | null; display: string } {
  const priDigits = String(principalRaw ?? "").replace(/\D/g, "");
  const secStr = String(secundarioRaw ?? "").trim();
  if (!secStr) return { url: null, display: "" };
  const secDigits = secStr.replace(/\D/g, "");
  if (!secDigits || secDigits === priDigits) return { url: null, display: "" };
  const url = buildWhatsappUrl(secStr);
  if (!url) return { url: null, display: "" };
  return { url, display: formatWhatsappDisplay(secStr) };
}

export function formatInstagramDisplay(user?: string) {
  if (!user) return "";

  const h = String(user).trim().replace(/^@+/, "");
  if (!h) return "";
  return `@${h}`;
}

export function formatWebsiteDisplay(url?: string) {
  if (!url) return "";

  const raw = String(url).trim();
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    const hostFixed = fixWwwConcatenatedTypo(u.hostname);
    const port =
      u.port && u.port !== "80" && u.port !== "443" ? `:${u.port}` : "";
    const path =
      u.pathname && u.pathname !== "/" ? `${u.pathname}${u.search}${u.hash}` : `${u.search}${u.hash}`;
    return `${hostFixed}${port}${path}`;
  } catch {
    return raw.replace(/^https?:\/\//, "");
  }
}