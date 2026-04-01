import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeAndFilterKeyword } from "@/lib/keywordValidation";

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

function normalizeKeywordsUsuarioInput(raw: unknown): string[] | null {
  if (raw == null) return null;
  const asText =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((x) => String(x ?? "")).join(",")
        : "";
  const parts = asText
    .split(",")
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const norm = normalizeAndFilterKeyword(p);
    if (norm) out.push(norm);
  }
  const uniq = [...new Set(out)].slice(0, 20);
  return uniq.length ? uniq : null;
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

export async function POST(req: NextRequest) {
  console.log("POST borrador");

  try {
    let supabase: ReturnType<typeof getSupabaseAdmin>;
    try {
      supabase = getSupabaseAdmin();
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
    if (frase) payload.frase_negocio = frase;

    const keywords =
      normalizeKeywordsUsuarioInput(body.keywords_usuario) ??
      normalizeKeywordsUsuarioInput(body.keywordsUsuario);
    if (keywords?.length) payload.keywords_usuario = keywords;

    const responsable = s(body.responsable) || s(body.nombre_responsable);
    if (responsable) payload.nombre_responsable = responsable;

    const email = s(body.email);
    if (email) payload.email = email;

    console.log("[POST borrador] payload keys:", Object.keys(payload));

    let { data, error } = await supabase
      .from("postulaciones_emprendedores")
      .insert(payload)
      .select("id, estado, paso_actual, nombre_emprendimiento, whatsapp_principal")
      .single();

    const msgLc = String(error?.message ?? "").toLowerCase();
    const missingKeywordsCol =
      error != null &&
      payload.keywords_usuario != null &&
      (error.code === "PGRST204" ||
        (msgLc.includes("schema cache") &&
          msgLc.includes("keywords") &&
          msgLc.includes("usuario")));

    if (missingKeywordsCol) {
      console.warn(
        "[POST borrador] Sin columna keywords_usuario en BD; insert sin ese campo. Ejecutá supabase/migrations/20260330010100_postulaciones_keywords_usuario.sql"
      );
      const { keywords_usuario: _kw, ...payloadSinKw } = payload;
      const retry = await supabase
        .from("postulaciones_emprendedores")
        .insert(payloadSinKw)
        .select("id, estado, paso_actual, nombre_emprendimiento, whatsapp_principal")
        .single();
      data = retry.data;
      error = retry.error;
    }

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
