// app/api/suggest/comunas-by-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const idRaw = req.nextUrl.searchParams.get("id") || "";
    const id = Number(idRaw);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("comunas")
      .select("id, slug, nombre, region_id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Comuna no encontrada" }, { status: 404 });
    }

    let regionNombre = "";
    if (data?.region_id != null) {
      const { data: region } = await supabase
        .from("regiones")
        .select("nombre")
        .eq("id", data.region_id)
        .maybeSingle();
      regionNombre = String(region?.nombre || "");
    }

    return NextResponse.json({
      ok: true,
      comuna: {
        id: data.id,
        slug: data.slug,
        nombre: data.nombre,
        region_nombre: regionNombre || undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Error al resolver comuna por id" },
      { status: 500 }
    );
  }
}