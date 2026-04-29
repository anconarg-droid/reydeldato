import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import { isValidEmailFormat } from "@/lib/validateEmail";
import {
  PANEL_REENVIO_ACCESS_TOKEN_DIAS,
  buildRevisarAbsoluteUrl,
  persistEmprendedorAccessTokenForDays,
  sendPanelReenvioAccessEmailMulti,
  type PanelReenvioEmprendimientoItem,
} from "@/lib/revisarMagicLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPUESTA_GENERICA = {
  ok: true as const,
  message:
    "Si encontramos negocios asociados a ese correo, enviaremos un enlace.",
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
    .select("id, nombre_emprendimiento, estado_publicacion, comuna_id")
    .eq("estado_publicacion", ESTADO_PUBLICACION.publicado)
    .ilike("email", escapePostgresIlikeExact(emailRaw))
    .order("nombre_emprendimiento", { ascending: true });

  if (error) {
    console.error("[panel/reenviar-acceso] select:", error.message);
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  const comunaIds = [
    ...new Set(
      list
        .map((r) => {
          const cid = (r as { comuna_id?: unknown }).comuna_id;
          return cid != null ? String(cid).trim() : "";
        })
        .filter(Boolean),
    ),
  ];

  const comunaNombreById = new Map<string, string>();
  if (comunaIds.length > 0) {
    const { data: comunasRows, error: comErr } = await supabase
      .from("comunas")
      .select("id, nombre")
      .in("id", comunaIds);
    if (!comErr && Array.isArray(comunasRows)) {
      for (const c of comunasRows) {
        const id = c && typeof c === "object" && "id" in c ? String((c as { id: unknown }).id) : "";
        const nombre =
          c && typeof c === "object" && "nombre" in c
            ? String((c as { nombre: unknown }).nombre ?? "").trim()
            : "";
        if (id) comunaNombreById.set(id, nombre || "—");
      }
    }
  }

  const items: PanelReenvioEmprendimientoItem[] = [];

  for (const raw of list) {
    const row = raw as {
      id?: unknown;
      nombre_emprendimiento?: unknown;
      estado_publicacion?: unknown;
      comuna_id?: unknown;
    };
    const id = row.id != null ? String(row.id).trim() : "";
    if (!id) continue;

    try {
      const { token } = await persistEmprendedorAccessTokenForDays(
        supabase,
        id,
        PANEL_REENVIO_ACCESS_TOKEN_DIAS
      );
      const url = buildRevisarAbsoluteUrl(token);
      const nombre =
        row.nombre_emprendimiento != null
          ? String(row.nombre_emprendimiento).trim()
          : "";
      const estado =
        row.estado_publicacion != null
          ? String(row.estado_publicacion).trim()
          : "";
      const cid = row.comuna_id != null ? String(row.comuna_id).trim() : "";
      const comuna = cid ? comunaNombreById.get(cid) ?? "—" : "—";
      items.push({
        url,
        nombre: nombre || "Sin nombre",
        comuna,
        estado: estado || "—",
      });
    } catch (e) {
      console.error(
        "[panel/reenviar-acceso] persist token:",
        id,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  if (items.length === 0) {
    return NextResponse.json(RESPUESTA_GENERICA);
  }

  try {
    await sendPanelReenvioAccessEmailMulti(
      emailRaw,
      PANEL_REENVIO_ACCESS_TOKEN_DIAS,
      items
    );
  } catch (mailErr) {
    console.error(
      "[panel/reenviar-acceso] envío email:",
      mailErr instanceof Error ? mailErr.message : String(mailErr)
    );
  }

  return NextResponse.json(RESPUESTA_GENERICA);
}
