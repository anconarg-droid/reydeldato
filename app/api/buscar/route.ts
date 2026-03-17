/**
 * Búsqueda desde Supabase (fuente de verdad).
 * Ranking obligatorio cuando hay comuna: 1) exacta 2) cobertura_comuna 3) varias_regiones 4) nacional.
 * Dentro de cada bloque: ver lib/rankingBuscar (perfil completo, rotación estable, distancia).
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseSearchIntent } from "@/lib/search/parseSearchIntent";
import {
  getDaySeed,
  stableRotationKey,
  isFullProfile,
  distanceRank,
} from "@/lib/rankingBuscar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RawRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta?: string | null;
  descripcion_larga?: string | null;
  foto_principal_url?: string | null;

  categoria_id?: string | null;
  categoria_nombre?: string | null;
  categoria_slug?: string | null;

  comuna_base_id?: string | null;
  comuna_base_nombre?: string | null;
  comuna_base_slug?: string | null;

  region_nombre?: string | null;

  nivel_cobertura?: string | null;
  coverage_keys?: string[] | null;
  coverage_labels?: string[] | null;
  subcategorias_slugs?: string[] | null;
  keywords?: string[] | null;
  modalidades_atencion?: string[] | null;

  // Nueva clasificación V1 (opcionales)
  tipo_actividad?: string | null;
  sector_slug?: string | null;
  tags_slugs?: string[] | null;
  keywords_clasificacion?: string[] | null;

  whatsapp?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;

  estado_publicacion?: string | null;

  /** Para ranking justo: menos mostrados primero */
  impresiones_busqueda?: number | null;
  /** Para etiqueta "Nuevo" en tarjeta */
  created_at?: string | null;
  plan?: string | null;
  trial_expira?: string | null;
  trial_inicia_at?: string | null;
  trial_expira_at?: string | null;
  plan_tipo?: string | null;
  plan_periodicidad?: string | null;
  plan_activo?: boolean | null;
  plan_inicia_at?: string | null;
  plan_expira_at?: string | null;
};

type Bucket =
  | "local"           // tiene local físico en la comuna buscada
  | "exacta"          // comuna_base_id = comuna buscada
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

function includesText(haystack: unknown, needle: string) {
  const h = norm(haystack);
  const n = norm(needle);

  if (!h || !n) return false;

  return (
    h.includes(n) ||
    h.includes(`${n}s`) ||
    h.includes(n.replace(/s$/, "")) ||
    h.split(/\s+/).some((word) => word === n)
  );
}

function textScore(item: RawRow, q: string) {
  const query = norm(q);
  if (!query) return 1;

  const words = query.split(/\s+/).filter(Boolean);

  let score = 0;

  const nombre = norm(item.nombre);
  const descripcionCorta = norm(item.descripcion_corta);
  const descripcionLarga = norm(item.descripcion_larga);
  const categoria = norm(item.categoria_nombre);
  const comunaBase = norm(item.comuna_base_nombre);
  const sectorSlug = norm(item.sector_slug);
  const tags = arr(item.tags_slugs);
  const kwClasif = arr(item.keywords_clasificacion);
  const subcats = arr(item.subcategorias_slugs);
  const legacyKeywords = arr(item.keywords);
  const coverage = arr(item.coverage_labels);

  for (const word of words) {

    // Nombre sigue siendo muy importante
    if (nombre === word) score += 200;
    else if (nombre.startsWith(word)) score += 120;
    else if (includesText(nombre, word)) score += 80;

    if (includesText(descripcionCorta, word)) score += 40;
    if (includesText(descripcionLarga, word)) score += 20;
    // Categoría legacy: señal secundaria
    if (includesText(categoria, word)) score += 8;
    if (includesText(comunaBase, word)) score += 10;

    // Clasificación nueva: fuente principal
    if (tags.length) {
      for (const tag of tags) {
        if (includesText(tag, word)) {
          // etiquetas oficiales: señal fuerte
          score += 30;
        }
      }
    }

    if (kwClasif.length) {
      for (const kw of kwClasif) {
        if (includesText(kw, word)) {
          // keywords_clasificacion: un poco menos que tags_slugs
          score += 18;
        }
      }
    }

    if (sectorSlug && includesText(sectorSlug, word)) {
      // pequeño boost por sector si coincide
      score += 10;
    }

    // Subcategorías legacy: dejan de ser la señal principal
    if (subcats.some((x) => includesText(x, word))) score += 10;
    // Keywords legacy: señal suave
    if (legacyKeywords.some((x) => includesText(x, word))) score += 8;
    if (coverage.some((x) => includesText(x, word))) score += 5;
  }

  return score;
}

/**
 * Desempate suave por calidad de ficha (no dominante).
 * Suma pequeña: foto, descripción, WhatsApp, tags.
 */
function qualityTiebreaker(item: RawRow): number {
  let q = 0;
  if (s(item.foto_principal_url)) q += 2;
  const desc = s(item.descripcion_corta);
  if (desc.length >= 30) q += 2;
  if (s(item.whatsapp)) q += 1;
  const tags = arr(item.tags_slugs);
  if (tags.length >= 2) q += 1;
  return q;
}

function resolveBucket(item: RawRow, comunaBuscada: string, tieneLocalEnComuna: boolean): Bucket {
  const comunaRaw = s(comunaBuscada);
  const comunaSlugLike = norm(comunaRaw); // ej: "calera-de-tango"
  const comunaNameLike = norm(comunaRaw.replace(/-/g, " ")); // ej: "calera de tango"

  if (!comunaSlugLike && !comunaNameLike) return "general";

  // 0) tiene local físico en la comuna buscada (prioridad máxima)
  if (tieneLocalEnComuna) return "local";

  const comunaBaseSlug = norm(item.comuna_base_slug);
  const comunaBaseNombre = norm(item.comuna_base_nombre);
  const coverageLabels = arr(item.coverage_labels).map(norm);
  const coverageKeys = arr(item.coverage_keys).map(norm);
  const nivel = s(item.nivel_cobertura);

  // 1) base exacta por slug o nombre
  if (
    (comunaSlugLike && comunaBaseSlug === comunaSlugLike) ||
    (comunaNameLike && comunaBaseNombre === comunaNameLike)
  ) {
    return "exacta";
  }

  // 2) cobertura directa por comuna en etiquetas legibles
  if (
    coverageLabels.includes(comunaSlugLike) ||
    coverageLabels.includes(comunaNameLike)
  ) {
    return "cobertura_comuna";
  }

  // 2b) coverage_keys contiene directamente la comuna (slug/clave)
  if (coverageKeys.includes(comunaSlugLike)) {
    return "cobertura_comuna";
  }

  // 2c) Coincidencia más laxa: la comuna buscada aparece dentro de alguna etiqueta de cobertura
  if (
    coverageLabels.some(
      (label) =>
        (comunaSlugLike && label.includes(comunaSlugLike)) ||
        (comunaNameLike && label.includes(comunaNameLike))
    )
  ) {
    return "cobertura_comuna";
  }

  if (nivel === "varias_regiones") {
    return "varias_regiones";
  }

  if (nivel === "nacional") {
    return "nacional";
  }

  return "general";
}

function bucketRank(bucket: Bucket) {
  switch (bucket) {
    case "local":
      return 0;
    case "exacta":
      return 1;
    case "cobertura_comuna":
      return 2;
    case "varias_regiones":
      return 3;
    case "nacional":
      return 4;
    default:
      return 5;
  }
}

function exposeBucket(bucket: Bucket): "local" | "exacta" | "cobertura_comuna" | "regional" | "nacional" | "relacionada" {
  switch (bucket) {
    case "local":
      return "local";
    case "exacta":
      return "exacta";
    case "cobertura_comuna":
      return "cobertura_comuna";
    case "varias_regiones":
      return "regional";
    case "nacional":
      return "nacional";
    default:
      return "relacionada";
  }
}

/** Mapea bucket a comuna_match_source para la respuesta. */
function bucketToMatchSource(bucket: Bucket): "local" | "base" | "cobertura" | "regional" | "nacional" | null {
  switch (bucket) {
    case "local": return "local";
    case "exacta": return "base";
    case "cobertura_comuna": return "cobertura";
    case "varias_regiones": return "regional";
    case "nacional": return "nacional";
    default: return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    let q = s(searchParams.get("q"));
    let comuna = s(searchParams.get("comuna"));
    let sector = s(searchParams.get("sector"));
    const subcategoria = s(searchParams.get("subcategoria"));
    const tipoActividad = s(searchParams.get("tipo_actividad"));
    const order = s(searchParams.get("order")); // todos | perfil_completo | nuevos | mas_contactados
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || "100"), 300));

    // Normalizar siempre: quitar comuna de q y usar intención para sector/q limpia
    if (q) {
      const parsed = parseSearchIntent(q);
      q = parsed.finalQuery;
      if (parsed.comunaSlug) comuna = comuna || parsed.comunaSlug;
      if (parsed.sectorSlug) sector = sector || parsed.sectorSlug;
    }

    const hasAnyFilter = !!(q || comuna || sector || subcategoria || tipoActividad);
    if (!hasAnyFilter) {
      return NextResponse.json({
        ok: true,
        total: 0,
        q: "",
        comuna: "",
        items: [],
      });
    }

    const comunaSlugNorm = comuna ? norm(comuna).replace(/\s+/g, "-") : "";

    // Si hay comuna, verificar que esté activa antes de devolver resultados
    if (comuna) {
      const { data: activaRow } = await supabase
        .from("comunas_activas")
        .select("comuna_slug, comuna_nombre, activa")
        .eq("comuna_slug", comunaSlugNorm)
        .maybeSingle();

      if (!activaRow || activaRow.activa !== true) {
        const { data: resumenRow } = await supabase
          .from("vw_comunas_por_abrir")
          .select("comuna_slug, comuna_nombre, total_emprendedores, faltan_emprendedores_meta")
          .eq("comuna_slug", comunaSlugNorm)
          .maybeSingle();

        const comunaNombre =
          s(activaRow?.comuna_nombre) ||
          s((resumenRow as { comuna_nombre?: string } | null)?.comuna_nombre) ||
          comunaSlugNorm.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const total = Number((resumenRow as { total_emprendedores?: number } | null)?.total_emprendedores) || 0;
        const faltan = Number((resumenRow as { faltan_emprendedores_meta?: number } | null)?.faltan_emprendedores_meta) || 40;
        const progreso = [
          { nombre: "Emprendimientos", actual: total, meta: Math.max(total + 1, total + faltan) },
        ];

        return NextResponse.json({
          ok: true,
          modo: "comuna_en_preparacion",
          comuna: comunaNombre,
          comuna_slug: comunaSlugNorm,
          progreso,
          total: 0,
          items: [],
        });
      }
    }

    // Cuando hay comuna: traer emprendedores con base, con local en la comuna, o cobertura que la incluya
    let comunaId: string | null = null;
    let idsWithLocalInComuna = new Set<string>();
    if (comunaSlugNorm) {
      const { data: comunaRow } = await supabase
        .from("comunas")
        .select("id")
        .eq("slug", comunaSlugNorm)
        .maybeSingle();
      comunaId = (comunaRow as { id?: string } | null)?.id ?? null;
      if (comunaId) {
        const { data: localesEnComuna } = await supabase
          .from("emprendedor_locales")
          .select("emprendedor_id")
          .eq("comuna_id", comunaId);
        idsWithLocalInComuna = new Set(
          (localesEnComuna || []).map((r: { emprendedor_id?: string }) => r.emprendedor_id).filter(Boolean) as string[]
        );
      }
    }

    // 1) Intento de mapear la query a un tag_slug usando search_alias
    let aliasTagSlug: string | null = null;
    const normQ = norm(q);
    if (normQ) {
      const { data: aliasRow, error: aliasError } = await supabase
        .from("search_alias")
        .select("tag_slug")
        .eq("alias", normQ)
        .maybeSingle();

      if (!aliasError && aliasRow?.tag_slug) {
        aliasTagSlug = String(aliasRow.tag_slug).trim();
      }
    }

    const effectiveQ = aliasTagSlug ? "" : q;

    const selectBase = `
        id,
        slug,
        nombre,
        descripcion_corta,
        descripcion_larga,
        foto_principal_url,
        categoria_id,
        comuna_base_id,
        nivel_cobertura,
        coverage_keys,
        coverage_labels,
        subcategorias_slugs,
        keywords,
        modalidades_atencion,
        tipo_actividad,
        sector_slug,
        tags_slugs,
        keywords_clasificacion,
        whatsapp,
        instagram,
        sitio_web,
        estado_publicacion,
        impresiones_busqueda,
        created_at,
        plan,
        trial_expira,
        categorias (
          nombre,
          slug
        ),
        comunas!emprendedores_comuna_base_id_fkey (
          nombre,
          slug
        )
      `;

    const selectConPlanes = `
        id,
        slug,
        nombre,
        descripcion_corta,
        descripcion_larga,
        foto_principal_url,
        categoria_id,
        comuna_base_id,
        nivel_cobertura,
        coverage_keys,
        coverage_labels,
        subcategorias_slugs,
        keywords,
        modalidades_atencion,
        tipo_actividad,
        sector_slug,
        tags_slugs,
        keywords_clasificacion,
        whatsapp,
        instagram,
        sitio_web,
        estado_publicacion,
        impresiones_busqueda,
        created_at,
        plan,
        trial_expira,
        trial_inicia_at,
        trial_expira_at,
        plan_tipo,
        plan_periodicidad,
        plan_activo,
        plan_inicia_at,
        plan_expira_at,
        categorias (
          nombre,
          slug
        ),
        comunas!emprendedores_comuna_base_id_fkey (
          nombre,
          slug
        )
      `;

    let data: any[] | null = null;
    let error: { message: string } | null = null;

    // Con comuna: base en la comuna O cobertura que incluya la comuna. Si hay subcategoría, filtrar por ella en cada consulta para no depender del merge de 500.
    const subcategoriaNorm = subcategoria ? norm(subcategoria).replace(/\s+/g, "-") : "";
    if (comunaSlugNorm) {
      const runSelect = async (select: string) => {
        const base = () =>
          supabase
            .from("emprendedores")
            .select(select)
            .eq("estado_publicacion", "publicado");
        const queries: Promise<{ data: any[]; error: { message: string } | null }>[] = [];
        const add = (q: ReturnType<typeof base>, extra: (x: ReturnType<typeof base>) => any) => {
          const built = extra(q);
          queries.push(built.limit(500).then((r: any) => ({ data: r.data || [], error: r.error })));
        };
        if (subcategoriaNorm) {
          if (comunaId) {
            add(base(), (q) => q.eq("comuna_base_id", comunaId).contains("tags_slugs", [subcategoriaNorm]));
            add(base(), (q) => q.eq("comuna_base_id", comunaId).contains("subcategorias_slugs", [subcategoriaNorm]));
            if (idsWithLocalInComuna.size > 0) {
              add(base(), (q) => q.in("id", Array.from(idsWithLocalInComuna)).contains("tags_slugs", [subcategoriaNorm]));
              add(base(), (q) => q.in("id", Array.from(idsWithLocalInComuna)).contains("subcategorias_slugs", [subcategoriaNorm]));
            }
          }
          add(base(), (q) => q.contains("coverage_labels", [comunaSlugNorm]).contains("tags_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.contains("coverage_labels", [comunaSlugNorm]).contains("subcategorias_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.contains("coverage_keys", [comunaSlugNorm]).contains("tags_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.contains("coverage_keys", [comunaSlugNorm]).contains("subcategorias_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.eq("nivel_cobertura", "varias_regiones").contains("tags_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.eq("nivel_cobertura", "varias_regiones").contains("subcategorias_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.eq("nivel_cobertura", "nacional").contains("tags_slugs", [subcategoriaNorm]));
          add(base(), (q) => q.eq("nivel_cobertura", "nacional").contains("subcategorias_slugs", [subcategoriaNorm]));
        } else {
          if (comunaId) add(base(), (q) => q.eq("comuna_base_id", comunaId));
          if (idsWithLocalInComuna.size > 0) add(base(), (q) => q.in("id", Array.from(idsWithLocalInComuna)));
          add(base(), (q) => q.contains("coverage_labels", [comunaSlugNorm]));
          add(base(), (q) => q.contains("coverage_keys", [comunaSlugNorm]));
          add(base(), (q) => q.eq("nivel_cobertura", "varias_regiones"));
          add(base(), (q) => q.eq("nivel_cobertura", "nacional"));
        }
        const results = await Promise.all(queries);
        const byId = new Map<string, any>();
        for (const r of results) {
          for (const row of r.data) byId.set(row.id, row);
        }
        const merged = Array.from(byId.values()).slice(0, 500);
        const err = results.find((r) => r.error)?.error ?? null;
        return { data: merged, error: err };
      };
      const resConPlanes = await runSelect(selectConPlanes);
      if (resConPlanes.error && /does not exist|column .* does not exist/i.test(resConPlanes.error.message)) {
        const resBase = await runSelect(selectBase);
        data = resBase.data;
        error = resBase.error;
      } else {
        data = resConPlanes.data;
        error = resConPlanes.error;
      }
    } else {
      const buildQuery = (select: string) =>
        supabase
          .from("emprendedores")
          .select(select)
          .eq("estado_publicacion", "publicado")
          .limit(500);
      const resConPlanes = await buildQuery(selectConPlanes);
      if (resConPlanes.error && /does not exist|column .* does not exist/i.test(resConPlanes.error.message)) {
        const resBase = await buildQuery(selectBase);
        data = resBase.data;
        error = resBase.error;
      } else {
        data = resConPlanes.data;
        error = resConPlanes.error;
      }
    }

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const rows: RawRow[] = (data || []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      descripcion_corta: row.descripcion_corta,
      descripcion_larga: row.descripcion_larga,
      foto_principal_url: row.foto_principal_url,

      categoria_id: row.categoria_id,
      categoria_nombre: row.categorias?.nombre || null,
      categoria_slug: row.categorias?.slug || null,

      comuna_base_id: row.comuna_base_id,
      comuna_base_nombre: row.comunas?.nombre || null,
      comuna_base_slug: row.comunas?.slug || null,

      nivel_cobertura: row.nivel_cobertura,
      coverage_keys: row.coverage_keys || [],
      coverage_labels: row.coverage_labels || [],
      subcategorias_slugs: row.subcategorias_slugs || [],
      keywords: row.keywords || [],
      modalidades_atencion: row.modalidades_atencion || [],

      tipo_actividad: row.tipo_actividad || null,
      sector_slug: row.sector_slug || null,
      tags_slugs: row.tags_slugs || [],
      keywords_clasificacion: row.keywords_clasificacion || [],

      whatsapp: row.whatsapp,
      instagram: row.instagram,
      sitio_web: row.sitio_web,

      estado_publicacion: row.estado_publicacion,
      impresiones_busqueda: row.impresiones_busqueda != null ? Number(row.impresiones_busqueda) : 0,
      created_at: row.created_at ?? null,
      plan: row.plan ?? null,
      trial_expira: row.trial_expira ?? (row as any).trial_expira_at ?? null,
      trial_inicia_at: (row as any).trial_inicia_at ?? null,
      trial_expira_at: (row as any).trial_expira_at ?? row.trial_expira ?? null,
      plan_tipo: (row as any).plan_tipo ?? null,
      plan_periodicidad: (row as any).plan_periodicidad ?? null,
      plan_activo: (row as any).plan_activo === true,
      plan_inicia_at: (row as any).plan_inicia_at ?? null,
      plan_expira_at: (row as any).plan_expira_at ?? null,
    }));

    let filtered = rows;
    if (sector) {
      const sectorNorm = norm(sector);
      filtered = filtered.filter((item) => norm(item.sector_slug) === sectorNorm);
    }
    if (tipoActividad) {
      const tipoNorm = norm(tipoActividad);
      filtered = filtered.filter((item) => norm(item.tipo_actividad) === tipoNorm);
    }
    if (subcategoria) {
      const subNorm = norm(subcategoria);
      filtered = filtered.filter((item) => {
        const tags = arr(item.tags_slugs).map(norm);
        const subcats = arr(item.subcategorias_slugs).map(norm);
        return tags.includes(subNorm) || subcats.includes(subNorm);
      });
    }

    // Si la query fue mapeada a un alias de intención (tag_slug),
    // nos quedamos solo con emprendimientos que tengan ese tag.
    if (aliasTagSlug) {
      const aliasNorm = norm(aliasTagSlug);
      filtered = filtered.filter((item) =>
        arr(item.tags_slugs).some((tag) => norm(tag) === aliasNorm)
      );
    }

    // Filtro rápido: solo perfiles completos (plan activo o trial vigente)
    if (order === "perfil_completo") {
      const now = new Date().toISOString();
      filtered = filtered.filter((item: RawRow & { plan_activo?: boolean; trial_expira_at?: string | null }) => {
        if (item.plan_activo === true) return true;
        const expira = item.trial_expira_at ?? (item as any).trial_expira ?? null;
        if (expira && String(expira) > now) return true;
        return false;
      });
    }

    const daySeed = getDaySeed();
    const comunaSlugForDistance = comunaSlugNorm || "";

    const tieneLocalEnComuna = (id: string) => comunaId != null && idsWithLocalInComuna.has(id);

    let scored = filtered
      .map((item) => {
        const score = textScore(item, effectiveQ);
        const _bucket = resolveBucket(item, comuna, tieneLocalEnComuna(item.id));
        const _quality = qualityTiebreaker(item);
        const _impresiones = Number(item.impresiones_busqueda ?? 0);
        const _isFullProfile = isFullProfile(item);
        const _stableKey = stableRotationKey(item.id, daySeed);
        const _distanceRank =
          _bucket !== "exacta" && item.comuna_base_slug && comunaSlugForDistance
            ? distanceRank(item.comuna_base_slug, comunaSlugForDistance)
            : 0;

        return {
          ...item,
          _bucket,
          _score: score,
          _quality,
          _impresiones,
          _isFullProfile,
          _stableKey,
          _distanceRank,
        };
      })
      .filter((item) => {
        if (aliasTagSlug) return true;
        if (q) return item._score > 0;
        return true;
      });

    scored = scored
      .sort((a, b) => {
        const byBucket = bucketRank(a._bucket) - bucketRank(b._bucket);
        if (byBucket !== 0) return byBucket;

        const isTopTier = a._bucket === "exacta" || a._bucket === "local";
        const preferNew = order === "nuevos";

        if (isTopTier) {
          // Bloque local/exacta: perfiles completos primero, rotación estable, ligera prioridad a nuevos
          if (preferNew) {
            const at = (a.created_at ?? "") as string;
            const bt = (b.created_at ?? "") as string;
            const byDate = bt.localeCompare(at);
            if (byDate !== 0) return byDate;
          }
          if (a._isFullProfile !== b._isFullProfile) return a._isFullProfile ? -1 : 1;
          if (a._stableKey !== b._stableKey) return a._stableKey - b._stableKey;
          const at = (a.created_at ?? "") as string;
          const bt = (b.created_at ?? "") as string;
          return bt.localeCompare(at);
        }

        // Bloque 2 (y resto): distancia geográfica, perfiles completos, rotación leve; clics solo como desempate
        if (a._distanceRank !== b._distanceRank) return a._distanceRank - b._distanceRank;
        if (a._isFullProfile !== b._isFullProfile) return a._isFullProfile ? -1 : 1;
        if (preferNew) {
          const at = (a.created_at ?? "") as string;
          const bt = (b.created_at ?? "") as string;
          const byDate = bt.localeCompare(at);
          if (byDate !== 0) return byDate;
        }
        if (a._stableKey !== b._stableKey) return a._stableKey - b._stableKey;
        const byImpresiones = a._impresiones - b._impresiones;
        if (byImpresiones !== 0) return byImpresiones;
        const byQuality = b._quality - a._quality;
        if (byQuality !== 0) return byQuality;
        return a.nombre.localeCompare(b.nombre, "es");
      })
      .slice(0, limit)
      .map(({ _score, _bucket, _quality, _impresiones, _isFullProfile, _stableKey, _distanceRank, ...item }) => {
        const bucket = exposeBucket(_bucket);
        const comuna_match_source = bucketToMatchSource(_bucket);
        const tiene_local_en_comuna = _bucket === "local";
        const atiende_comuna = ["local", "exacta", "cobertura_comuna", "regional", "nacional"].includes(_bucket);
        return {
          ...item,
          bucket,
          tiene_local_en_comuna,
          atiende_comuna,
          comuna_match_source,
        };
      });

    // Chips "Refina tu búsqueda": solo desde resultados ya filtrados por sector.
    // Si hay sector activo y muy pocos resultados, ocultar el bloque antes que mostrar chips de otros sectores.
    let suggested_terms: string[] = [];
    const minResultsForChips = sector ? 3 : 1;
    if (q && scored.length >= minResultsForChips) {
      const seen = new Set<string>();
      const queryNorm = norm(q);
      for (const item of scored) {
        for (const tag of arr(item.tags_slugs)) {
          const label = tag.replace(/_/g, " ").trim();
          if (!label || norm(label) === queryNorm) continue;
          const key = norm(label);
          if (!seen.has(key)) {
            seen.add(key);
            suggested_terms.push(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
          }
        }
        for (const kw of arr(item.keywords_clasificacion)) {
          const label = kw.trim();
          if (!label || norm(label) === queryNorm) continue;
          const key = norm(label);
          if (!seen.has(key)) {
            seen.add(key);
            suggested_terms.push(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
          }
        }
      }
      suggested_terms = suggested_terms.slice(0, 12);
    }

    return NextResponse.json({
      ok: true,
      total: scored.length,
      q,
      comuna,
      items: scored,
      ...(suggested_terms.length > 0 ? { suggested_terms } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado en búsqueda.",
      },
      { status: 500 }
    );
  }
}