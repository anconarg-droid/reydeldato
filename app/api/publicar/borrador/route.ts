import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeDescripcionCorta } from "@/lib/descripcionProductoForm";
import { randomUUID } from "crypto";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function toIntOrNull(v: unknown): number | null {
  const t = s(v);
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}

async function safeReadJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const raw = await req.json();
    return raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function jsonError(
  status: number,
  message: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { ok: false, message, error: message, ...extra },
    { status }
  );
}

/** Días de validez para editar un borrador sin login. */
const BORRADOR_ACCESS_TOKEN_DIAS = 30;

export async function POST(req: NextRequest) {
  console.log("POST borrador");

  try {
    let supabase: ReturnType<typeof getSupabaseAdmin>;
    try {
      supabase = getSupabaseAdmin({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      });
    } catch (e) {
      console.error("[POST borrador] Supabase no configurado:", e);
      return jsonError(
        503,
        "Servicio temporalmente no disponible (configuración).",
        {
          details: e instanceof Error ? e.message : String(e),
        }
      );
    }

    const body = await safeReadJson(req);

    /** Igual que `publicar/page.tsx`: solo `estado` por defecto; no enviar `null` en columnas opcionales (evita pisar DEFAULT / violar NOT NULL en PostgREST). */
    const payload: Record<string, unknown> = { estado: "borrador" };
    const token = randomUUID();
    const expiraAt = new Date(
      Date.now() + BORRADOR_ACCESS_TOKEN_DIAS * 24 * 60 * 60 * 1000
    ).toISOString();
    payload.access_token = token;
    payload.access_token_expira_at = expiraAt;
    const paso = toIntOrNull(body.paso_actual);
    payload.paso_actual = paso ?? 1;

    const nombre = s(body.nombre) || s(body.nombre_emprendimiento);
    if (nombre) payload.nombre_emprendimiento = nombre;

    const whatsapp =
      s(body.whatsapp) ||
      s(body.whatsapp_principal) ||
      s(body.whatsappPrincipal);
    if (whatsapp) payload.whatsapp_principal = whatsapp;

    const frase =
      s(body.fraseNegocio) ||
      s(body.descripcion_corta) ||
      s(body.descripcionCorta) ||
      s(body.frase_negocio) ||
      s(body.descripcionNegocio);
    if (frase) payload.frase_negocio = normalizeDescripcionCorta(frase);

    const responsable = s(body.responsable) || s(body.nombre_responsable);
    if (responsable) payload.nombre_responsable = responsable;

    const email = s(body.email);
    if (email) payload.email = email;

    console.log("[POST borrador] payload keys:", Object.keys(payload));

    const { data, error } = await supabase
      .from("postulaciones_emprendedores")
      .insert(payload)
      .select(
        "id, estado, paso_actual, nombre_emprendimiento, whatsapp_principal, access_token, access_token_expira_at"
      )
      .single();

    if (error) {
      console.error("[POST borrador] insert error:", error.message, error.code);
      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo crear el borrador",
          error: "No se pudo crear el borrador",
          db_error: error.message,
          db_code: error.code ?? null,
          db_details: error.details ?? null,
        },
        { status: 500 }
      );
    }

    if (!data || data.id == null) {
      console.error("[POST borrador] insert sin fila");
      return jsonError(500, "No se pudo crear el borrador (sin id).");
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      token: (data as Record<string, unknown>).access_token ?? token,
      token_expira_at: (data as Record<string, unknown>).access_token_expira_at ?? expiraAt,
      item: data,
    });
  } catch (error) {
    console.error("[POST borrador] excepción:", error);
    return jsonError(
      500,
      error instanceof Error ? error.message : "Error inesperado al crear borrador"
    );
  }
}
