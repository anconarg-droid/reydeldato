import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import {
  buildRevisarAbsoluteUrl,
  persistEmprendedorAccessToken,
} from "@/lib/revisarMagicLink";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function emailBasicoValido(raw: string): boolean {
  const t = s(raw);
  return t.length > 0 && t.includes("@");
}

export type NotifyEmprendimientoAprobadoEmailResult = {
  fichaPublicaUrl: string | null;
  panelUrl: string | null;
};

/**
 * Correo "Tu emprendimiento fue aprobado" tras publicar en sitio.
 * No lanza: errores solo a consola.
 * Si `panelUrlIfKnown` viene set (p. ej. tras `issueRevisarMagicLinkAfterPublish`), no se vuelve a persistir token.
 */
export async function notifyEmprendimientoAprobadoEmail(
  supabase: SupabaseClient,
  emprendedorId: string,
  options?: { nombreFallback?: string; panelUrlIfKnown?: string | null }
): Promise<NotifyEmprendimientoAprobadoEmailResult> {
  let fichaPublicaUrl: string | null = null;
  let panelUrl: string | null = s(options?.panelUrlIfKnown) || null;

  try {
    const { data: row } = await supabase
      .from("emprendedores")
      .select("slug, nombre_emprendimiento, email")
      .eq("id", emprendedorId)
      .maybeSingle();

    const baseSite =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:3000";
    const base = baseSite.replace(/\/$/, "");

    const slug =
      row && (row as { slug?: unknown }).slug != null
        ? s((row as { slug: unknown }).slug)
        : "";
    const nombre =
      row && (row as { nombre_emprendimiento?: unknown }).nombre_emprendimiento != null
        ? s((row as { nombre_emprendimiento: unknown }).nombre_emprendimiento)
        : s(options?.nombreFallback);
    const emailTo =
      row && (row as { email?: unknown }).email != null
        ? s((row as { email: unknown }).email)
        : "";

    if (slug) {
      fichaPublicaUrl = `${base}/emprendedor/${slug}`;
    }

    if (!panelUrl) {
      try {
        const { token } = await persistEmprendedorAccessToken(supabase, emprendedorId);
        panelUrl = buildRevisarAbsoluteUrl(token);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[notifyEmprendimientoAprobado] No se pudo emitir token de panel:", e);
      }
    }

    const safeNombre = nombre || "tu emprendimiento";

    if (!emailBasicoValido(emailTo)) {
      // eslint-disable-next-line no-console
      console.warn("[email][aprobacion] email invalido o ausente", {
        emprendedorId,
        email: emailTo,
      });
      return { fichaPublicaUrl, panelUrl };
    }

    const fichaLinkHtml = fichaPublicaUrl
      ? `<p>Podés ver tu ficha pública acá: <a href="${fichaPublicaUrl}">${fichaPublicaUrl}</a></p>`
      : "";
    const panelLinkHtml = panelUrl
      ? `<p>Para editar tu ficha y acceder al panel, usá este enlace: <a href="${panelUrl}">${panelUrl}</a></p>`
      : "";

    const html = `<p>Hola,</p>

<p>Tu emprendimiento <strong>${safeNombre}</strong> ya fue aprobado y publicado en <strong>Rey del Dato</strong>.</p>

${fichaLinkHtml}

${panelLinkHtml}

<p>Desde tu panel puedes:</p>
<ul>
  <li>Editar tu información</li>
  <li>Subir fotos</li>
  <li>Mejorar tu perfil</li>
</ul>

<p>Mientras más completo tu perfil, más confianza generas.</p>

<p>— Equipo Rey del Dato</p>`;

    // eslint-disable-next-line no-console
    console.log("[email][aprobacion] intentando enviar", {
      emprendedorId,
      email: emailTo,
      nombre: safeNombre,
    });

    const enviadoOk = await sendEmail({
      to: emailTo,
      subject: "Tu emprendimiento fue aprobado",
      html,
    });

    if (enviadoOk) {
      // eslint-disable-next-line no-console
      console.log("[email][aprobacion] enviado", {
        emprendedorId,
        email: emailTo,
        nombre: safeNombre,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error("[email][aprobacion] fallo", {
        emprendedorId,
        email: emailTo,
        nombre: safeNombre,
        error: "sendEmail no confirmó envío (omitido, API o error Resend; ver logs [email])",
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[notifyEmprendimientoAprobado] Error preparando email:", e);
  }

  return { fichaPublicaUrl, panelUrl };
}
