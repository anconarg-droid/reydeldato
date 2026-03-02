import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("comunas")
    .select(`
      id,
      nombre,
      slug,
      region_id,
      regiones:region_id (
        id,
        nombre,
        slug,
        pais_id,
        paises:pais_id (
          id,
          nombre,
          slug
        )
      )
    `)
    .ilike("nombre", `%${q}%`)
    .order("nombre", { ascending: true })
    .limit(15);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = (data ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    slug: c.slug,
    region: c.regiones
      ? {
          id: c.regiones.id,
          nombre: c.regiones.nombre,
          slug: c.regiones.slug,
        }
      : null,
    country: c.regiones?.paises
      ? {
          id: c.regiones.paises.id,
          nombre: c.regiones.paises.nombre,
          slug: c.regiones.paises.slug,
        }
      : null,
  }));

  return NextResponse.json(normalized);
}