import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";

export const runtime = "nodejs";

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_SEARCH_KEY!
);

const index = client.initIndex(process.env.ALGOLIA_INDEX_EMPRENDEDORES!);

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function norm(v: any): string {
  return s(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function uniqBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function seedRotacion() {
  return Math.floor(Date.now() / (1000 * 60 * 5));
}

function rotarDeterministico<T>(items: T[], keyFn: (item: T) => string): T[] {
  if (items.length <= 1) return items;

  const seed = seedRotacion();

  const sorted = [...items].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    return ka.localeCompare(kb);
  });

  const shift = seed % sorted.length;
  return [...sorted.slice(shift), ...sorted.slice(0, shift)];
}

function incluyeComuna(hit: any, comunaSlug: string, comunaNorm: string) {
  const slugs = arr(hit.comunas_cobertura_slugs).map(norm);
  const nombres = arr(hit.comunas_cobertura_nombres).map(norm);
  const coberturaTexto = norm(hit.cobertura);

  return (
    slugs.includes(comunaSlug) ||
    nombres.includes(comunaNorm) ||
    coberturaTexto.includes(comunaNorm)
  );
}

function mapHit(hit: any, comunaSlug: string, comunaNorm: string) {
  const comunaBaseSlug = norm(hit.comuna_base_slug);
  const nivelCobertura = norm(hit.nivel_cobertura);

  const esTuComuna = comunaSlug ? comunaBaseSlug === comunaSlug : false;
  const atiendeTuComuna =
    comunaSlug && !esTuComuna ? incluyeComuna(hit, comunaSlug, comunaNorm) : false;

  return {
    id: s(hit.id || hit.objectID),
    slug: s(hit.slug),
    nombre: s(hit.nombre),
    descripcion_corta: s(hit.descripcion_corta),
    categoria_nombre: s(hit.categoria_nombre),
    categoria_slug: s(hit.categoria_slug),
    subcategorias_nombres: arr(hit.subcategorias_nombres),
    subcategorias_slugs: arr(hit.subcategorias_slugs),
    comuna_base_nombre: s(hit.comuna_base_nombre),
    comuna_base_slug: s(hit.comuna_base_slug),
    foto_principal_url: s(hit.foto_principal_url) || null,
    nivel_cobertura: s(hit.nivel_cobertura),
    comunas_cobertura_slugs: arr(hit.comunas_cobertura_slugs),
    comunas_cobertura_nombres: arr(hit.comunas_cobertura_nombres),
    cobertura: s(hit.cobertura),
    modalidades_atencion: arr(hit.modalidades_atencion),
    en_tu_comuna: esTuComuna,
    atiende_tu_comuna: atiendeTuComuna,
    _nivel_norm: nivelCobertura,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const comunaRaw = s(searchParams.get("comuna"));
    const subcategoriaRaw = s(searchParams.get("subcategoria"));

    const categoriaSlug = norm(slug);
    const comunaSlug = norm(comunaRaw);
    const comunaNorm = norm(comunaRaw.replace(/-/g, " "));
    const subcategoriaSlug = norm(subcategoriaRaw);

    const result = await index.search("", {
      hitsPerPage: 100,
      filters: `categoria_slug:"${categoriaSlug}"`,
    });

    const hits = Array.isArray(result.hits) ? result.hits : [];

    let items = hits.map((hit: any) => mapHit(hit, comunaSlug, comunaNorm));

    // filtro por subcategoría
    if (subcategoriaSlug) {
      items = items.filter((x: any) =>
        arr(x.subcategorias_slugs).map(norm).includes(subcategoriaSlug)
      );
    }

    items = uniqBy(items, (x) => x.id || x.slug);

    let en_tu_comuna: any[] = [];
    let atienden_tu_comuna: any[] = [];
    let regional: any[] = [];
    let nacional: any[] = [];

    if (comunaSlug) {
      en_tu_comuna = items.filter((x) => x.en_tu_comuna);

      atienden_tu_comuna = items.filter(
        (x) => !x.en_tu_comuna && x.atiende_tu_comuna
      );

      regional = items.filter(
        (x) =>
          !x.en_tu_comuna &&
          !x.atiende_tu_comuna &&
          ["regional", "rm", "metropolitana", "varias_comunas"].includes(
            x._nivel_norm
          )
      );

      nacional = items.filter(
        (x) =>
          !x.en_tu_comuna &&
          !x.atiende_tu_comuna &&
          !["regional", "rm", "metropolitana", "varias_comunas"].includes(
            x._nivel_norm
          )
      );
    } else {
      regional = items;
    }

    en_tu_comuna = rotarDeterministico(en_tu_comuna, (x) => x.slug || x.id);
    atienden_tu_comuna = rotarDeterministico(
      atienden_tu_comuna,
      (x) => x.slug || x.id
    );
    regional = rotarDeterministico(regional, (x) => x.slug || x.id);
    nacional = rotarDeterministico(nacional, (x) => x.slug || x.id);

    const total =
      en_tu_comuna.length +
      atienden_tu_comuna.length +
      regional.length +
      nacional.length;

    const subcategoriasMap = new Map<string, string>();

    for (const item of items) {
      const nombres = arr(item.subcategorias_nombres);
      const slugs = arr(item.subcategorias_slugs);

      slugs.forEach((slug, i) => {
        const nombre = nombres[i] || slug;
        if (slug && !subcategoriasMap.has(slug)) {
          subcategoriasMap.set(slug, nombre);
        }
      });
    }

    const subcategorias = Array.from(subcategoriasMap.entries()).map(
      ([slug, nombre]) => ({
        slug,
        nombre,
      })
    );

    return NextResponse.json({
      ok: true,
      total,
      categoria_slug: categoriaSlug,
      comuna: comunaRaw,
      subcategoria: subcategoriaRaw,
      subcategorias,
      grupos: {
        en_tu_comuna,
        atienden_tu_comuna,
        regional,
        nacional,
      },
    });
  } catch (e: any) {
    console.error("CATEGORIA ERROR:", e);

    return NextResponse.json(
      {
        ok: false,
        total: 0,
        error: e?.message || "No se pudo cargar la categoría",
        subcategorias: [],
        grupos: {
          en_tu_comuna: [],
          atienden_tu_comuna: [],
          regional: [],
          nacional: [],
        },
      },
      { status: 500 }
    );
  }
}