import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ComunaRow = {
  id: number | string;
  slug: string;
  nombre: string;
  region_id: number | string | null;
};

type RegionRow = {
  id: number | string;
  nombre: string;
};

/**
 * Catálogo completo de comunas (tabla `comunas` + nombre de región desde `regiones`).
 * Para selectores del panel (p. ej. locales físicos) sin listas hardcodeadas.
 */
export async function GET() {
  try {
    const [comRes, regRes] = await Promise.all([
      supabase
        .from("comunas")
        .select("id, slug, nombre, region_id")
        .order("nombre", { ascending: true }),
      supabase.from("regiones").select("id, nombre"),
    ]);

    if (comRes.error) {
      return NextResponse.json(
        { ok: false, error: comRes.error.message, items: [] },
        { status: 500 }
      );
    }
    if (regRes.error) {
      return NextResponse.json(
        { ok: false, error: regRes.error.message, items: [] },
        { status: 500 }
      );
    }

    const regionNombreById = new Map<string, string>();
    for (const r of (regRes.data ?? []) as RegionRow[]) {
      const id = String(r.id);
      const n = String(r.nombre ?? "").trim();
      if (id) regionNombreById.set(id, n || "Sin región");
    }

    const items = ((comRes.data ?? []) as ComunaRow[]).map((c) => {
      const rid = c.region_id != null ? String(c.region_id) : "";
      const regionNombre = rid ? regionNombreById.get(rid) ?? "Sin región" : "Sin región";
      return {
        id: c.id,
        slug: String(c.slug ?? "").trim(),
        nombre: String(c.nombre ?? "").trim(),
        regionNombre,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Error cargando comunas",
        items: [],
      },
      { status: 500 }
    );
  }
}
