import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMejorarFichaQueryString } from "@/lib/mejorarFichaQuery";

/** Días de validez del link mágico tras aprobar / publicar. */
export const REVISAR_ACCESS_TOKEN_DIAS = 7;

/** Días de validez al renovar acceso al panel por email (POST /api/panel/reenviar-acceso). */
export const PANEL_REENVIO_ACCESS_TOKEN_DIAS = 30;

function appBaseUrl(): string {
  const raw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function buildRevisarAbsoluteUrl(accessToken: string): string {
  const base = appBaseUrl();
  const qs = buildMejorarFichaQueryString({ token: accessToken });
  return `${base}/panel${qs}`;
}

/**
 * Persiste token y expiración en `emprendedores`. Devuelve el token en claro (solo para el email).
 */
export async function persistEmprendedorAccessToken(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<{ token: string; expiraAt: string }> {
  const token = randomUUID();
  const expira = new Date(Date.now() + REVISAR_ACCESS_TOKEN_DIAS * 24 * 60 * 60 * 1000);
  const expiraAt = expira.toISOString();

  const { error } = await supabase
    .from("emprendedores")
    .update({
      access_token: token,
      access_token_expira_at: expiraAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emprendedorId);

  if (error) {
    throw new Error(error.message);
  }

  return { token, expiraAt };
}

/**
 * Nuevo token opaco y expiración (no reutiliza tokens previos).
 * Usar para renovación de acceso con validez distinta a {@link REVISAR_ACCESS_TOKEN_DIAS}.
 */
export async function persistEmprendedorAccessTokenForDays(
  supabase: SupabaseClient,
  emprendedorId: string,
  dias: number
): Promise<{ token: string; expiraAt: string }> {
  const token = randomUUID();
  const expiraAt = new Date(
    Date.now() + dias * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase
    .from("emprendedores")
    .update({
      access_token: token,
      access_token_expira_at: expiraAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emprendedorId);

  if (error) {
    throw new Error(error.message);
  }

  return { token, expiraAt };
}

export type EmprendedorRevisarRow = {
  id: string;
  slug: string | null;
  nombre_emprendimiento: string | null;
  frase_negocio: string | null;
  descripcion_libre: string | null;
  email: string | null;
  whatsapp_principal: string | null;
  instagram: string | null;
  sitio_web: string | null;
  foto_principal_url: string | null;
};

const SELECT_REVISAR = [
  "id",
  "slug",
  "nombre_emprendimiento",
  "frase_negocio",
  "descripcion_libre",
  "email",
  "whatsapp_principal",
  "instagram",
  "sitio_web",
  "foto_principal_url",
].join(", ");

/**
 * Resuelve panel mágico `/panel?token=...` leyendo **solo** `public.emprendedores`.
 * No filtra por `estado_publicacion` (cualquier fila con token válido y no vencido).
 *
 * Filtros exactos:
 * - `access_token` = token (trim)
 * - `access_token_expira_at` IS NOT NULL
 * - `access_token_expira_at` > now() (ISO del servidor Node)
 */
export async function loadEmprendedorPorTokenValido(
  supabase: SupabaseClient,
  token: string
): Promise<EmprendedorRevisarRow | null> {
  const t = String(token ?? "").trim();
  const debug = process.env.DEBUG_PANEL_TOKEN === "1";

  if (t.length < 8) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("[loadEmprendedorPorTokenValido] token demasiado corto", {
        length: t.length,
        tabla: "emprendedores",
      });
    }
    return null;
  }

  const now = new Date().toISOString();
  if (debug) {
    // eslint-disable-next-line no-console
    console.log("[loadEmprendedorPorTokenValido] consulta", {
      tabla: "emprendedores",
      filtros: {
        access_token: "eq (trim)",
        access_token_expira_at: "not null AND gt(now)",
        now_iso: now,
      },
      token_len: t.length,
      token_preview: `${t.slice(0, 4)}…${t.slice(-4)}`,
    });
  }

  const { data, error } = await supabase
    .from("emprendedores")
    .select(SELECT_REVISAR)
    .eq("access_token", t)
    .not("access_token_expira_at", "is", null)
    .gt("access_token_expira_at", now)
    .maybeSingle();

  if (debug) {
    // eslint-disable-next-line no-console
    console.log("[loadEmprendedorPorTokenValido] resultado query principal", {
      supabase_error: error
        ? { message: error.message, code: (error as { code?: string }).code }
        : null,
      fila_encontrada: Boolean(data),
      emprendedor_id:
        data && typeof data === "object" && "id" in data
          ? String((data as { id?: unknown }).id ?? "")
          : null,
    });
  }

  if (error) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log(
        "[loadEmprendedorPorTokenValido] diagnostico: misma tabla sin filtro expira (solo eq token)",
      );
      const { data: sinExpira, error: err2 } = await supabase
        .from("emprendedores")
        .select("id, access_token_expira_at, estado_publicacion")
        .eq("access_token", t)
        .maybeSingle();
      // eslint-disable-next-line no-console
      console.log("[loadEmprendedorPorTokenValido] diagnostico fila por token", {
        err2: err2 ? err2.message : null,
        sinExpira,
      });
    }
    return null;
  }

  if (!data && debug) {
    const { data: porToken } = await supabase
      .from("emprendedores")
      .select("id, access_token_expira_at, estado_publicacion")
      .eq("access_token", t)
      .maybeSingle();
    // eslint-disable-next-line no-console
    console.log("[loadEmprendedorPorTokenValido] sin fila válida: diagnostico por token", {
      hay_fila_con_mismo_token: Boolean(porToken),
      expira_at: porToken
        ? (porToken as { access_token_expira_at?: unknown }).access_token_expira_at
        : null,
      now_iso: now,
      expira_gt_now:
        porToken &&
        (porToken as { access_token_expira_at?: string | null }).access_token_expira_at
          ? new Date(
              String(
                (porToken as { access_token_expira_at: string }).access_token_expira_at,
              ),
            ).getTime() > new Date(now).getTime()
          : null,
      estado_publicacion: porToken
        ? (porToken as { estado_publicacion?: unknown }).estado_publicacion
        : null,
      nota:
        porToken == null
          ? "No hay fila en emprendedores con ese access_token (¿token en otra tabla, ej. postulaciones_emprendedores?)"
          : "Hay fila pero falló not null / gt(expira) o maybeSingle devolvió null",
    });
  }

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    slug: row.slug == null ? null : String(row.slug),
    nombre_emprendimiento:
      row.nombre_emprendimiento == null ? null : String(row.nombre_emprendimiento),
    frase_negocio: row.frase_negocio == null ? null : String(row.frase_negocio),
    descripcion_libre: row.descripcion_libre == null ? null : String(row.descripcion_libre),
    email: row.email == null ? null : String(row.email),
    whatsapp_principal:
      row.whatsapp_principal == null ? null : String(row.whatsapp_principal),
    instagram: row.instagram == null ? null : String(row.instagram),
    sitio_web: row.sitio_web == null ? null : String(row.sitio_web),
    foto_principal_url:
      row.foto_principal_url == null ? null : String(row.foto_principal_url),
  };
}

/**
 * Envía el correo con Resend si hay `RESEND_API_KEY`; si no, registra en consola (operación no falla).
 */
export async function sendRevisarMagicLinkEmail(to: string, absoluteUrl: string): Promise<void> {
  const dest = String(to ?? "").trim().toLowerCase();
  if (!dest) return;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "onboarding@resend.dev";

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn("[revisar-magic-link] RESEND_API_KEY no configurada; link no enviado por email:", {
      to: dest,
      url: absoluteUrl,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [dest],
      subject: "Mejora tu perfil y consigue más clientes",
      html: `<div style="background:#f9fafb;padding:24px;font-family:Arial,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
      <div style="font-weight:900;letter-spacing:0.06em;font-size:12px;color:#0f766e;margin-bottom:10px;">REY DEL DATO</div>
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 10px 0;color:#111827;">Mejora tu perfil y consigue más clientes</h1>

      <p style="margin:0 0 14px 0;color:#4b5563;line-height:1.6;">Puedes editar tu ficha y acceder a tu panel desde aquí (válido por ${REVISAR_ACCESS_TOKEN_DIAS} días).</p>

      <div style="margin:0 0 14px 0;">
        <a href="${absoluteUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;line-height:1;border-radius:12px;padding:14px 18px;">Abrir mi panel</a>
      </div>

      <p style="margin:0 0 0 0;color:#4b5563;line-height:1.6;">Si el botón no funciona, usa este enlace: <a href="${absoluteUrl}" style="color:#0f766e;text-decoration:underline;">${absoluteUrl}</a></p>

      <div style="border-top:1px solid #e5e7eb;margin:18px 0;"></div>

      <p style="margin:0 0 10px 0;color:#111827;font-weight:800;">Qué hacer para recibir más contactos</p>
      <ul style="margin:0 0 12px 18px;padding:0;color:#4b5563;line-height:1.6;">
        <li>Sube fotos reales</li>
        <li>Ajusta tu descripción</li>
        <li>Completa tu información</li>
      </ul>

      <p style="margin:0;color:#4b5563;line-height:1.6;">Si no solicitaste este acceso, ignora este mensaje.</p>
    </div>

    <p style="margin:14px 0 0 0;color:#6b7280;font-size:13px;line-height:1.5;">— Equipo Rey del Dato</p>
  </div>
</div>`,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
}

/**
 * Email de renovación de acceso al panel (mismo destino `/panel?token=...`).
 */
export async function sendPanelReenvioAccessEmail(
  to: string,
  absoluteUrl: string,
  diasValidos: number
): Promise<void> {
  const dest = String(to ?? "").trim().toLowerCase();
  if (!dest) return;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "onboarding@resend.dev";

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn("[panel-reenviar-acceso] RESEND_API_KEY no configurada; link no enviado:", {
      to: dest,
      url: absoluteUrl,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [dest],
      subject: "Mejora tu perfil y consigue más clientes",
      html: `<div style="background:#f9fafb;padding:24px;font-family:Arial,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
      <div style="font-weight:900;letter-spacing:0.06em;font-size:12px;color:#0f766e;margin-bottom:10px;">REY DEL DATO</div>
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 10px 0;color:#111827;">Mejora tu perfil y consigue más clientes</h1>

      <p style="margin:0 0 14px 0;color:#4b5563;line-height:1.6;">Puedes editar tu ficha y acceder a tu panel desde aquí (válido por ${diasValidos} días).</p>

      <div style="margin:0 0 14px 0;">
        <a href="${absoluteUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;line-height:1;border-radius:12px;padding:14px 18px;">Abrir mi panel</a>
      </div>

      <p style="margin:0 0 0 0;color:#4b5563;line-height:1.6;">Si el botón no funciona, usa este enlace: <a href="${absoluteUrl}" style="color:#0f766e;text-decoration:underline;">${absoluteUrl}</a></p>

      <div style="border-top:1px solid #e5e7eb;margin:18px 0;"></div>

      <p style="margin:0 0 10px 0;color:#111827;font-weight:800;">Qué hacer para recibir más contactos</p>
      <ul style="margin:0 0 12px 18px;padding:0;color:#4b5563;line-height:1.6;">
        <li>Sube fotos reales</li>
        <li>Ajusta tu descripción</li>
        <li>Completa tu información</li>
      </ul>

      <p style="margin:0;color:#4b5563;line-height:1.6;">Si no solicitaste este acceso, ignora este mensaje.</p>
    </div>

    <p style="margin:14px 0 0 0;color:#6b7280;font-size:13px;line-height:1.5;">— Equipo Rey del Dato</p>
  </div>
</div>`,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
}

/**
 * Tras publicar desde moderación: guarda token y envía email (el email no bloquea si falla).
 */
export async function issueRevisarMagicLinkAfterPublish(
  supabase: SupabaseClient,
  emprendedorId: string,
  emailTo: string | null | undefined
): Promise<{ tokenIssued: boolean; emailSent: boolean; url?: string; error?: string }> {
  try {
    const { token } = await persistEmprendedorAccessToken(supabase, emprendedorId);
    const url = buildRevisarAbsoluteUrl(token);
    const email = String(emailTo ?? "").trim();
    if (!email) {
      // eslint-disable-next-line no-console
      console.warn("[revisar-magic-link] Sin email en postulación; token guardado.", {
        emprendedor_id: emprendedorId,
        url,
      });
      return { tokenIssued: true, emailSent: false, url };
    }
    try {
      await sendRevisarMagicLinkEmail(email, url);
      return { tokenIssued: true, emailSent: true, url };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[revisar-magic-link] Falló envío email:", msg, { emprendedor_id: emprendedorId, url });
      return { tokenIssued: true, emailSent: false, url, error: msg };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[revisar-magic-link] No se pudo guardar token:", msg, { emprendedor_id: emprendedorId });
    return { tokenIssued: false, emailSent: false, error: msg };
  }
}
