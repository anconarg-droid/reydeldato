import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveBucket, type ResolveBucketInput, type TerritorialBucket } from "@/lib/search/resolveBucket";
import { stableRotationKey } from "@/lib/rankingBuscar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type RawRow = {
  id: string;
  nombre: string | null;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  publicado: boolean | null;
  categoria_slug: string | null;
  comuna_base_slug: string | null;
  comuna_base_nombre?: string | null;
  nivel_cobertura?: string | null;
  coverage_keys?: string[] | null;
  coverage_labels?: string[] | null;
  foto_principal_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  web: string | null;
  email: string | null;
  search_text: string | null;
};

type SearchItem = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  foto_principal_url: string | null;
  comuna_slug: string | null;
  comuna_nombre: string | null;
  categoria_slug_final: string | null;
  subcategoria_slug_final: string | null;
  whatsapp: string | null;
  instagram: string | null;
  web: string | null;
  email: string | null;
  search_text: string | null;
  public: boolean;
  bucket: TerritorialBucket | null;
  coverage_keys: string[] | null;
  coverage_labels: string[] | null;
  nivel_cobertura: string | null;
  comuna_base_slug: string | null;
  comuna_base_nombre: string | null;
};

function getFiveMinuteSeed(): number {
  // Misma idea que getDaySeed pero con ventana de 5 minutos
  return Math.floor(Date.now() / (5 * 60 * 1000));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = s(searchParams.get("q"));
    const comuna = s(searchParams.get("comuna"));
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || "30"), 200));
    const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

    const qNorm = norm(q);
    const comunaNorm = norm(comuna).replace(/\s+/g, "-");
    const qLike = qNorm ? `%${qNorm}%` : "";

    console.log("BUSCAR_PARAMS", {
      q,
      comuna,
      qNorm,
      comunaNorm,
      qLike,
      limit,
      offset,
    });

    let query = supabase
      .from("vw_emprendedores_algolia_final")
      .select(
        `
        id,
        nombre,
        descripcion_corta,
        descripcion_larga,
        publicado,
        categoria_slug,
        comuna_base_slug,
        search_text
      `,
        { count: "exact" }
      )
      .eq("publicado", true);

    if (qLike) {
      query = query.ilike("search_text", qLike);
    }

    const res = await query
      .order("nombre", { ascending: true })
      .range(offset, offset + limit - 1);

    console.log("BUSCAR_RESULT", {
      error: res.error,
      count: res.count,
      rows: Array.isArray(res.data) ? res.data.length : null,
      firstRow: Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null,
    });

    if (res.error) {
      return NextResponse.json(
        { ok: false, error: res.error.message },
        { status: 500 }
      );
    }

    const rows: RawRow[] = Array.isArray(res.data) ? (res.data as RawRow[]) : [];

    const seed = getFiveMinuteSeed();

    const enriched: SearchItem[] = rows.map((r) => {
      const bucket: TerritorialBucket | null = comuna
        ? resolveBucket(
            {
              comuna_base_slug: r.comuna_base_slug,
              comuna_base_nombre: null,
              coverage_keys: null,
              coverage_labels: null,
              nivel_cobertura: null,
            } as ResolveBucketInput,
            comuna
          )
        : null;

      return {
        id: s(r.id),
        slug: s(r.id),
        nombre: s(r.nombre) || "Emprendimiento",
        descripcion_corta: r.descripcion_corta ?? null,
        descripcion_larga: r.descripcion_larga ?? null,
        foto_principal_url: null,
        comuna_slug: s(r.comuna_base_slug) || null,
        comuna_nombre: null,
        categoria_slug_final: s(r.categoria_slug) || null,
        subcategoria_slug_final: null,
        whatsapp: null,
        instagram: null,
        web: null,
        email: null,
        search_text: s(r.search_text) || null,
        public: r.publicado === true,
        bucket,
        coverage_keys: null,
        coverage_labels: null,
        nivel_cobertura: null,
        comuna_base_slug: r.comuna_base_slug ?? null,
        comuna_base_nombre: null,
      };
    });

    // Si hay comuna, nos quedamos solo con los que tienen alguna relación territorial (no "general")
    const scoped: SearchItem[] = enriched;

    const bucketOrder: Record<TerritorialBucket, number> = {
      exacta: 0, // mismo tratamiento que "local" para producto
      cobertura_comuna: 1,
      regional: 2,
      nacional: 3,
      general: 4,
    };

    const sortedItems = [...scoped].sort((a, b) => {
      const aBucket = a.bucket ?? "general";
      const bBucket = b.bucket ?? "general";

      const diffBucket = bucketOrder[aBucket] - bucketOrder[bBucket];
      if (diffBucket !== 0) return diffBucket;

      // Rotación justa dentro de cada bucket con semilla de 5 minutos
      const aKey = stableRotationKey(a.id, seed);
      const bKey = stableRotationKey(b.id, seed);
      if (aKey !== bKey) return aKey - bKey;

      return a.nombre.localeCompare(b.nombre, "es");
    });

    console.log("BUSCAR_BUCKETS", {
      exacta: sortedItems.filter((i) => i.bucket === "exacta").length,
      cobertura_comuna: sortedItems.filter((i) => i.bucket === "cobertura_comuna").length,
      varias_regiones: sortedItems.filter((i) => i.bucket === "varias_regiones").length,
      nacional: sortedItems.filter((i) => i.bucket === "nacional").length,
      general: sortedItems.filter((i) => !i.bucket || i.bucket === "general").length,
    });

    return NextResponse.json({
      ok: true,
      total: res.count ?? sortedItems.length,
      items: sortedItems,
    });
  } catch (error) {
    console.error("GET /api/buscar fatal:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado en búsqueda.",
      },
      { status: 500 }
    );
  }
}