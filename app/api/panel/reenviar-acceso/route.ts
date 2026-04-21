import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import { isValidEmailFormat } from "@/lib/validateEmail";
import {
  PANEL_REENVIO_ACCESS_TOKEN_DIAS,
  buildRevisarAbsoluteUrl,
  persistEmprendedorAccessTokenForDays,
  sendPanelReenvioAccessEmail,
} from "@/lib/revisarMagicLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPUESTA_GENERICA = {
  ok: true as const,
  message: "Te enviamos un nuevo enlace si el correo existe.",
};

/** ILIKE exacto: escapa `%`, `_` y `\` para que no actúen como comodines. */
function escapePostgresIlikeExact(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function s(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  const emailRaw = s(body.email);
  if (!emailRaw || !isValidEmailFormat(emailRaw)) {
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  let supabase: ReturnType<typeof getSupabaseAdminFromEnv>;
  try {
    supabase = getSupabaseAdminFromEnv();
  } catch (e) {
    console.error("[panel/reenviar-acceso] Supabase admin no configurado:", e);
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  const { data: rows, error } = await supabase
    .from("emprendedores")
    .select("id")
    .eq("estado_publicacion", ESTADO_PUBLICACION.publicado)
    .ilike("email", escapePostgresIlikeExact(emailRaw))
    .limit(1);

  if (error) {
    console.error("[panel/reenviar-acceso] select:", error.message);
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  const row = rows?.[0] as { id?: unknown } | undefined;
  const emprendedorId = row?.id != null ? String(row.id).trim() : "";
  if (!emprendedorId) {
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  try {
    const { token } = await persistEmprendedorAccessTokenForDays(
      supabase,
      emprendedorId,
      PANEL_REENVIO_ACCESS_TOKEN_DIAS
    );
    const url = buildRevisarAbsoluteUrl(token);
    try {
      await sendPanelReenvioAccessEmail(
        emailRaw,
        url,
        PANEL_REENVIO_ACCESS_TOKEN_DIAS
      );
    } catch (mailErr) {
      console.error(
        "[panel/reenviar-acceso] envío email:",
        mailErr instanceof Error ? mailErr.message : String(mailErr)
      );
    }
  } catch (e) {
    console.error(
      "[panel/reenviar-acceso] persist token:",
      e instanceof Error ? e.message : String(e)
    );
  }

  return NextResponse.json(RESPUESTA_GENERICA);
}
