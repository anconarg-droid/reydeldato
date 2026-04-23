import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isPerfilCompletoParaBusqueda,
  type PerfilCompletoBusquedaFlags,
} from "@/lib/isPerfilCompletoParaBusqueda";
import { normalizeText } from "@/lib/search/normalizeText";
import { splitByTerritorialBucket, territorialLevelFromRpcRow } from "@/lib/search/territorialLevelFromRpcRow";
import {
  rotateDeterministicPhotoBuckets,
  SEARCH_ROTATION_WINDOW_MS,
} from "@/lib/search/deterministicRotation";
import { buscarRpcRowTieneFotoListado, fotoPrincipalUrlFromBuscarRpcRow } from "@/lib/search/buscarRpcRowFoto";
import {
  enrichmentFromMaps,
  fetchLocalesYModalidadesByEmprendedorIds,
} from "@/lib/search/cardListingEnrichment";
import { fichaPublicaEsMejoradaDesdeBusqueda } from "@/lib/estadoFicha";
import { getRegionShort } from "@/utils/regionShort";
import {
  isResolvedQueryExactGas,
  vwRowIsGasfiteriaRubro,
} from "@/lib/gasQueryExcludeGasfiteria";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** subcategorias.id es integer: solo acepta dígitos (sin decimales ni espacios). */
function parseSubcategoriaIdParam(v: string): number | null {
  const t = v.trim();
  if (!t || !/^\d+$/.test(t)) return null;
  const n = Number.parseInt(t, 10);
  if (n <= 0 || !Number.isSafeInteger(n)) return null;
  return n;
}

/** Tokenización suave para búsqueda multi-palabra (AND). */
function tokensFromNormalizedQuery(qNorm: string): string[] {
  const t = s(qNorm);
  if (!t) return [];
  const parts = t.split(/\s+/g).map((x) => x.trim()).filter(Boolean);
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    // evita ruido muy corto; sin stopwords por ahora
    if (p.length < 2) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    uniq.push(p);
  }
  return uniq;
}

type BloqueCliente = "de_tu_comuna" | "atienden_tu_comuna";

/** Listados: recién publicados (~30 días). */
function esEmprendedorNuevo(createdAt: unknown): boolean {
  if (createdAt == null) return false;
  const d = new Date(String(createdAt));
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  if (ageMs < 0) return false;
  const days = ageMs / 86_400_000;
  return days <= 30;
}

function computeEsFichaCompleta(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null
): boolean {
  return fichaPublicaEsMejoradaDesdeBusqueda(row, hydrated, 0);
}

type ComunaBaseListaInfo = {
  nombre: string;
  slug: string;
  regionAbrev: string;
};

function mapRpcRowToSearchItem(
  row: Record<string, unknown>,
  bloque: BloqueCliente,
  comunaCtx: { slug: string; nombre: string },
  comunaBaseById: Map<number, ComunaBaseListaInfo>,
  hydratedById: Map<string, Record<string, unknown>>
) {
  const id = String(row.id ?? "");
  const hydrated = hydratedById.get(id) ?? null;
  const nivel = territorialLevelFromRpcRow(row);
  const comunaIdRow = Number(row.comuna_id ?? 0);
  const baseInfo =
    comunaIdRow > 0 ? comunaBaseById.get(comunaIdRow) : undefined;
  const comunaBaseNombre = baseInfo?.nombre ? s(baseInfo.nombre) : "";
  const rankingFromRpc = row.ranking_score;
  const rankingScore = Number.isFinite(Number(rankingFromRpc))
    ? Number(rankingFromRpc)
    : nivel >= 1 && nivel <= 4
      ? 5 - nivel
      : 0;

  const out: Record<string, unknown> = {
    id,
    slug: String(row.slug ?? ""),
    nombre: String(row.nombre_emprendimiento ?? ""),
    frase:
      row.frase_negocio != null
        ? String(row.frase_negocio)
        : hydrated?.frase_negocio != null
          ? String(hydrated.frase_negocio)
          : "",
    descripcion:
      row.descripcion_libre != null
        ? String(row.descripcion_libre)
        : hydrated?.descripcion_libre != null
          ? String(hydrated.descripcion_libre)
          : "",
    // Imagen: algunas fuentes/RPCs legacy pueden no exponer `foto_principal_url`.
    // Intentamos variaciones comunes antes de caer al placeholder del frontend.
    fotoPrincipalUrl: fotoPrincipalUrlFromBuscarRpcRow(row, hydratedById),
    whatsappPrincipal:
      row.whatsapp_principal == null ? "" : String(row.whatsapp_principal),
    comunaId: Number(row.comuna_id ?? 0),
    comunaSlug: comunaCtx.slug,
    comunaNombre: comunaCtx.nombre,
    coberturaTipo: row.cobertura_tipo == null ? "" : String(row.cobertura_tipo),
    prioridad: nivel,
    rankingScore,
    score: nivel,
    bloque,
    comunaBaseNombre,
    comunaBaseSlug: baseInfo?.slug ? String(baseInfo.slug) : "",
    comunaBaseRegionAbrev: baseInfo?.regionAbrev
      ? String(baseInfo.regionAbrev)
      : "",
  };
  const esFichaCompleta = computeEsFichaCompleta(row, hydrated);
  out.esFichaCompleta = esFichaCompleta;
  out.estadoFicha = esFichaCompleta ? "ficha_completa" : "ficha_basica";
  out.fichaActivaPorNegocio = esFichaCompleta;
  if (process.env.NODE_ENV !== "production") {
    const slug = String(row.slug ?? "");
    if (slug.startsWith("test-score")) {
      (out as any).__debug = {
        hasHydrated: !!hydrated,
        hydrated_plan_activo: hydrated?.plan_activo ?? null,
        hydrated_trial_expira_at: hydrated?.trial_expira_at ?? null,
        hydrated_plan_expira_at: hydrated?.plan_expira_at ?? null,
        row_plan_activo: (row as any).plan_activo ?? null,
        row_trial_expira_at: (row as any).trial_expira_at ?? null,
        row_plan_expira_at: (row as any).plan_expira_at ?? null,
      };
    }
  }

  if (Array.isArray(row.subcategorias_slugs)) {
    out.subcategoriasSlugs = row.subcategorias_slugs;
  }
  if (Array.isArray(row.subcategorias_nombres)) {
    out.subcategoriasNombres = row.subcategorias_nombres;
  }
  out.categoriaNombre =
    row.categoria_nombre == null ? "" : String(row.categoria_nombre);

  const comunasArr = row.comunas_cobertura;
  if (Array.isArray(comunasArr)) {
    out.comunasCobertura = comunasArr.map((x) => String(x));
  } else {
    out.comunasCobertura = [];
  }
  const regionesArr = row.regiones_cobertura;
  if (Array.isArray(regionesArr)) {
    out.regionesCobertura = regionesArr.map((x) => String(x));
  } else {
    out.regionesCobertura = [];
  }

  const createdRaw =
    hydrated?.created_at ?? (row as { created_at?: unknown }).created_at;
  out.esNuevo = esEmprendedorNuevo(createdRaw);

  /** Listados: la card usa `estadoPublicacion` para CTA ficha (misma regla que `listadoPerfilCompletoUi`). */
  const estadoPub =
    s((hydrated as Record<string, unknown> | null)?.estado_publicacion) ||
    s((row as Record<string, unknown>).estado_publicacion) ||
    "";
  out.estadoPublicacion =
    estadoPub ||
    /** RPC territorial solo devuelve `publicado`; compat si la columna no viene en el row. */
    "publicado";

  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const comunaSlug = s(searchParams.get("comuna"));
    const qRaw = s(searchParams.get("q"));

    if (!comunaSlug) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna" },
        { status: 400 }
      );
    }

    const { data: comuna, error: comunaError } = await supabase
      .from("comunas")
      .select("id, slug, nombre, region_id, regiones(slug)")
      .eq("slug", comunaSlug)
      .single();

    if (comunaError || !comuna) {
      return NextResponse.json(
        { ok: false, error: "Comuna no encontrada" },
        { status: 404 }
      );
    }

    // Preferir RPC v2 (incluye foto_principal_url y subcategorías), con fallback a v1 si no existe.
    const regionSlug = String((comuna as any)?.regiones?.slug ?? "");
    let resultados: any[] = [];
    const { data: dataV2, error: errV2 } = await supabase.rpc(
      "buscar_emprendedores_por_cobertura_v2",
      {
        p_comuna_id: comuna.id,
        p_comuna_slug: comuna.slug,
        p_region_slug: regionSlug,
      }
    );
    if (!errV2 && Array.isArray(dataV2)) {
      resultados = dataV2 as any[];
    } else {
      const { data, error } = await supabase.rpc(
        "buscar_emprendedores_por_cobertura",
        {
          comuna_buscada_id: comuna.id,
          comuna_buscada_slug: comuna.slug,
        }
      );

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
      resultados = Array.isArray(data) ? (data as any[]) : [];
    }

    let subSlugParam = s(searchParams.get("subcategoria"));
    const subIdParam = s(searchParams.get("subcategoria_id"));
    let qPromotedToSub = false;

    if (!subSlugParam && !subIdParam && qRaw) {
      const guess = slugify(qRaw);
      if (guess) {
        const { data: subFromQ, error: subFromQErr } = await supabase
          .from("subcategorias")
          .select("slug")
          .eq("slug", guess)
          .maybeSingle();
        if (subFromQErr) {
          return NextResponse.json(
            { ok: false, error: subFromQErr.message },
            { status: 500 }
          );
        }
        if (subFromQ?.slug) {
          subSlugParam = String(subFromQ.slug);
          qPromotedToSub = true;
        }
      }
    }

    let subcategoriaResolved = false;
    let resolvedSubcategoriaId: string | null = null;

    let subUuid: string | null = null;
    const subIdParsed = parseSubcategoriaIdParam(subIdParam);
    if (subIdParsed != null) {
      subUuid = String(subIdParsed);
    } else if (subSlugParam) {
      const { data: subRow, error: subErr } = await supabase
        .from("subcategorias")
        .select("id")
        .eq("slug", slugify(subSlugParam))
        .maybeSingle();
      if (subErr) {
        return NextResponse.json(
          { ok: false, error: subErr.message },
          { status: 500 }
        );
      }
      if (subRow?.id) subUuid = String(subRow.id);
    }

    if (subUuid) {
      subcategoriaResolved = true;
      resolvedSubcategoriaId = subUuid;
      const resultadoIds = resultados
        .map((r: any) => r?.id)
        .filter((id: unknown) => id != null && String(id).length > 0);

      if (resultadoIds.length === 0) {
        resultados = [];
      } else {
        const { data: links, error: linkErr } = await supabase
          .from("emprendedor_subcategorias")
          .select("emprendedor_id")
          .eq("subcategoria_id", subUuid)
          .in("emprendedor_id", resultadoIds as string[]);

        if (linkErr) {
          return NextResponse.json(
            { ok: false, error: linkErr.message },
            { status: 500 }
          );
        }

        const allowed = new Set(
          (links ?? []).map((l: { emprendedor_id: string }) =>
            String(l.emprendedor_id)
          )
        );
        resultados = resultados.filter((item: any) =>
          allowed.has(String(item?.id))
        );
      }
    }

    const catSlugParamRaw = s(searchParams.get("categoria"));
    const catSlugLookup = catSlugParamRaw ? slugify(catSlugParamRaw) : "";
    let categoriaResolved = false;

    if (!subcategoriaResolved && catSlugLookup) {
      const { data: catRow, error: catErr } = await supabase
        .from("categorias")
        .select("id")
        .eq("slug", catSlugLookup)
        .maybeSingle();
      if (catErr) {
        return NextResponse.json(
          { ok: false, error: catErr.message },
          { status: 500 }
        );
      }
      const catIdRaw = catRow?.id;
      if (catIdRaw != null && String(catIdRaw).length > 0) {
        categoriaResolved = true;
        const resultadoIds = resultados
          .map((r: any) => r?.id)
          .filter((id: unknown) => id != null && String(id).length > 0);

        if (resultadoIds.length === 0) {
          resultados = [];
        } else {
          const { data: empsCat, error: ecErr } = await supabase
            .from("emprendedores")
            .select("id")
            .eq("categoria_id", catIdRaw)
            .in("id", resultadoIds as string[]);

          if (ecErr) {
            return NextResponse.json(
              { ok: false, error: ecErr.message },
              { status: 500 }
            );
          }
          const allowedCat = new Set(
            (empsCat ?? []).map((r: { id: string }) => String(r.id))
          );
          resultados = resultados.filter((item: any) =>
            allowedCat.has(String(item?.id))
          );
        }
      }
    }

    const qNormBase = normalizeText(searchParams.get("q"));
    const subSlugNorm = subSlugParam ? normalizeText(slugify(subSlugParam)) : "";
    const qRedundanteIgualASub =
      Boolean(
        subSlugParam &&
          !subIdParam &&
          qNormBase &&
          subSlugNorm &&
          qNormBase === subSlugNorm
      );
    const qNormEffective =
      qPromotedToSub || qRedundanteIgualASub ? "" : qNormBase;

    const hasSubParam = Boolean(s(subSlugParam) || subIdParam);

    /** Prioridad: subcategoría > categoría > q. Con intención de sub, nunca mezclamos `q`. */
    let textNorm = "";
    if (hasSubParam) {
      if (subcategoriaResolved) {
        textNorm = "";
      } else if (subSlugParam) {
        textNorm = subSlugNorm || normalizeText(subSlugParam);
      } else {
        textNorm = "";
      }
    } else if (categoriaResolved) {
      textNorm = "";
    } else {
      textNorm = qNormEffective;
    }

    const beforeFilterCount = resultados.length;
    const tokens = textNorm ? tokensFromNormalizedQuery(textNorm) : [];

    if (textNorm) {
      resultados = resultados.filter((item: any) => {
        if (isResolvedQueryExactGas(qRaw) && vwRowIsGasfiteriaRubro(item as any)) {
          return false;
        }
        const nombre = normalizeText(item?.nombre_emprendimiento);
        const frase = normalizeText(item?.frase_negocio);
        const descripcion = normalizeText(item?.descripcion_libre);
        const keywordsTxt = normalizeText(
          Array.isArray(item?.keywords_finales)
            ? (item?.keywords_finales as unknown[]).join(" ")
            : ""
        );
        const haystack = `${nombre} ${frase} ${descripcion} ${keywordsTxt}`.trim();

        // 1 palabra (o query sin tokenizar): igual que antes (match flexible por substring).
        if (tokens.length <= 1) {
          return (
            nombre.includes(textNorm) ||
            frase.includes(textNorm) ||
            descripcion.includes(textNorm) ||
            keywordsTxt.includes(textNorm)
          );
        }

        // Varias palabras: intersección flexible (AND) sobre haystack combinado.
        return tokens.every((t) => haystack.includes(t));
      });
    }

    if (process.env.NODE_ENV === "development") {
      const sample0 = resultados[0] as any;
      const sample1 = resultados[1] as any;
      const buildHay = (it: any) =>
        `${normalizeText(it?.nombre_emprendimiento)} ${normalizeText(it?.frase_negocio)} ${normalizeText(it?.descripcion_libre)} ${normalizeText(Array.isArray(it?.keywords_finales) ? (it?.keywords_finales as unknown[]).join(" ") : "")}`.trim();
      // eslint-disable-next-line no-console
      console.log("[buscar-debug-q]", {
        q: qRaw,
        qNormEffective,
        textNorm,
        tokens,
        beforeFilterCount,
        afterFilterCount: resultados.length,
        sample: [sample0, sample1]
          .filter(Boolean)
          .map((it: any) => ({
            id_item: String(it?.id ?? ""),
            haystack: buildHay(it).slice(0, 200),
          })),
      });
    }

    // Hidratación: asegurar imagen + estado de ficha incluso si el RPC no trae campos.
    const hydratedById = new Map<string, Record<string, unknown>>();
    const ids = resultados
      .map((r: any) => String(r?.id ?? ""))
      .filter((v: string) => v.length > 0);
    if (ids.length > 0) {
      const { data: emps, error: empsErr } = await supabase
        .from("emprendedores")
        .select(
          "id,foto_principal_url,frase_negocio,descripcion_libre,plan_activo,plan_expira_at,trial_expira_at,created_at,estado_publicacion"
        )
        .in("id", ids.slice(0, 300));
      if (empsErr) {
        return NextResponse.json(
          { ok: false, error: empsErr.message },
          { status: 500 }
        );
      }
      for (const e of (emps ?? []) as any[]) {
        const id = String(e?.id ?? "");
        if (!id) continue;
        hydratedById.set(id, e as Record<string, unknown>);
      }
    }

    const comunaIdBuscada = Number(comuna.id ?? 0);
    const rows = resultados as Record<string, unknown>[];
    const baseExacta: Record<string, unknown>[] = [];
    const resto: Record<string, unknown>[] = [];

    for (const row of rows) {
      // PROTECCIÓN EXPLÍCITA: si comuna_base (comuna_id) == comuna buscada, NUNCA puede caer en "atienden".
      // Esto evita bugs por score/ranking incompleto o inconsistencia temporal del RPC.
      const cid = Number((row as any)?.comuna_id ?? 0);
      if (comunaIdBuscada > 0 && cid === comunaIdBuscada) {
        baseExacta.push(row);
      } else {
        resto.push(row);
      }
    }

    const { deMiComuna, atiendenMiComuna } = splitByTerritorialBucket(resto);
    const deMiComunaFinal = [...baseExacta, ...deMiComuna];

    /**
     * Orden de listado (regla de producto):
     * - Bloque "En tu comuna" y bloque "Atienden tu comuna" se construyen por separado.
     * - En cada bloque: primero ítems con foto de listado, después sin foto; no se mezclan en una sola rotación.
     * - La rotación determinista por ventana ({@link SEARCH_ROTATION_WINDOW_MS} = 5 min) aplica **por subgrupo**
     *   (namespaces `:foto` / `:sin_foto` dentro de cada `namespaceBase`), sin usar plan/premium para ordenar.
     * @see rotateDeterministicPhotoBuckets
     */
    const rotationKey = (row: Record<string, unknown>) =>
      String((row as { slug?: unknown }).slug ?? (row as { id?: unknown }).id ?? "");
    const deMiComunaRot = rotateDeterministicPhotoBuckets(
      deMiComunaFinal,
      rotationKey,
      (row) => buscarRpcRowTieneFotoListado(row, hydratedById),
      SEARCH_ROTATION_WINDOW_MS,
      "buscar:de_tu_comuna",
    );
    const atiendenMiComunaRot = rotateDeterministicPhotoBuckets(
      atiendenMiComuna,
      rotationKey,
      (row) => buscarRpcRowTieneFotoListado(row, hydratedById),
      SEARCH_ROTATION_WINDOW_MS,
      "buscar:atienden_tu_comuna",
    );

    const comunaCtx = { slug: String(comuna.slug), nombre: String(comuna.nombre) };

    const comunaIds = new Set<number>();
    for (const row of resultados as Record<string, unknown>[]) {
      const cid = Number(row.comuna_id ?? 0);
      if (cid > 0) comunaIds.add(cid);
    }
    const comunaBaseById = new Map<number, ComunaBaseListaInfo>();
    if (comunaIds.size > 0) {
      const { data: comunasNombre } = await supabase
        .from("comunas")
        .select("id, nombre, slug, regiones(nombre)")
        .in("id", [...comunaIds]);
      for (const c of comunasNombre ?? []) {
        const row = c as {
          id?: unknown;
          nombre?: unknown;
          slug?: unknown;
          regiones?: { nombre?: unknown } | null;
        };
        const id = Number(row.id ?? 0);
        if (id <= 0) continue;
        const nombre = s(row.nombre);
        const slug = s(row.slug);
        const regNom =
          row.regiones != null && typeof row.regiones === "object"
            ? s((row.regiones as { nombre?: unknown }).nombre)
            : "";
        const regionAbrev = regNom ? getRegionShort(regNom) : "";
        comunaBaseById.set(id, { nombre, slug, regionAbrev });
      }
    }

    const itemsRaw = [
      ...deMiComunaRot.map((row: Record<string, unknown>) =>
        mapRpcRowToSearchItem(row, "de_tu_comuna", comunaCtx, comunaBaseById, hydratedById)
      ),
      ...atiendenMiComunaRot.map((row: Record<string, unknown>) =>
        mapRpcRowToSearchItem(row, "atienden_tu_comuna", comunaCtx, comunaBaseById, hydratedById)
      ),
    ];

    const itemIds = itemsRaw
      .map((it) => String((it as Record<string, unknown>).id ?? ""))
      .filter((id) => id.length > 0);

    let items: Record<string, unknown>[] = itemsRaw as Record<string, unknown>[];
    if (itemIds.length > 0) {
      const { localesMinisByEmp, modalidadesByEmp } =
        await fetchLocalesYModalidadesByEmprendedorIds(supabase, itemIds);
      items = itemsRaw.map((raw) => {
        const item = { ...(raw as Record<string, unknown>) };
        const id = String(item.id ?? "");
        const e = enrichmentFromMaps(id, localesMinisByEmp, modalidadesByEmp);
        if (e.resumenLocalesLinea) {
          item.resumenLocalesLinea = e.resumenLocalesLinea;
        } else if (e.localFisicoComunaNombre) {
          item.localFisicoComunaNombre = e.localFisicoComunaNombre;
        }
        if (e.modalidadesCardBadges.length > 0) {
          item.modalidadesCardBadges = e.modalidadesCardBadges;
        }
        return item;
      });
    }

    if (process.env.NODE_ENV === "development") {
      for (const it of items) {
        const slug = String((it as { slug?: unknown }).slug ?? "").toLowerCase();
        if (!slug.includes("don-benito")) continue;
        // eslint-disable-next-line no-console
        console.log("[buscar-debug Don Benito / perfil completo]", {
          slug: (it as { slug?: unknown }).slug,
          esFichaCompleta: (it as { esFichaCompleta?: unknown }).esFichaCompleta,
          estadoFicha: (it as { estadoFicha?: unknown }).estadoFicha,
          fichaActivaPorNegocio: (it as { fichaActivaPorNegocio?: unknown }).fichaActivaPorNegocio,
          isPerfilCompletoParaBusqueda: isPerfilCompletoParaBusqueda(
            it as PerfilCompletoBusquedaFlags
          ),
          resumenLocalesLinea: (it as { resumenLocalesLinea?: unknown }).resumenLocalesLinea,
          modalidadesCardBadges: (it as { modalidadesCardBadges?: unknown }).modalidadesCardBadges,
          fotoPrincipalUrlLen: String(
            (it as { fotoPrincipalUrl?: unknown }).fotoPrincipalUrl ?? ""
          ).length,
        });
      }
    }

    const total = items.length;

    return NextResponse.json({
      ok: true,
      items,
      total,
      deMiComuna: deMiComunaRot,
      atiendenMiComuna: atiendenMiComunaRot,
      meta: {
        comuna: comuna.slug,
        comunaSlug: comuna.slug,
        comunaNombre: comuna.nombre,
        q: qPromotedToSub || qRedundanteIgualASub ? "" : qRaw,
        qPromotedToSub,
        qDescartadaPorCoincidirConSub: qRedundanteIgualASub,
        page: 1,
        limit: total,
        offset: 0,
        total,
        modo:
          textNorm || subcategoriaResolved || categoriaResolved
            ? "busqueda_con_texto"
            : "solo_comuna",
        subcategoriaResolved,
        subcategoriaId: resolvedSubcategoriaId,
        subcategoriaSlug: subSlugParam || null,
        categoriaResolved,
        categoriaSlug: catSlugLookup || null,
        totalDeMiComuna: deMiComunaRot.length,
        totalAtiendenMiComuna: atiendenMiComunaRot.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}