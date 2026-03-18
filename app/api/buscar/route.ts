import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function getFiveMinuteSeed(): number {
  return Math.floor(Date.now() / (5 * 60 * 1000));
}

function stableRotationKey(id: string, seed: number): number {
  const input = `${id}:${seed}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

type SearchItem = {
  id: string;
  nombre: string;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  foto_principal_url: string | null;
  comuna_slug: string | null;
  comuna_nombre: string | null;
  categoria_slug: string | null;
  subcategoria_slug: string | null;
  whatsapp: string | null;
  instagram: string | null;
  web: string | null;
  email: string | null;
  public: boolean;
  search_text: string | null;
  nivel_cobertura: string | null;
  coverage_keys: string[] | null;
  coverage_labels: string[] | null;
  bucket: "exacta" | "cobertura_comuna" | "regional" | "nacional" | "general" | null;
};

function resolveBucket(item: {
  comuna_base_slug?: string | null;
  nivel_cobertura?: string | null;
  coverage_keys?: string[] | null;
}, comunaBuscada: string): SearchItem["bucket"] {
  const comuna = norm(comunaBuscada);
  const base = norm(item.comuna_base_slug);
  const nivel = norm(item.nivel_cobertura);
  const keys = Array.isArray(item.coverage_keys)
    ? item.coverage_keys.map((x) => norm(x))
    : [];

  if (!comuna) return null;

  // BLOQUE 1: base en la comuna buscada (independiente de nivel_cobertura)
  if (base === comuna) {
    return "exacta";
  }

  // BLOQUE 2: no son de la comuna, pero sí atienden esa comuna
  const atiendePorCobertura =
    (nivel === "varias_comunas" && keys.includes(comuna)) ||
    nivel === "regional" ||
    nivel === "nacional";

  if (atiendePorCobertura) {
    return "cobertura_comuna";
  }

  // No tienen relación con la comuna buscada
  return "general";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = s(searchParams.get("q"));
    const comuna = s(searchParams.get("comuna"));
    const categoria = s(searchParams.get("categoria"));
    const subcategoria = s(searchParams.get("subcategoria"));
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || "30"), 200));
    const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

    const qNorm = norm(q);
    const comunaNorm = norm(comuna);
    const categoriaNorm = norm(categoria);
    const subcategoriaNorm = norm(subcategoria);

    console.log("BUSCAR_PARAMS", {
      q,
      qNorm,
      comuna,
      comunaNorm,
      categoria,
      categoriaNorm,
      subcategoria,
      subcategoriaNorm,
      limit,
      offset,
    });

    let query = supabase
      .from("emprendedores")
      .select(
        `
        id,
        nombre,
        descripcion_corta,
        descripcion_larga,
        foto_principal_url,
        comuna_base_slug,
        categoria_slug,
        subcategoria_slug,
        whatsapp,
        instagram,
        web,
        email,
        publicado,
        search_text,
        nivel_cobertura,
        coverage_keys,
        coverage_labels
        `,
        { count: "exact" }
      )
      .eq("publicado", true);

    if (qNorm) {
      query = query.ilike("search_text", `%${qNorm}%`);
    }

    if (categoriaNorm) {
      query = query.eq("categoria_slug", categoriaNorm);
    }

    if (subcategoriaNorm) {
      query = query.eq("subcategoria_slug", subcategoriaNorm);
    }

    const res = await query.range(offset, offset + limit - 1);

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

    const rows = Array.isArray(res.data) ? res.data : [];
    const seed = getFiveMinuteSeed();

    let items: SearchItem[] = rows.map((r: any) => {
      const bucket = comunaNorm
        ? resolveBucket(
            {
              comuna_base_slug: r.comuna_base_slug,
              nivel_cobertura: r.nivel_cobertura,
              coverage_keys: r.coverage_keys,
            },
            comunaNorm
          )
        : null;

      return {
        id: s(r.id),
        nombre: s(r.nombre) || "Emprendimiento",
        descripcion_corta: r.descripcion_corta ?? null,
        descripcion_larga: r.descripcion_larga ?? null,
        foto_principal_url: r.foto_principal_url ?? null,
        comuna_slug: r.comuna_base_slug ?? null,
        comuna_nombre: r.comuna_base_slug ?? null,
        categoria_slug: r.categoria_slug ?? null,
        subcategoria_slug: r.subcategoria_slug ?? null,
        whatsapp: r.whatsapp ?? null,
        instagram: r.instagram ?? null,
        web: r.web ?? null,
        email: r.email ?? null,
        public: r.publicado === true,
        search_text: r.search_text ?? null,
        nivel_cobertura: r.nivel_cobertura ?? null,
        coverage_keys: Array.isArray(r.coverage_keys) ? r.coverage_keys : null,
        coverage_labels: Array.isArray(r.coverage_labels) ? r.coverage_labels : null,
        bucket,
      };
    });

    if (comunaNorm) {
      // Regla de producto: en búsquedas por comuna solo existen 2 bloques.
      items = items.filter(
        (item) => item.bucket === "exacta" || item.bucket === "cobertura_comuna"
      );
    }

    const bucketOrder: Record<NonNullable<SearchItem["bucket"]>, number> = {
      exacta: 0,
      cobertura_comuna: 1,
      regional: 2,
      nacional: 3,
      general: 4,
    };

    items.sort((a, b) => {
      const aBucket = a.bucket ?? "general";
      const bBucket = b.bucket ?? "general";

      const diff = bucketOrder[aBucket] - bucketOrder[bBucket];
      if (diff !== 0) return diff;

      // Rotación justa dentro de cada bloque usando semilla de 5 minutos
      const aKey = stableRotationKey(a.id, seed);
      const bKey = stableRotationKey(b.id, seed);
      if (aKey !== bKey) return aKey - bKey;

      return 0;
    });

    console.log("BUSCAR_BUCKETS", {
      exacta: items.filter((i) => i.bucket === "exacta").length,
      cobertura_comuna: items.filter((i) => i.bucket === "cobertura_comuna").length,
      regional: items.filter((i) => i.bucket === "regional").length,
      nacional: items.filter((i) => i.bucket === "nacional").length,
      general: items.filter((i) => i.bucket === "general" || !i.bucket).length,
    });

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
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