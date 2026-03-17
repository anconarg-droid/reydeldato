import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listKeywordsDetectadas } from "@/lib/keywordsDetectadas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET: listar keywords detectadas (más usadas primero).
 * Query: estado=pendiente|aprobada|bloqueada, limit=100, offset=0
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") as "pendiente" | "aprobada" | "bloqueada" | null;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

    const result = await listKeywordsDetectadas(supabase, {
      ...(estado && { estado }),
      limit,
      offset,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, items: result.data });
  } catch (err) {
    console.error("[admin/keywords-detectadas GET]", err);
    return NextResponse.json(
      { ok: false, error: "Error al listar keywords detectadas." },
      { status: 500 }
    );
  }
}
