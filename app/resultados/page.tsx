import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import { isResolvedQueryExactGas } from "@/lib/gasQueryExcludeGasfiteria";
import { normalizeText } from "@/lib/search/normalizeText";
import { searchEmprendedoresGlobalText } from "@/lib/resultadosGlobalSupabase";
import { slugify } from "@/lib/slugify";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import ResultadosClient from "./ResultadosClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    comuna?: string;
    q?: string;
    categoria?: string;
    subcategoria?: string;
    subcategoria_id?: string;
    /** Slug de región: búsqueda global acotada territorialmente (p. ej. desde comuna en activación). */
    region?: string;
    /**
     * TEMP solo pruebas (quitar después): `?country=CL` fuerza país Chile para la detección automática
     * cuando no hay `?region=`; no reemplaza a `?region=` (override principal).
     */
    country?: string;
  }>;
};

/**
 * ISO 3166-2 (sufijo tras CL-) → `regiones.slug` (Chile).
 * Solo códigos usados oficialmente; siempre se valida contra la tabla `regiones`.
 */
const CHILE_ISO3166_2_SUFFIX_TO_REGION_SLUG: Record<string, string> = {
  AP: "arica-y-parinacota",
  TA: "tarapaca",
  AN: "antofagasta",
  AT: "atacama",
  CO: "coquimbo",
  VS: "valparaiso",
  RM: "metropolitana",
  LI: "ohiggins",
  ML: "maule",
  NB: "nuble",
  BI: "biobio",
  AR: "la-araucania",
  LR: "los-rios",
  LL: "los-lagos",
  AI: "aysen",
  MA: "magallanes",
};

function parseChileRegionCodeFromVercelGeo(raw: string | null): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (/^CL-[A-Z]{1,3}$/.test(upper)) {
    return upper.slice(3);
  }
  if (/^[A-Z]{2}$/.test(upper)) {
    return upper;
  }
  return null;
}

/**
 * Resuelve una fila en `regiones` por slug canónico.
 * Acepta el mismo alias que el filtro global (`normRegionSlugForMatch` en resultadosGlobalSupabase):
 * cobertura y algunas BDs usan `region-{slug}` mientras `regiones.slug` y `?region=` suelen usar `{slug}`.
 */
async function resolveRegionRowBySlug(
  supabase: ReturnType<typeof createSupabaseServerPublicClient>,
  slug: string
): Promise<{ slug: string; nombre: string } | null> {
  const s = String(slug ?? "").trim().toLowerCase();
  if (!s) return null;
  const alt = s.startsWith("region-")
    ? s.slice("region-".length)
    : `region-${s}`;
  const candidates = alt && alt !== s ? [s, alt] : [s];
  const { data } = await supabase
    .from("regiones")
    .select("slug, nombre")
    .in("slug", candidates)
    .limit(1)
    .maybeSingle();
  if (!data?.slug) return null;
  const nombre = String((data as { nombre?: unknown }).nombre ?? "").trim();
  const slugRow = String((data as { slug: string }).slug);
  return { slug: slugRow, nombre: nombre || slugRow };
}

export default async function ResultadosPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  /** Temporal: inspeccionar headers en producción (quitar después). */
  const h = await headers();
  // eslint-disable-next-line no-console -- debug temporal
  console.log("HEADERS DEBUG", Object.fromEntries(h.entries()));
  const comunaRaw = (params.comuna ?? "").trim();
  const qRaw = (params.q ?? "").trim();
  const subcategoriaRaw = (params.subcategoria ?? "").trim();
  const subcategoriaIdRaw = (params.subcategoria_id ?? "").trim();
  const categoriaRaw = (params.categoria ?? "").trim();
  const regionRaw = (params.region ?? "").trim();
  const regionSlugFromUrl = regionRaw ? slugify(regionRaw) : "";
  const countryQueryDebug = (params.country ?? "").trim().toUpperCase();
  /** Slug de comuna canónico (sin acentos, guiones). */
  const comuna = comunaRaw ? slugify(comunaRaw) : "";

  /**
   * Comuna conocida en DB → URL canónica /[slug] (evita depender de /resultados?comuna=).
   * Si el slug no existe, no redirigir: /[slug] manda a /resultados?comuna= y habría bucle.
   */
  let comunaNombre: string | null = null;
  if (comuna) {
    const supabase = createSupabaseServerPublicClient();
    const { data: row } = await supabase
      .from("comunas")
      .select("slug, nombre")
      .eq("slug", comuna)
      .maybeSingle();
    if (row?.slug) {
      comunaNombre = row.nombre ? String(row.nombre) : null;
      const sp = new URLSearchParams();
      const tieneIntentoSub = Boolean(subcategoriaRaw || subcategoriaIdRaw);
      if (subcategoriaRaw) sp.set("subcategoria", slugify(subcategoriaRaw));
      if (subcategoriaIdRaw) sp.set("subcategoria_id", subcategoriaIdRaw);
      if (!tieneIntentoSub) {
        if (categoriaRaw) sp.set("categoria", slugify(categoriaRaw));
        else if (qRaw) sp.set("q", qRaw);
      }
      const qs = sp.toString();
      redirect(`/${encodeURIComponent(comuna)}${qs ? `?${qs}` : ""}`);
    }
  }
  const subcategoria = subcategoriaRaw ? slugify(subcategoriaRaw) : "";
  const subcategoriaId = subcategoriaIdRaw ? subcategoriaIdRaw : "";
  const categoria = categoriaRaw ? slugify(categoriaRaw) : "";
  const navegacionEstructurada =
    Boolean(subcategoria) || Boolean(subcategoriaId) || Boolean(categoria);
  const qRawCliente = navegacionEstructurada ? "" : qRaw;
  /** Texto de búsqueda sin acentos y en minúsculas (misma lógica que el resto del motor). */
  const q = qRawCliente ? normalizeText(qRawCliente) : "";

  const supabase = createSupabaseServerPublicClient();

  let regionFocoSlug: string | null = null;
  let regionFocoNombre: string | null = null;
  /** Solo depuración: fila devuelta por `resolveRegionRowBySlug` cuando hay `?region=` (quitar al cerrar). */
  let resolveRegionRowBySlugResult: { slug: string; nombre: string } | null = null;

  /**
   * Región en búsqueda global (sin comuna en URL):
   * - Override principal: `?region=` → se resuelve contra `regiones` si el slug existe (no depende de IP/país).
   * - Sin `?region=`: detección automática solo si el país efectivo es CL (`x-vercel-ip-country`, o
   *   TEMP `?country=CL` solo para pruebas — quitar cuando ya no haga falta).
   * La detección por IP puede fallar dependiendo del ISP o routing del usuario.
   */
  if (q && !comuna) {
    if (regionSlugFromUrl) {
      const row = await resolveRegionRowBySlug(supabase, regionSlugFromUrl);
      resolveRegionRowBySlugResult = row;
      if (row) {
        regionFocoSlug = row.slug;
        regionFocoNombre = row.nombre;
      }
    } else {
      const countryFromHeader = (h.get("x-vercel-ip-country") || "").trim().toUpperCase();
      /** TEMP testing: `?country=CL` antes que el header; quitar cuando no se use en dev. */
      const countryEffective =
        countryQueryDebug === "CL" ? "CL" : countryFromHeader;
      if (countryEffective === "CL") {
        const geoRaw = h.get("x-vercel-ip-country-region");
        const code = parseChileRegionCodeFromVercelGeo(geoRaw);
        const candidateSlug =
          code && CHILE_ISO3166_2_SUFFIX_TO_REGION_SLUG[code]
            ? CHILE_ISO3166_2_SUFFIX_TO_REGION_SLUG[code]
            : null;
        if (candidateSlug) {
          const row = await resolveRegionRowBySlug(supabase, candidateSlug);
          if (row) {
            regionFocoSlug = row.slug;
            regionFocoNombre = row.nombre;
          }
        }
      }
    }
    // eslint-disable-next-line no-console -- debug temporal (quitar al cerrar tema regionFoco)
    console.log("[resultados/region DEBUG]", {
      regionRaw,
      regionSlugFromUrl,
      resolveRegionRowBySlugResult,
      regionFocoSlug,
      regionFocoNombre,
    });
  }

  let synonymNotice: { qOriginal: string; qResolved: string } | null = null;
  if (q && !comuna && !isResolvedQueryExactGas(qRaw)) {
    const supabaseSyn = createSupabaseServerPublicClient();
    const qResolved =
      (await resolveQueryFromBusquedaSinonimos(supabaseSyn, q)) || q;
    if (normalizeText(qResolved) !== q) {
      synonymNotice = {
        qOriginal: (qRaw || "").trim() || q,
        qResolved: qResolved.trim(),
      };
    }
  }

  const globalDb =
    q && !comuna
      ? await searchEmprendedoresGlobalText(q, 24, {
          regionSlug: regionFocoSlug,
        })
      : null;

  return (
    <main id="resultados" className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          ← Inicio
        </Link>
        <ResultadosClient
          initialQDisplay={qRawCliente}
          initialComuna={comuna || null}
          initialComunaNombre={comunaNombre}
          initialQ={q || null}
          initialCategoriaSlug={categoria || null}
          initialSubcategoriaSlug={subcategoria || null}
          initialSubcategoriaId={subcategoriaId || null}
          globalDb={globalDb}
          synonymNotice={synonymNotice}
          regionFocoSlug={regionFocoSlug}
          regionFocoNombre={regionFocoNombre}
          resaltarCampoComunaEnBusquedaGlobal={Boolean(q && !comuna)}
        />
      </div>
    </main>
  );
}
