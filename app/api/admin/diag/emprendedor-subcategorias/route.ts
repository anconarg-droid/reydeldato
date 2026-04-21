import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const emprendedorId = s(searchParams.get("emprendedor_id"));
    if (!emprendedorId) {
      return NextResponse.json(
        { ok: false, error: "Falta emprendedor_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const empRes = await supabase
      .from("emprendedores")
      .select("id, slug, estado_publicacion, categoria_id, categoria_slug_final, subcategoria_slug_final")
      .eq("id", emprendedorId)
      .maybeSingle();
    if (empRes.error) {
      return NextResponse.json(
        { ok: false, error: empRes.error.message },
        { status: 500 }
      );
    }

    const pivotRes = await supabase
      .from("emprendedor_subcategorias")
      .select("subcategoria_id")
      .eq("emprendedor_id", emprendedorId)
      .order("subcategoria_id", { ascending: true });
    if (pivotRes.error) {
      return NextResponse.json(
        { ok: false, error: pivotRes.error.message },
        { status: 500 }
      );
    }

    const subIds = (pivotRes.data ?? [])
      .map((r) => s((r as { subcategoria_id?: unknown }).subcategoria_id))
      .filter(Boolean);

    let subNombres: string[] = [];
    if (subIds.length > 0) {
      const subsRes = await supabase
        .from("subcategorias")
        .select("id, nombre, slug, categoria_id")
        .in("id", subIds as string[]);
      if (!subsRes.error && Array.isArray(subsRes.data)) {
        subNombres = subsRes.data
          .map((r) => s((r as { nombre?: unknown }).nombre))
          .filter(Boolean);
      }
    }

    return NextResponse.json({
      ok: true,
      emprendedor: empRes.data ?? null,
      pivot: {
        count: subIds.length,
        subcategoria_ids: subIds,
        subcategorias_nombres: subNombres,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

