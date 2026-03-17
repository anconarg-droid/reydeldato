/**
 * Sectores con al menos un emprendimiento en la comuna (base o cobertura).
 * Misma lógica territorial que /api/buscar (resolveBucket !== "general").
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SECTOR_LABELS: Record<string, string> = {
  alimentacion: "Alimentación",
  hogar_construccion: "Hogar y construcción",
  automotriz: "Automotriz",
  salud_bienestar: "Salud y bienestar",
  belleza_estetica: "Belleza y estética",
  mascotas: "Mascotas",
  eventos: "Eventos",
  educacion_clases: "Educación y clases",
  tecnologia: "Tecnología",
  comercio_tiendas: "Comercio y tiendas",
  transporte_fletes: "Transporte y fletes",
  jardin_agricultura: "Jardín y agricultura",
  profesionales_asesorias: "Profesionales y asesorías",
  turismo_alojamiento: "Turismo y alojamiento",
  otros: "Otros",
};

type Bucket =
  | "exacta"
  | "cobertura_comuna"
  | "varias_regiones"
  | "nacional"
  | "general";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function resolveBucket(
  item: {
    comuna_base_slug?: string | null;
    comuna_base_nombre?: string | null;
    coverage_labels?: string[] | null;
    coverage_keys?: string[] | null;
    nivel_cobertura?: string | null;
  },
  comunaBuscada: string
): Bucket {
  const comunaRaw = s(comunaBuscada);
  const comunaSlugLike = norm(comunaRaw);
  const comunaNameLike = norm(comunaRaw.replace(/-/g, " "));

  if (!comunaSlugLike && !comunaNameLike) return "general";

  const comunaBaseSlug = norm(item.comuna_base_slug);
  const comunaBaseNombre = norm(item.comuna_base_nombre);
  const coverageLabels = arr(item.coverage_labels).map(norm);
  const coverageKeys = arr(item.coverage_keys).map(norm);
  const nivel = s(item.nivel_cobertura);

  if (
    (comunaSlugLike && comunaBaseSlug === comunaSlugLike) ||
    (comunaNameLike && comunaBaseNombre === comunaNameLike)
  ) {
    return "exacta";
  }

  if (
    coverageLabels.includes(comunaSlugLike) ||
    coverageLabels.includes(comunaNameLike)
  ) {
    return "cobertura_comuna";
  }

  if (coverageKeys.includes(comunaSlugLike)) {
    return "cobertura_comuna";
  }

  if (
    coverageLabels.some(
      (label) =>
        (comunaSlugLike && label.includes(comunaSlugLike)) ||
        (comunaNameLike && label.includes(comunaNameLike))
    )
  ) {
    return "cobertura_comuna";
  }

  if (nivel === "varias_regiones") return "varias_regiones";
  if (nivel === "nacional") return "nacional";

  return "general";
}

type Row = {
  sector_slug: string | null;
  comuna_base_slug: string | null;
  comuna_base_nombre: string | null;
  coverage_labels: string[] | null;
  coverage_keys: string[] | null;
  nivel_cobertura: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const comuna = s(searchParams.get("comuna"));

    if (!comuna) {
      return NextResponse.json(
        { ok: true, sectors: [] as { slug: string; label: string; count: number }[] },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from("emprendedores")
      .select(
        `
        sector_slug,
        nivel_cobertura,
        coverage_keys,
        coverage_labels,
        comunas!emprendedores_comuna_base_id_fkey (
          nombre,
          slug
        )
      `
      )
      .eq("estado_publicacion", "publicado");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows: Row[] = (data || []).map((row: any) => ({
      sector_slug: row.sector_slug ?? null,
      comuna_base_slug: row.comunas?.slug ?? null,
      comuna_base_nombre: row.comunas?.nombre ?? null,
      coverage_labels: row.coverage_labels ?? null,
      coverage_keys: row.coverage_keys ?? null,
      nivel_cobertura: row.nivel_cobertura ?? null,
    }));

    const inComuna = rows.filter(
      (item) => resolveBucket(item, comuna) !== "general"
    );

    const countBySector: Record<string, number> = {};
    for (const item of inComuna) {
      const slug = s(item.sector_slug).toLowerCase();
      if (!slug) continue;
      countBySector[slug] = (countBySector[slug] || 0) + 1;
    }

    const sectors = Object.entries(countBySector)
      .filter(([, count]) => count > 0)
      .map(([slug, count]) => ({
        slug,
        label: SECTOR_LABELS[slug] || slug.replace(/_/g, " "),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ ok: true, sectors });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}
