import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);

  const categoria = searchParams.get("categoria");
  const actual = searchParams.get("actual");

  if (!categoria || !actual) {
    return NextResponse.json([]);
  }

  const db = supabase();

  const { data, error } = await db
    .from("vw_emprendedores_busqueda_v2")
    .select("nombre, slug, categoria_nombre")
    .eq("categoria_nombre", categoria)
    .neq("slug", actual)
    .limit(6);

  if (error) {
    return NextResponse.json({
      ok:false,
      error:error.message
    });
  }

  return NextResponse.json(
    (data || []).map((r:any)=>({
      nombre:r.nombre,
      slug:r.slug,
      categoria_nombre:r.categoria_nombre
    }))
  );
}