import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";
import {
  fichaPublicaEsMejoradaDesdeBusqueda,
  fotoListadoEmprendedorBusqueda,
} from "@/lib/estadoFicha";
import {
  countGaleriaPivotByEmprendedorIds,
  normalizeEmprendedorId,
} from "@/lib/emprendedorGaleriaPivot";
import {
  enrichmentFromMaps,
  fetchLocalesYModalidadesByEmprendedorIds,
  modalidadesDbToCardBadges,
  type LocalMiniForCard,
} from "@/lib/search/cardListingEnrichment";
import { normalizeTaxonomySlug } from "@/lib/normalizeTaxonomySlug";

export const runtime = "nodejs";

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_SEARCH_KEY!
);

const index = client.initIndex(process.env.ALGOLIA_INDEX_EMPRENDEDORES!);

const supabaseSrv =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

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

/** Misma prioridad que `pickField` en `estadoFicha`: tabla `emprendedores` primero, luego fila RPC. */
function pickHydratedFirst(
  rpc: Record<string, unknown>,
  emp: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  const h = emp ?? {};
  for (const k of keys) {
    const t = s((h as Record<string, unknown>)[k]);
    if (t) return t;
  }
  for (const k of keys) {
    const t = s(rpc[k]);
    if (t) return t;
  }
  return "";
}

function incluyeComuna(hit: any, comunaSlug: string, comunaNorm: string) {
  const slugs = [
    ...arr(hit.comunas_cobertura_slugs),
    ...arr(hit.comunas_cobertura_slugs_arr),
  ]
    .map(norm)
    .filter(Boolean);
  const nombres = [
    ...arr(hit.comunas_cobertura_nombres),
    ...arr(hit.comunas_cobertura_nombres_arr),
  ]
    .map(norm)
    .filter(Boolean);
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
    descripcion_larga: s(hit.descripcion_larga),
    whatsapp: s(hit.whatsapp),
    categoria_id: s(hit.categoria_id),
    categoria_nombre: s(hit.categoria_nombre),
    categoria_slug: s(hit.categoria_slug),
    subcategoria_slug: s(hit.subcategoria_slug),
    subcategorias_nombres: [
      ...arr(hit.subcategorias_nombres),
      ...arr(hit.subcategorias_nombres_arr),
    ],
    subcategorias_slugs: [
      ...arr(hit.subcategorias_slugs),
      ...arr(hit.subcategorias_slugs_arr),
    ],
    comuna_base_nombre: s(hit.comuna_base_nombre),
    comuna_base_slug: s(hit.comuna_base_slug),
    region_nombre: s(hit.region_nombre),
    comuna_base_id: hit.comuna_base_id ?? null,
    foto_principal_url: s(hit.foto_principal_url) || null,
    galeria_urls: arr(hit.galeria_urls),
    nivel_cobertura: s(hit.nivel_cobertura),
    comunas_cobertura_slugs: arr(hit.comunas_cobertura_slugs),
    comunas_cobertura_nombres: arr(hit.comunas_cobertura_nombres),
    regiones_cobertura_slugs_arr: arr(hit.regiones_cobertura_slugs_arr),
    cobertura: s(hit.cobertura),
    modalidades_atencion: arr(hit.modalidades_atencion),
    instagram: s(hit.instagram),
    web: s(hit.web),
    sitio_web: s(hit.sitio_web),
    plan_activo: hit.plan_activo === true,
    plan_expira_at: hit.plan_expira_at ?? null,
    trial_expira_at: hit.trial_expira_at ?? null,
    trial_expira: hit.trial_expira ?? null,
    created_at: hit.created_at ?? null,
    estado_publicacion: s(hit.estado_publicacion),
    ...(() => {
      const hitRec = hit as Record<string, unknown>;
      const ok = fichaPublicaEsMejoradaDesdeBusqueda(hitRec, null, 0);
      return { ficha_mejorada_contenido: ok, esFichaCompleta: ok };
    })(),
    en_tu_comuna: esTuComuna,
    atiende_tu_comuna: atiendeTuComuna,
    _nivel_norm: nivelCobertura,
  };
}

/**
 * Slugs de subcategoría presentes en la fila RPC (el RPC puede no reflejar la tabla `emprendedores`).
 */
function rpcRowSubSlugsNorm(rpcRow: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  const pushArr = (a: unknown) => {
    if (!Array.isArray(a)) return;
    for (const x of a) {
      const k = normalizeTaxonomySlug(x);
      if (k) out.add(k);
    }
  };
  pushArr(rpcRow.subcategorias_slugs);
  pushArr(rpcRow.subcategorias_slugs_arr);
  const principal = normalizeTaxonomySlug(
    rpcRow.subcategoria_slug ?? rpcRow.subcategoria_slug_final
  );
  if (principal) out.add(principal);
  return out;
}

function empRowSubSlugsNorm(emp: Record<string, unknown> | undefined): Set<string> {
  if (!emp) return new Set();
  const out = new Set<string>();
  const pushArr = (a: unknown) => {
    if (!Array.isArray(a)) return;
    for (const x of a) {
      const k = normalizeTaxonomySlug(x);
      if (k) out.add(k);
    }
  };
  pushArr(emp.subcategorias_slugs);
  pushArr(emp.subcategorias_slugs_arr);
  const principal = normalizeTaxonomySlug(
    emp.subcategoria_slug_final ?? emp.subcategoria_slug
  );
  if (principal) out.add(principal);
  return out;
}

/** Unión RPC + fila `emprendedores` (misma fuente que el usuario ve al contar por ítem). */
function mergedSubSlugsNorm(
  rpcRow: Record<string, unknown>,
  emp: Record<string, unknown> | undefined
): Set<string> {
  const out = rpcRowSubSlugsNorm(rpcRow);
  for (const x of empRowSubSlugsNorm(emp)) out.add(x);
  return out;
}

function rowMatchesSubcategoriaFilter(
  rpcRow: Record<string, unknown>,
  emp: Record<string, unknown> | undefined,
  subNorm: string
): boolean {
  if (!subNorm) return true;
  return mergedSubSlugsNorm(rpcRow, emp).has(subNorm);
}

function mapRpcRowToHitShape(
  rpcRow: Record<string, any>,
  subcategoriaFiltro: string,
  galeriaPivot = 0,
  emp?: Record<string, unknown>,
  localesMinisByEmp?: Map<string, LocalMiniForCard[]>,
  modalidadesByEmp?: Map<string, string[]>
) {
  const mergedNorm = mergedSubSlugsNorm(rpcRow as Record<string, unknown>, emp);
  const subSlugs = [...mergedNorm];
  const subNombres = Array.isArray(rpcRow.subcategorias_nombres)
    ? rpcRow.subcategorias_nombres.map((x: unknown) => s(x)).filter(Boolean)
    : [];
  const principal =
    normalizeTaxonomySlug(
      pickHydratedFirst(
        rpcRow as Record<string, unknown>,
        emp,
        "subcategoria_slug_final",
        "subcategoria_slug"
      )
    ) || subSlugs[0] || "";

  const rpcRec = rpcRow as Record<string, unknown>;
  const empRec = emp ?? null;

  const fichaMejorada =
    rpcRow.ficha_mejorada_contenido === true ||
    fichaPublicaEsMejoradaDesdeBusqueda(rpcRec, empRec, galeriaPivot);

  const fotoListed = fotoListadoEmprendedorBusqueda(rpcRec, empRec);
  const nivelCoberturaStr = pickHydratedFirst(rpcRec, empRec, "cobertura_tipo", "nivel_cobertura");

  const hitIdKey = normalizeEmprendedorId(rpcRow.id);
  const rpcMods = arr(rpcRow.modalidades_atencion);
  let resumenLocalesLineaOut: string | undefined;
  let modalidadesCardBadgesOut: string[] | undefined;
  if (
    hitIdKey &&
    localesMinisByEmp instanceof Map &&
    modalidadesByEmp instanceof Map
  ) {
    const ex = enrichmentFromMaps(hitIdKey, localesMinisByEmp, modalidadesByEmp);
    if (ex.resumenLocalesLinea) resumenLocalesLineaOut = ex.resumenLocalesLinea;
    modalidadesCardBadgesOut =
      ex.modalidadesCardBadges.length > 0
        ? ex.modalidadesCardBadges
        : modalidadesDbToCardBadges(rpcMods);
  } else {
    const fb = modalidadesDbToCardBadges(rpcMods);
    if (fb.length) modalidadesCardBadgesOut = fb;
  }
  if (modalidadesCardBadgesOut?.length === 0) modalidadesCardBadgesOut = undefined;

  return {
    id: s(rpcRow.id),
    slug: s(rpcRow.slug),
    nombre: pickHydratedFirst(rpcRec, empRec, "nombre_emprendimiento", "nombre"),
    descripcion_corta: pickHydratedFirst(rpcRec, empRec, "frase_negocio", "descripcion_corta"),
    descripcion_larga: pickHydratedFirst(rpcRec, empRec, "descripcion_libre", "descripcion_larga"),
    whatsapp: pickHydratedFirst(rpcRec, empRec, "whatsapp_principal", "whatsapp"),
    categoria_id: s(rpcRow.categoria_id),
    categoria_nombre: s(rpcRow.categoria_nombre),
    categoria_slug: s(rpcRow.categoria_slug),
    subcategoria_slug: principal || normalizeTaxonomySlug(subcategoriaFiltro),
    subcategorias_nombres: subNombres.length ? subNombres : [],
    subcategorias_slugs: subSlugs.length ? subSlugs : principal ? [principal] : [],
    subcategorias_slugs_arr: subSlugs.length ? subSlugs : [],
    comuna_base_nombre: s(rpcRow.comuna_nombre || rpcRow.comuna_base_nombre),
    comuna_base_slug: s(rpcRow.comuna_slug || rpcRow.comuna_base_slug),
    region_nombre: s(rpcRow.region_nombre),
    comuna_base_id: rpcRow.comuna_base_id ?? rpcRow.comuna_id ?? empRec?.comuna_base_id ?? null,
    foto_principal_url: s(fotoListed) || null,
    galeria_urls: arr(rpcRow.galeria_urls),
    nivel_cobertura: nivelCoberturaStr,
    comunas_cobertura_slugs: arr(rpcRow.comunas_cobertura_slugs),
    comunas_cobertura_nombres: arr(rpcRow.comunas_cobertura_nombres),
    regiones_cobertura_slugs_arr: arr(rpcRow.regiones_cobertura_slugs_arr),
    cobertura: s(rpcRow.cobertura_tipo || rpcRow.cobertura),
    modalidades_atencion: arr(rpcRow.modalidades_atencion),
    instagram: pickHydratedFirst(rpcRec, empRec, "instagram"),
    web: pickHydratedFirst(rpcRec, empRec, "web"),
    sitio_web: pickHydratedFirst(rpcRec, empRec, "sitio_web", "web"),
    plan_activo: empRec?.plan_activo === true || rpcRow.plan_activo === true,
    plan_expira_at: (empRec?.plan_expira_at ?? rpcRow.plan_expira_at) ?? null,
    trial_expira_at: (empRec?.trial_expira_at ?? rpcRow.trial_expira_at) ?? null,
    trial_expira: (empRec?.trial_expira ?? rpcRow.trial_expira) ?? null,
    created_at: (empRec?.created_at ?? rpcRow.created_at) ?? null,
    estado_publicacion: pickHydratedFirst(rpcRec, empRec, "estado_publicacion") || "publicado",
    ficha_mejorada_contenido: fichaMejorada,
    esFichaCompleta: fichaMejorada,
    en_tu_comuna: s(rpcRow.bloque_resultado) === "en_tu_comuna",
    atiende_tu_comuna: s(rpcRow.bloque_resultado) === "atienden_tu_comuna",
    _nivel_norm: norm(nivelCoberturaStr || s(rpcRow.cobertura_tipo) || s(rpcRow.nivel_cobertura)),
    resumenLocalesLinea: resumenLocalesLineaOut,
    modalidadesCardBadges: modalidadesCardBadgesOut,
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
    const subcategoriaSlug = normalizeTaxonomySlug(subcategoriaRaw);

    let categoriaIdDb: number | null = null;

    if (supabaseSrv) {
      const { data: catRow, error: catErr } = await supabaseSrv
        .from("categorias")
        .select("id")
        .eq("slug", categoriaSlug)
        .maybeSingle();

      if (catErr) {
        console.error("[api/categoria] categoria lookup", catErr);
      }

      const rawId = (catRow as { id?: unknown } | null)?.id;
      if (rawId != null) {
        const n = Number(rawId);
        categoriaIdDb = Number.isFinite(n) ? n : null;
      }
    }

    if (categoriaIdDb == null) {
      return NextResponse.json({
        ok: true,
        total: 0,
        categoria_slug: categoriaSlug,
        comuna: comunaRaw,
        subcategoria: subcategoriaRaw,
        subcategorias: [],
        grupos: {
          en_tu_comuna: [],
          atienden_tu_comuna: [],
          regional: [],
          nacional: [],
        },
      });
    }

    const categoriaIdStr = String(categoriaIdDb);

    // Con comuna: fuente canónica vía RPC (cobertura real), no Algolia.
    if (comunaSlug && supabaseSrv) {
      const { data, error } = await supabaseSrv.rpc("buscar_emprendedores_categoria_por_cobertura", {
        p_categoria_id: categoriaIdDb,
        p_comuna_slug: comunaSlug,
        p_subcategoria_slug: subcategoriaSlug || null,
        p_limit: 200,
      });

      if (error) {
        console.error("[api/categoria] rpc cobertura", error);
        return NextResponse.json(
          {
            ok: false,
            total: 0,
            error: error.message || "No se pudo cargar la categoría",
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

      const rowsRaw = Array.isArray(data) ? data : [];
      const rawIdsAll = rowsRaw.map((r: { id?: unknown }) => r?.id).filter((x) => x != null);

      const emprendedorByIdKey = new Map<string, Record<string, unknown>>();
      let localesMinisByCategoria = new Map<string, LocalMiniForCard[]>();
      let modalidadesByCategoria = new Map<string, string[]>();
      let pivotMap = new Map<string, number>();
      if (rawIdsAll.length) {
        const idStrs = rawIdsAll.map((x) => String(x));
        const [empRes, pivotMapRaw, cardMaps] = await Promise.all([
          supabaseSrv.from("emprendedores").select("*").in("id", idStrs),
          countGaleriaPivotByEmprendedorIds(supabaseSrv, rawIdsAll),
          fetchLocalesYModalidadesByEmprendedorIds(supabaseSrv, idStrs),
        ]);
        localesMinisByCategoria = cardMaps.localesMinisByEmp;
        modalidadesByCategoria = cardMaps.modalidadesByEmp;
        pivotMap = pivotMapRaw;
        const { data: empRows, error: empErr } = empRes;
        if (!empErr && Array.isArray(empRows)) {
          for (const e of empRows) {
            const k = normalizeEmprendedorId((e as { id?: unknown }).id);
            if (k) emprendedorByIdKey.set(k, e as Record<string, unknown>);
          }
        }
      }

      const rows =
        subcategoriaSlug && rowsRaw.length > 0
          ? rowsRaw.filter((r: Record<string, unknown>) => {
              const idKey = normalizeEmprendedorId((r as { id?: unknown }).id);
              const empRow = idKey ? emprendedorByIdKey.get(idKey) : undefined;
              return rowMatchesSubcategoriaFilter(r, empRow, subcategoriaSlug);
            })
          : rowsRaw;

      const mapped = rows.map((rpcRow: Record<string, any>) => {
        const idKey = normalizeEmprendedorId(rpcRow.id);
        const emp = idKey ? emprendedorByIdKey.get(idKey) : undefined;
        const pivot = idKey ? pivotMap.get(idKey) ?? 0 : 0;
        return mapRpcRowToHitShape(
          rpcRow,
          subcategoriaSlug,
          pivot,
          emp,
          localesMinisByCategoria,
          modalidadesByCategoria
        );
      });

      const en_tu_comuna = rotarDeterministico(
        mapped.filter((x) => x.en_tu_comuna),
        (x) => x.slug || x.id
      );

      const atienden_tu_comuna = rotarDeterministico(
        mapped.filter((x) => !x.en_tu_comuna && x.atiende_tu_comuna),
        (x) => x.slug || x.id
      );

      const total = en_tu_comuna.length + atienden_tu_comuna.length;

      return NextResponse.json({
        ok: true,
        total,
        categoria_slug: categoriaSlug,
        comuna: comunaRaw,
        subcategoria: subcategoriaRaw,
        subcategorias: [],
        grupos: {
          en_tu_comuna,
          atienden_tu_comuna,
          regional: [],
          nacional: [],
        },
      });
    }

    // Sin comuna (o sin Supabase): Algolia, listado en `regional`.
    // Si hay comuna pero no hay Supabase, se usa Algolia con buckets como antes.
    const result = await index.search("", {
      hitsPerPage: 100,
      filters: `categoria_slug:"${categoriaSlug}"`,
    });

    let hits = Array.isArray(result.hits) ? result.hits : [];

    hits = hits.filter((hit: any) => {
      const hid = s(hit.categoria_id);
      if (hid) return hid === categoriaIdStr;
      return norm(hit.categoria_slug) === categoriaSlug;
    });

    let items = hits.map((hit: any) => mapHit(hit, comunaSlug, comunaNorm));

    if (subcategoriaSlug) {
      items = items.filter((x: any) => {
        const slugs = arr(x.subcategorias_slugs).map(normalizeTaxonomySlug);
        const one = normalizeTaxonomySlug(x.subcategoria_slug);
        return slugs.includes(subcategoriaSlug) || one === subcategoriaSlug;
      });
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
          ["regional", "rm", "metropolitana", "varias_comunas"].includes(x._nivel_norm)
      );

      nacional = items.filter(
        (x) =>
          !x.en_tu_comuna &&
          !x.atiende_tu_comuna &&
          !["regional", "rm", "metropolitana", "varias_comunas"].includes(x._nivel_norm)
      );
    } else {
      regional = rotarDeterministico(items, (x) => x.slug || x.id);
    }

    en_tu_comuna = rotarDeterministico(en_tu_comuna, (x) => x.slug || x.id);
    atienden_tu_comuna = rotarDeterministico(atienden_tu_comuna, (x) => x.slug || x.id);
    regional = comunaSlug
      ? rotarDeterministico(regional, (x) => x.slug || x.id)
      : regional;
    nacional = rotarDeterministico(nacional, (x) => x.slug || x.id);

    const total = comunaSlug
      ? en_tu_comuna.length + atienden_tu_comuna.length + regional.length + nacional.length
      : regional.length;

    const subcategoriasMap = new Map<string, string>();

    for (const item of items) {
      const nombres = arr(item.subcategorias_nombres);
      const slugs = arr(item.subcategorias_slugs);

      slugs.forEach((sub, i) => {
        const nombre = nombres[i] || sub;
        if (sub && !subcategoriasMap.has(sub)) {
          subcategoriasMap.set(sub, nombre);
        }
      });
    }

    const subcategorias = Array.from(subcategoriasMap.entries()).map(([sl, nombre]) => ({
      slug: sl,
      nombre,
    }));

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
