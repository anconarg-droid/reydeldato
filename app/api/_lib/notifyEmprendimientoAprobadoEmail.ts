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

    const safeNombre = nombre || "tu emprendimiento";

    if (!emailBasicoValido(emailTo)) {
      // eslint-disable-next-line no-console
      console.warn("[email][aprobacion] email invalido o ausente", {
        emprendedorId,
        email: emailTo,
      });
      return { fichaPublicaUrl, panelUrl };
    }

    const panelCta =
      panelUrl
        ? `<a href="${panelUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;line-height:1;border-radius:12px;padding:14px 18px;">Editar y mejorar mi perfil</a>`
        : "";
    const fichaSec =
      fichaPublicaUrl
        ? `<a href="${fichaPublicaUrl}" style="color:#0f766e;text-decoration:underline;">Ver mi ficha</a>`
        : "";

    const html = `<div style="background:#f9fafb;padding:24px;font-family:Arial,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
      <div style="font-weight:900;letter-spacing:0.06em;font-size:12px;color:#0f766e;margin-bottom:10px;">REY DEL DATO</div>
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 10px 0;color:#111827;">🚀 Tu negocio ya está visible</h1>

      <p style="margin:0 0 12px 0;color:#4b5563;line-height:1.6;">Tu emprendimiento <strong style="color:#111827;">${safeNombre}</strong> ya está publicado.</p>

      <p style="margin:0 0 16px 0;color:#4b5563;line-height:1.6;"><strong style="color:#111827;">Qué pasa ahora:</strong> desde ahora, personas de tu comuna pueden encontrarte y contactarte directamente por WhatsApp.</p>

      <p style="margin:0 0 12px 0;color:#111827;font-weight:800;">Qué hacer ahora</p>
      <div style="margin:0 0 14px 0;">${panelCta}</div>
      <p style="margin:0 0 0 0;color:#4b5563;line-height:1.6;">También puedes ver tu ficha pública: ${fichaSec}</p>

      <div style="border-top:1px solid #e5e7eb;margin:18px 0;"></div>

      <p style="margin:0 0 10px 0;color:#111827;font-weight:800;">📈 Importante</p>
      <p style="margin:0 0 12px 0;color:#4b5563;line-height:1.6;">Los perfiles con fotos y descripción completa reciben más contactos.</p>
      <ul style="margin:0 0 12px 18px;padding:0;color:#4b5563;line-height:1.6;">
        <li>Sube fotos</li>
        <li>Mejora tu descripción</li>
        <li>Completa tu información</li>
      </ul>
      <p style="margin:0;color:#4b5563;line-height:1.6;">Mientras más completo tu perfil, más clientes generas.</p>
    </div>

    <p style="margin:14px 0 0 0;color:#6b7280;font-size:13px;line-height:1.5;">— Equipo Rey del Dato</p>
  </div>
</div>`;

    // eslint-disable-next-line no-console
    console.log("[email][aprobacion] intentando enviar", {
      emprendedorId,
      email: emailTo,
      nombre: safeNombre,
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
