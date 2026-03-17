import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateKeywordSuggestions } from "@/lib/generateKeywordSuggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * POST: sugiere keywords desde descripción (y nombre) usando el diccionario.
 * Body: { descripcion_negocio, nombre_emprendimiento? }
 * Response: { ok, keywords: string[] } (3-8 sugerencias para chips).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const descripcionNegocio = s((body as Record<string, unknown>).descripcion_negocio);
    const nombreEmprendimiento = s((body as Record<string, unknown>).nombre_emprendimiento);

    const result = await generateKeywordSuggestions(
      supabase,
      descripcionNegocio,
      nombreEmprendimiento || undefined
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error.includes("25 caracteres") ? 400 : 500 }
      );
    }

    return NextResponse.json({ ok: true, keywords: result.keywords });
  } catch (err) {
    console.error("[sugerir-keywords-desde-descripcion]", err);
    return NextResponse.json(
      { ok: false, error: "Error al generar sugerencias." },
      { status: 500 }
    );
  }
}
