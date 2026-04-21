/**
 * Validación y normalización de Instagram y sitio web para fichas públicas.
 * WhatsApp Chile: ver `utils/phone.ts` (`normalizeAndValidateChileWhatsappStrict`).
 */

import { validateOptionalPublicEmail } from "@/lib/validateEmail";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";

const IG_HANDLE = /^[a-z0-9._]{1,30}$/;

const MSG_WA_PRINCIPAL =
  "WhatsApp principal no válido. En Chile son 9 dígitos móviles: 912345678, 56912345678 o +56912345678 (sin dígitos de más).";

const MSG_WA_SEC =
  "WhatsApp adicional no válido. Mismo formato que el principal (celular chileno).";

/**
 * Instagram: usuario tipo @cuenta o URL de perfil. Sin espacios.
 * Se guarda el handle en minúsculas, sin @.
 */
export function validateOptionalInstagram(raw: string):
  | { ok: true; normalized: string }
  | { ok: false; message: string } {
  const t = String(raw ?? "").trim();
  if (!t) return { ok: true, normalized: "" };

  let handle = t.replace(/^@+/, "").trim();
  if (!handle) {
    return {
      ok: false,
      message:
        "Instagram: escribí tu usuario (ej. elmecanico) o el enlace del perfil, sin espacios.",
    };
  }

  if (/^https?:\/\//i.test(t) || /instagram\.com/i.test(t)) {
    try {
      const urlStr = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
      const u = new URL(urlStr);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (!host.endsWith("instagram.com")) {
        return {
          ok: false,
          message:
            "Instagram: usá tu usuario o un enlace que sea de instagram.com.",
        };
      }
      const parts = u.pathname
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean);
      const seg = parts[0];
      if (
        !seg ||
        seg === "p" ||
        seg === "reel" ||
        seg === "reels" ||
        seg === "stories" ||
        seg === "explore"
      ) {
        return {
          ok: false,
          message:
            "Instagram: pegá el enlace de tu perfil (no de un post o reel) o solo el usuario.",
        };
      }
      handle = (seg.split("?")[0] ?? seg).trim();
    } catch {
      return { ok: false, message: "Instagram: enlace no válido." };
    }
  }

  if (/\s/.test(handle)) {
    return {
      ok: false,
      message: "Instagram: el usuario no puede tener espacios (ej. elmecanico12).",
    };
  }

  const handleLower = handle.toLowerCase();
  if (!IG_HANDLE.test(handleLower)) {
    return {
      ok: false,
      message:
        "Instagram: solo letras, números, punto y guión bajo; máximo 30 caracteres.",
    };
  }

  return { ok: true, normalized: handleLower };
}

/**
 * Corrige el caso en que escribieron `wwwalgo.tld` sin punto tras `www`
 * (ej. `wwwmopnvent.com` → `www.mopnvent.com`). No altera `www.ejemplo.com`.
 */
export function fixWwwConcatenatedTypo(host: string): string {
  const h = String(host ?? "")
    .replace(/\.$/, "")
    .toLowerCase()
    .trim();
  if (!h || !h.includes(".") || h.includes(":")) return host;

  const parts = h.split(".").filter(Boolean);
  if (parts.length < 2) return host;

  const first = parts[0];
  if (first.length <= 3 || !first.startsWith("www") || first.includes(".")) {
    return host;
  }

  const afterWww = first.slice(3);
  if (afterWww.length < 3 || !/^[a-z]/i.test(afterWww[0] ?? "")) {
    return host;
  }

  parts.shift();
  parts.unshift("www", afterWww);
  return parts.join(".");
}

/**
 * Sitio web con dominio real (debe incluir punto en el host, ej. .cl).
 * Rechaza comas, espacios y hosts inválidos.
 */
export function validateOptionalWebsite(raw: string):
  | { ok: true; normalized: string }
  | { ok: false; message: string } {
  const t = String(raw ?? "").trim();
  if (!t) return { ok: true, normalized: "" };

  if (/[\s,<>"']/.test(t)) {
    return {
      ok: false,
      message:
        "Web: no uses espacios ni comas. Ejemplo: elmecanico.cl o www.elmecanico.cl",
    };
  }

  let urlStr = t;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return {
      ok: false,
      message: "Web: dirección no válida (ej. https://elmecanico.cl).",
    };
  }

  const hostCorregido = fixWwwConcatenatedTypo(parsed.hostname);
  if (hostCorregido !== parsed.hostname) {
    try {
      const portPart =
        parsed.port && !["80", "443"].includes(parsed.port)
          ? `:${parsed.port}`
          : "";
      parsed = new URL(
        `${parsed.protocol}//${hostCorregido}${portPart}${parsed.pathname}${parsed.search}${parsed.hash}`
      );
      urlStr = parsed.href;
    } catch {
      /* seguir con host original */
    }
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      message: "Web: no incluyas usuario ni contraseña en el enlace.",
    };
  }

  const host = parsed.hostname.replace(/\.$/, "").toLowerCase();
  if (!host) {
    return { ok: false, message: "Web: falta el dominio (ej. tunegocio.cl)." };
  }

  if (host.includes("..") || /[,;<>]/.test(host)) {
    return { ok: false, message: "Web: el dominio no es válido." };
  }

  if (!host.includes(".") && host !== "localhost") {
    return {
      ok: false,
      message: "Web: incluí el dominio con su terminación (ej. .cl, .com).",
    };
  }

  const labels = host.split(".");
  if (labels.some((l) => !l || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(l))) {
    return {
      ok: false,
      message: "Web: revisá que el dominio esté bien escrito (sin caracteres raros).",
    };
  }

  const tld = labels[labels.length - 1] ?? "";
  if (tld.length < 2) {
    return { ok: false, message: "Web: la terminación del dominio no es válida." };
  }

  /**
   * `algo.co` o `www.algo.co` suele ser error por `.com`. En Colombia lo habitual es
   * `algo.com.co`, `algo.gov.co`, etc. (segundo nivel antes de `.co`).
   */
  if (tld === "co") {
    const secondLevel = labels.length >= 2 ? labels[labels.length - 2].toLowerCase() : "";
    const coSecondLevels = new Set([
      "com",
      "net",
      "org",
      "edu",
      "gov",
      "mil",
      "gob",
      "nom",
    ]);
    if (!coSecondLevels.has(secondLevel)) {
      return {
        ok: false,
        message:
          "Web: los dominios que terminan solo en .co (ej. tunegocio.co) se confunden con .com. En Chile usá .cl o .com; en Colombia lo habitual es .com.co (ej. tunegocio.com.co).",
      };
    }
  }

  let href = parsed.href;
  if (href.endsWith("/") && (parsed.pathname === "/" || parsed.pathname === "")) {
    href = href.replace(/\/+$/, "");
  }

  return { ok: true, normalized: href };
}

/**
 * Normaliza y valida campos de contacto en PATCH de postulación/borrador.
 * Deja `whatsapp_principal` en forma 569XXXXXXXX si se envía; valida duplicado secundario.
 */
export function normalizePostulacionContactoPatch(
  patch: Record<string, unknown>,
  existing: Record<string, unknown>
): { ok: true; patch: Record<string, unknown> } | { ok: false; message: string } {
  const next = { ...patch };

  let principalNormForDup: string | null = null;

  if (Object.prototype.hasOwnProperty.call(next, "whatsapp_principal")) {
    const w = String(next.whatsapp_principal ?? "").trim();
    if (w) {
      const v = normalizeAndValidateChileWhatsappStrict(w);
      if (!v.ok) return { ok: false, message: MSG_WA_PRINCIPAL };
      next.whatsapp_principal = v.normalized;
      principalNormForDup = v.normalized;
    }
  }

  if (
    principalNormForDup === null &&
    Object.prototype.hasOwnProperty.call(next, "whatsapp_secundario")
  ) {
    const exP = String(existing.whatsapp_principal ?? "").trim();
    if (exP) {
      const pv = normalizeAndValidateChileWhatsappStrict(exP);
      if (!pv.ok) return { ok: false, message: MSG_WA_PRINCIPAL };
      principalNormForDup = pv.normalized;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, "whatsapp_secundario")) {
    const raw = next.whatsapp_secundario;
    if (raw === null) {
      next.whatsapp_secundario = null;
    } else {
      const ws = String(raw ?? "").trim();
      if (!ws) {
        next.whatsapp_secundario = null;
      } else {
        const v = normalizeAndValidateChileWhatsappStrict(ws);
        if (!v.ok) return { ok: false, message: MSG_WA_SEC };
        const p =
          principalNormForDup ??
          (() => {
            const ex = String(existing.whatsapp_principal ?? "").trim();
            if (!ex) return "";
            const pv = normalizeAndValidateChileWhatsappStrict(ex);
            return pv.ok ? pv.normalized : "";
          })();
        if (p && v.normalized === p) {
          return {
            ok: false,
            message: "El WhatsApp adicional no puede ser igual al principal.",
          };
        }
        next.whatsapp_secundario = v.normalized;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, "instagram")) {
    const ig = validateOptionalInstagram(String(next.instagram ?? ""));
    if (!ig.ok) return { ok: false, message: ig.message };
    next.instagram = ig.normalized ? ig.normalized : null;
  }

  if (Object.prototype.hasOwnProperty.call(next, "sitio_web")) {
    const wv = validateOptionalWebsite(String(next.sitio_web ?? ""));
    if (!wv.ok) return { ok: false, message: wv.message };
    next.sitio_web = wv.normalized ? wv.normalized : null;
  }

  if (Object.prototype.hasOwnProperty.call(next, "email")) {
    const ev = validateOptionalPublicEmail(String(next.email ?? ""));
    if (!ev.ok) return { ok: false, message: ev.message };
    next.email = ev.normalized ? ev.normalized : null;
  }

  return { ok: true, patch: next };
}
