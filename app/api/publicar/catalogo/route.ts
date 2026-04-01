import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catálogo para embeber `PublicarSimpleClient` en la home (comunas + regiones).
 * Misma forma que arma `app/publicar/page.tsx`.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) {
      return NextResponse.json(
        { ok: false, message: "Servicio no configurado." },
        { status: 503 }
      );
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: regionesRaw, error: regionesError } = await supabase
      .from("regiones")
      .select("id,nombre,slug")
      .order("nombre");

    const { data: comunasRaw, error: comunasError } = await supabase
      .from("comunas")
      .select("id,nombre,slug,region_id")
      .order("nombre");

    if (regionesError || comunasError) {
      console.error("[publicar/catalogo]", regionesError?.message, comunasError?.message);
      return NextResponse.json(
        { ok: false, message: "No se pudo cargar el catálogo." },
        { status: 500 }
      );
    }

    const regiones = (regionesRaw || []).map(
      (r: { id: string | number; nombre: string; slug: string }) => ({
        id: String(r.id),
        nombre: r.nombre,
        slug: r.slug,
      })
    );

    const regionMap = new Map(regiones.map((r) => [String(r.id), r]));

    const comunas = (comunasRaw || []).map(
      (c: {
        id: string | number;
        nombre: string;
        slug: string;
        region_id?: string | number | null;
      }) => {
        const region =
          c.region_id != null ? regionMap.get(String(c.region_id)) : null;
        return {
          id: String(c.id),
          nombre: c.nombre,
          slug: c.slug,
          region_id: c.region_id != null ? String(c.region_id) : null,
          region_nombre: region?.nombre || null,
          display_name: region ? `${c.nombre}, ${region.nombre}` : c.nombre,
        };
      }
    );

    return NextResponse.json({ ok: true, comunas, regiones });
  } catch (e) {
    console.error("[publicar/catalogo] excepción", e);
    return NextResponse.json({ ok: false, message: "Error inesperado." }, { status: 500 });
  }
}
