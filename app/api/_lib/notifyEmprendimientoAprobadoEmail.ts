import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import {
  buildRevisarAbsoluteUrl,
  persistEmprendedorAccessToken,
} from "@/lib/revisarMagicLink";
import { formatNombreEmprendimiento } from "@/lib/formatNombreEmprendimiento";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function emailBasicoValido(raw: string): boolean {
  const t = s(raw);
  return t.length > 0 && t.includes("@");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
      process.env.APP_BASE_URL?.trim() ||
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

    const nombreTrim = s(nombre);
    const nombreDisplay =
      formatNombreEmprendimiento(nombreTrim) || nombreTrim;
    const nombreEscaped = nombreDisplay ? escapeHtml(nombreDisplay) : "";
    const introLine = nombreDisplay
      ? `<p style="margin:0 0 16px 0;color:#4b5563;line-height:1.65;font-size:15px;">Tu negocio <strong style="color:#111827;">&ldquo;${nombreEscaped}&rdquo;</strong> ya está publicado en Rey del Dato.</p>`
      : `<p style="margin:0 0 16px 0;color:#4b5563;line-height:1.65;font-size:15px;">Tu negocio ya está publicado en Rey del Dato.</p>`;

    if (!emailBasicoValido(emailTo)) {
      // eslint-disable-next-line no-console
      console.warn("[email][aprobacion] email invalido o ausente", {
        emprendedorId,
        email: emailTo,
      });
      return { fichaPublicaUrl, panelUrl };
    }

    const panelCta = panelUrl
      ? `<a href="${panelUrl}" style="display:block;width:100%;box-sizing:border-box;text-align:center;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;line-height:1.3;border-radius:10px;padding:11px 18px;">Entrar a mi panel</a>`
      : "";

    const panelAyuda = `<div style="margin:8px 0 6px 0;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;padding:10px 12px;">
      <p style="margin:0 0 6px 0;color:#64748b;font-size:13px;font-weight:600;line-height:1.45;">Desde tu panel podrás:</p>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">&bull; Editar tu información<br />
&bull; Subir fotos<br />
&bull; Revisar visitas y contactos</p>
    </div>`;

    const fichaSecundaria =
      fichaPublicaUrl
        ? `<p style="margin:4px 0 14px 0;color:#64748b;font-size:13px;line-height:1.5;">También puedes ver tu ficha pública:<br />
<a href="${fichaPublicaUrl}" style="color:#0f766e;font-weight:600;text-decoration:underline;">Ver mi ficha pública</a></p>`
        : "";

    const bloqueConsejo = `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:14px 16px;margin:0 0 4px 0;">
      <p style="margin:0 0 8px 0;color:#92400e;font-size:14px;font-weight:800;line-height:1.35;">💡 Consejo</p>
      <p style="margin:0 0 10px 0;color:#78350f;font-size:14px;line-height:1.55;">Los negocios con fotos reales y una descripción clara suelen generar más confianza y recibir más contactos.</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#78350f;font-size:13px;line-height:1.5;">
        <li style="margin:0 0 6px 0;">Sube fotos reales de tu trabajo o local.</li>
        <li style="margin:0;">Mantén tu información actualizada.</li>
      </ul>
    </div>`;

    const footerExtra = `<div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 12px 0;color:#64748b;font-size:13px;line-height:1.55;">Si necesitas ayuda, puedes responder este correo o escribirnos por <a href="https://wa.me/56975949281" style="color:#0f766e;font-weight:600;">WhatsApp</a>.</p>
      <p style="margin:0 0 10px 0;color:#6b7280;font-size:13px;line-height:1.5;">— Equipo Rey del Dato</p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;">
        <a href="${base}/que-es" style="color:#0f766e;text-decoration:underline;">Qué es Rey del Dato</a>
        <span style="color:#cbd5e1;"> · </span>
        <a href="${base}/contacto" style="color:#0f766e;text-decoration:underline;">Contacto</a>
        <span style="color:#cbd5e1;"> · </span>
        <a href="${base}/privacidad" style="color:#0f766e;text-decoration:underline;">Política de privacidad</a>
      </p>
      <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.45;">© Rey del Dato SpA · RUT 78.403.835-1</p>
    </div>`;

    const html = `<div style="background:#f9fafb;padding:20px 16px;font-family:Arial,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:640px;width:100%;margin:0 auto;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:22px 20px;">
      <div style="font-weight:900;letter-spacing:0.06em;font-size:12px;color:#0f766e;margin-bottom:8px;">REY DEL DATO</div>
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 12px 0;color:#111827;">🚀 Tu negocio ya está visible</h1>
      ${introLine}
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px 16px;margin:0 0 14px 0;">
        <p style="margin:0 0 8px 0;color:#14532d;font-size:15px;font-weight:800;line-height:1.35;">¿Qué pasa ahora?</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.55;">Desde este momento, las personas de tu comuna pueden encontrarte y contactarte directamente por WhatsApp.</p>
      </div>
      ${panelCta ? `<div style="margin:0;">${panelCta}</div>${panelAyuda}` : ""}
      ${fichaSecundaria}
      ${bloqueConsejo}
      ${footerExtra}
    </div>
  </div>
</div>`;

    // eslint-disable-next-line no-console
    console.log("[email][aprobacion] intentando enviar", {
      emprendedorId,
      email: emailTo,
      nombre: nombreDisplay || null,
    });

    const enviadoOk = await sendEmail({
      to: emailTo,
      subject: "🚀 Tu negocio ya está visible en Rey del Dato",
      html,
    });

    if (enviadoOk) {
      // eslint-disable-next-line no-console
      console.log("[email][aprobacion] enviado", {
        emprendedorId,
        email: emailTo,
        nombre: nombreDisplay || null,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error("[email][aprobacion] fallo", {
        emprendedorId,
        email: emailTo,
        nombre: nombreDisplay || null,
        error: "sendEmail no confirmó envío (omitido, API o error Resend; ver logs [email])",
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[notifyEmprendimientoAprobado] Error preparando email:", e);
  }

  return { fichaPublicaUrl, panelUrl };
}
