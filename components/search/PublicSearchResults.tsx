"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeText } from "@/lib/search/normalizeText";
import TrackImpressions from "@/components/TrackImpressions";
import ComunaTerritorialBloquesConFiltro from "@/components/search/ComunaTerritorialBloquesConFiltro";
import TerritorialAccordionBlock from "@/components/search/TerritorialAccordionBlock";
import CategoriaEmprendedoresGrid from "@/components/categoria/CategoriaEmprendedoresGrid";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import { sortItemsConFotoPrimeroStable } from "@/lib/search/sortItemsConFotoPrimero";

/** Texto legible cuando solo viene `subcategoria=` en la URL (sin `q=`). */
function prettySubcategoriaSlugForDisplay(slug: string): string {
  const v = String(slug ?? "").trim();
  if (!v) return "";
  return v
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type SearchItem = {
  id: string;
  nombre: string;
  slug: string;
  frase: string;
  descripcion?: string;
  fotoPrincipalUrl: string;
  whatsappPrincipal: string;
  comunaId: number;
  comunaSlug: string;
  comunaNombre: string;
  coberturaTipo: string;
  prioridad: number;
  rankingScore: number;
  bloque: "de_tu_comuna" | "atienden_tu_comuna";
  /** Nombre de la comuna base del emprendimiento; la búsqueda usa `comunaNombre` como comuna buscada. */
  comunaBaseNombre?: string;
  comunaBaseRegionAbrev?: string;
  comunaBaseSlug?: string;
  esFichaCompleta?: boolean;
  estadoFicha?: "ficha_completa" | "ficha_basica";
  /** Alias de `esFichaCompleta` desde API (opcional). */
  fichaActivaPorNegocio?: boolean;
  subcategoriasSlugs?: string[];
  subcategoriasNombres?: string[];
  categoriaNombre?: string;
  comunasCobertura?: string[];
  regionesCobertura?: string[];
  esNuevo?: boolean;
  createdAt?: string;
  estadoPublicacion?: string;
};

type SearchMeta = {
  comunaSlug: string;
  comunaNombre: string;
  q: string;
  page: number;
  limit: number;
  offset: number;
  total: number;
  modo: "busqueda_con_texto" | "solo_comuna" | "populares";
  subcategoriaSlug?: string | null;
  subcategoriaId?: string | null;
};

type SearchResponse = {
  ok: boolean;
  items: SearchItem[];
  total: number;
  meta: SearchMeta;
};

/** Misma idea que `atiendenParaBloque` en render: hay ítems que atienden la comuna por bloque o cobertura. */
function hayAtiendeEnComunaDesdeItems(items: SearchItem[], comunaSlugCtx: string): boolean {
  const w = comunaSlugCtx.trim();
  if (!w) return false;
  for (const i of items) {
    if (i.bloque === "atienden_tu_comuna") return true;
  }
  for (const i of items) {
    if (i.bloque === "de_tu_comuna") continue;
    const baseSlug = String(i.comunaBaseSlug || "").trim();
    if (!baseSlug || baseSlug === w) continue;
    const comunas = Array.isArray(i.comunasCobertura) ? i.comunasCobertura : [];
    if (comunas.map((x) => String(x ?? "").trim()).includes(w)) return true;
  }
  return false;
}

export default function PublicSearchResults({
  comuna,
  q = "",
  categoriaSlug,
  subcategoriaSlug,
  subcategoriaId,
  modoActivacionPreview = false,
  activacionServicioLabel = "",
  /** Título con región (p. ej. “Teno — Maule”) para acordeones y cards; si no, usa la comuna del API. */
  comunaTituloConRegion = null,
  /** Texto de `q` tal como en la URL (p. ej. “gasfiter”) para mensajes. */
  qDisplayLabel = "",
  regionFocoSlug: _regionFocoSlug = null,
  regionFocoNombre: _regionFocoNombre = null,
}: {
  comuna: string;
  q?: string;
  /** Slug en `categorias.slug`; prioridad por debajo de `subcategoria`. */
  categoriaSlug?: string;
  /** Slug en public.subcategorias; el API resuelve y filtra o hace fallback texto */
  subcategoriaSlug?: string;
  subcategoriaId?: string | null;
  /**
   * Comuna sin directorio abierto: misma búsqueda filtrada que el directorio (`q` / subcategoría),
   * sin filtro “solo completos”. No usa populares genéricos: respeta la intención de búsqueda.
   */
  modoActivacionPreview?: boolean;
  /** Texto legible para copy (“gasfiter”, “este rubro”) cuando `modoActivacionPreview`. */
  activacionServicioLabel?: string;
  comunaTituloConRegion?: string | null;
  qDisplayLabel?: string;
  regionFocoSlug?: string | null;
  regionFocoNombre?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [error, setError] = useState("");
  /** Populares sin `q` (respuesta completa: base + atienden) para fallback cuando la búsqueda no matchea en la comuna. */
  const [fallbackPopularesItems, setFallbackPopularesItems] = useState<SearchItem[]>([]);
  /** Búsqueda global `scope=nacional` solo tras clic explícito (no mezclar con listados de comuna). */
  const [fallbackGlobalNacional, setFallbackGlobalNacional] = useState<BuscarApiItem[]>([]);
  const [loadingFueraZona, setLoadingFueraZona] = useState(false);
  const [errorFueraZona, setErrorFueraZona] = useState("");
  const [fueraZonaIntentada, setFueraZonaIntentada] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setFallbackPopularesItems([]);
        setFallbackGlobalNacional([]);
        setErrorFueraZona("");
        setFueraZonaIntentada(false);

        const params = new URLSearchParams();
        params.set("comuna", comuna);
        const slug = subcategoriaSlug?.trim();
        const cat = categoriaSlug?.trim();
        const sidTrim = subcategoriaId?.trim();
        let qSend = q.trim();
        if (slug && qSend && normalizeText(qSend) === normalizeText(slug)) {
          qSend = "";
        }
        if (slug || cat || sidTrim) {
          qSend = "";
        }
        if (qSend) params.set("q", qSend);
        if (slug) params.set("subcategoria", slug);
        if (cat && !slug) params.set("categoria", cat);
        const sid = sidTrim;
        if (sid) params.set("subcategoria_id", sid);
        if (!qSend && !slug && !sid && !cat) {
          params.set("populares", "1");
          params.set("limit", "48");
        }

        const res = await fetch(`/api/buscar?${params.toString()}`, {
          cache: "no-store",
        });

        const json: SearchResponse & { error?: string } = await res.json();

        if (!res.ok || !json?.ok) {
          const apiErr =
            json && typeof json.error === "string" && json.error.trim()
              ? json.error.trim()
              : null;
          throw new Error(apiErr || "No se pudo cargar la búsqueda.");
        }

        if (!mounted) return;

        const nextItems = Array.isArray(json.items) ? json.items : [];
        setMeta(json.meta || null);

        const deTuCount = nextItems.filter((i) => i.bloque === "de_tu_comuna").length;
        let otros: SearchItem[] = [];
        const hayFiltroBusqueda = Boolean(q.trim()) || Boolean(slug) || Boolean(sidTrim) || Boolean(cat);
        if (hayFiltroBusqueda && deTuCount === 0) {
          const popParams = new URLSearchParams();
          popParams.set("comuna", comuna);
          popParams.set("populares", "1");
          popParams.set("limit", "48");
          const resPop = await fetch(`/api/buscar?${popParams.toString()}`, {
            cache: "no-store",
          });
          const jsonPop: SearchResponse & { error?: string } = await resPop.json();
          if (resPop.ok && jsonPop?.ok && Array.isArray(jsonPop.items)) {
            otros = jsonPop.items;
          }
        }

        if (!mounted) return;
        setItems(nextItems);
        setFallbackPopularesItems(otros);
        setFallbackGlobalNacional([]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [comuna, q, subcategoriaSlug, subcategoriaId, categoriaSlug, modoActivacionPreview]);

  const fallbackBaseOrdenados = useMemo(
    () =>
      sortItemsConFotoPrimeroStable(
        fallbackPopularesItems.filter((i) => i.bloque === "de_tu_comuna"),
        (i) => i.fotoPrincipalUrl
      ),
    [fallbackPopularesItems]
  );
  const fallbackAtiendenOrdenados = useMemo(
    () =>
      sortItemsConFotoPrimeroStable(
        fallbackPopularesItems.filter((i) => i.bloque === "atienden_tu_comuna"),
        (i) => i.fotoPrincipalUrl
      ),
    [fallbackPopularesItems]
  );

  const resultadosBase = useMemo(
    () => items.filter((i) => i.bloque === "de_tu_comuna"),
    [items]
  );

  const hasQuery = Boolean(q.trim());
  const hasResultadosBase = resultadosBase.length > 0;

  const enTuComunaParaBloques = useMemo(() => {
    if (!hasQuery || hasResultadosBase) {
      return sortItemsConFotoPrimeroStable(resultadosBase, (i) => i.fotoPrincipalUrl);
    }
    if (fallbackBaseOrdenados.length > 0) {
      return fallbackBaseOrdenados;
    }
    return sortItemsConFotoPrimeroStable(resultadosBase, (i) => i.fotoPrincipalUrl);
  }, [hasQuery, hasResultadosBase, resultadosBase, fallbackBaseOrdenados]);

  const atiendenTuComuna = useMemo(
    () =>
      sortItemsConFotoPrimeroStable(
        items.filter((i) => i.bloque === "atienden_tu_comuna"),
        (i) => i.fotoPrincipalUrl
      ),
    [items]
  );

  const comunaSlugCtx = String(meta?.comunaSlug || comuna).trim() || comuna.trim();

  const atiendenPorCoberturaQuery = useMemo(() => {
    if (!comunaSlugCtx) return [];
    return items.filter((i) => {
      if (i.bloque === "de_tu_comuna") return false;
      const baseSlug = String(i.comunaBaseSlug || "").trim();
      if (!baseSlug) return false;
      if (baseSlug === comunaSlugCtx) return false;
      const comunas = Array.isArray(i.comunasCobertura) ? i.comunasCobertura : [];
      return comunas.map((x) => String(x ?? "").trim()).includes(comunaSlugCtx);
    });
  }, [items, comunaSlugCtx]);

  const atiendenParaBloque = useMemo(() => {
    const seen = new Set<string>();
    const out: SearchItem[] = [];
    for (const it of [...atiendenTuComuna, ...atiendenPorCoberturaQuery]) {
      const key = String(it.slug || it.id || "").trim();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }, [atiendenTuComuna, atiendenPorCoberturaQuery]);

  const cargarOpcionesFueraZona = useCallback(async () => {
    if (modoActivacionPreview) return;
    const slug = subcategoriaSlug?.trim();
    const cat = categoriaSlug?.trim();
    const sidTrim = subcategoriaId?.trim();
    let qSend = q.trim();
    if (slug && qSend && normalizeText(qSend) === normalizeText(slug)) {
      qSend = "";
    }
    if (slug || cat || sidTrim) {
      qSend = "";
    }
    const terminoParaGlobalRaw =
      String(meta?.q ?? "").trim() ||
      (slug ? prettySubcategoriaSlugForDisplay(slug) : "") ||
      (cat ? prettySubcategoriaSlugForDisplay(cat) : "") ||
      qSend;
    if (!normalizeText(terminoParaGlobalRaw)) return;
    setLoadingFueraZona(true);
    setErrorFueraZona("");
    try {
      const gp = new URLSearchParams();
      gp.set("q", terminoParaGlobalRaw);
      gp.set("scope", "nacional");
      const resG = await fetch(`/api/buscar/global?${gp.toString()}`, { cache: "no-store" });
      const jsonG: { ok?: boolean; items?: BuscarApiItem[]; error?: string } = await resG.json();
      if (!resG.ok || !jsonG?.ok) {
        throw new Error(
          jsonG && typeof jsonG.error === "string" && jsonG.error.trim()
            ? jsonG.error.trim()
            : "No se pudo cargar la búsqueda nacional.",
        );
      }
      if (jsonG.error) throw new Error(String(jsonG.error));
      setFallbackGlobalNacional(Array.isArray(jsonG.items) ? jsonG.items : []);
    } catch (e) {
      setErrorFueraZona(e instanceof Error ? e.message : "Error inesperado.");
      setFallbackGlobalNacional([]);
    } finally {
      setLoadingFueraZona(false);
      setFueraZonaIntentada(true);
    }
  }, [modoActivacionPreview, meta, q, subcategoriaSlug, categoriaSlug, subcategoriaId]);

  if (loading) {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Cargando resultados…
      </p>
    );
  }

  if (error) {
    if (modoActivacionPreview) {
      return (
        <p className="text-sm text-amber-900/90" role="alert">
          No pudimos cargar la vista previa. Puedes seguir con las opciones de arriba o intentar de
          nuevo más tarde.
        </p>
      );
    }
    return (
      <div
        style={{
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#b91c1c",
          borderRadius: 16,
          padding: 14,
        }}
      >
        {error}
      </div>
    );
  }

  const nombreComunaLinea = meta?.comunaNombre || comuna;
  const nombreComunaParaTitulos =
    String(comunaTituloConRegion ?? "").trim() || nombreComunaLinea;
  const qLegibleTitulo =
    (qDisplayLabel ?? "").trim() || (meta?.q ?? "").trim() || q.trim();

  if (items.length === 0 && !hasQuery) {
    if (modoActivacionPreview) {
      return null;
    }
    const qNorm = normalizeText(q);
    const comunaSlugOk = comuna.trim();
    const tieneFiltroActivo =
      Boolean(q.trim()) ||
      Boolean(subcategoriaSlug?.trim()) ||
      Boolean(subcategoriaId?.trim()) ||
      Boolean(categoriaSlug?.trim());
    const servicioHintParaCta =
      q.trim() ||
      (subcategoriaSlug ? prettySubcategoriaSlugForDisplay(subcategoriaSlug) : "") ||
      (subcategoriaId ? "este rubro" : "");
    const tituloComunaCta = (meta?.comunaNombre || "").trim() || nombreComunaLinea;
    const paramsPublicar = new URLSearchParams();
    if (comunaSlugOk) paramsPublicar.set("comuna", comunaSlugOk);
    if (servicioHintParaCta) paramsPublicar.set("servicio", servicioHintParaCta);
    const paramsRecomendar = new URLSearchParams();
    if (comunaSlugOk) paramsRecomendar.set("comuna", comunaSlugOk);
    if (tituloComunaCta) paramsRecomendar.set("comuna_nombre", tituloComunaCta);
    if (servicioHintParaCta) paramsRecomendar.set("servicio", servicioHintParaCta);

    return (
      <>
        <TrackImpressions
          slugs={[]}
          comuna_slug={meta?.comunaSlug || comuna}
          q={meta?.q || q}
        />
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            background: "#fff",
            padding: 18,
          }}
        >
          <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 900, color: "#111827" }}>
            No encontramos resultados
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
            Intenta buscar con otras palabras o sin filtrar por comuna.
          </p>
          {comunaSlugOk && tieneFiltroActivo ? (
            <div style={{ marginTop: 14 }}>
              <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
                Si conoces un emprendimiento de este rubro en {tituloComunaCta || "esta comuna"},
                ayúdanos a sumarlo.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href={`/publicar?${paramsPublicar.toString()}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    background: "#0f172a",
                    color: "#fff",
                    padding: "10px 14px",
                    fontWeight: 800,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  Publicar mi emprendimiento
                </Link>
                <Link
                  href={`/recomendar?${paramsRecomendar.toString()}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#0f172a",
                    padding: "10px 14px",
                    fontWeight: 800,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  Recomendar emprendedor
                </Link>
              </div>
            </div>
          ) : null}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                router.push(qNorm ? `/resultados?q=${encodeURIComponent(qNorm)}` : "/resultados");
              }}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
                fontSize: 14,
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Quitar comuna
            </button>
            <button
              type="button"
              onClick={() => router.push("/resultados")}
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
                fontSize: 14,
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Limpiar búsqueda
            </button>
          </div>
        </div>
      </>
    );
  }

  const bloques = (
    <ComunaTerritorialBloquesConFiltro
      enTuComuna={enTuComunaParaBloques as BuscarApiItem[]}
      atiendenTuComuna={atiendenParaBloque as BuscarApiItem[]}
      comunaSlug={comunaSlugCtx}
      comunaNombre={nombreComunaLinea}
      nombreComunaDisplay={nombreComunaParaTitulos}
      gridEmptyMessage="No encontramos resultados."
      ocultarFiltroSoloCompletos={modoActivacionPreview}
      usarCardSimple={false}
      pocosResultadosServicioLabel={
        modoActivacionPreview && (activacionServicioLabel || "").trim()
          ? (activacionServicioLabel || "").trim()
          : null
      }
      trackImpressions={{
        comuna_slug: meta?.comunaSlug || comuna,
        q: meta?.q || q,
      }}
    />
  );

  const baseFiltrados = resultadosBase;
  const atiendenFiltrados = atiendenParaBloque;
  const sinBaseConQ = hasQuery && baseFiltrados.length === 0;
  const soloAtiendenParaQ = sinBaseConQ && atiendenFiltrados.length > 0;
  const sinResultadosParaQ = sinBaseConQ && atiendenFiltrados.length === 0;

  const comunaSlugOk = comuna.trim();
  const tituloComunaCta = (meta?.comunaNombre || "").trim() || nombreComunaLinea;
  const paramsPublicarVacios = new URLSearchParams();
  if (comunaSlugOk) paramsPublicarVacios.set("comuna", comunaSlugOk);
  if (qLegibleTitulo) paramsPublicarVacios.set("servicio", qLegibleTitulo);
  const paramsRecomendarVacios = new URLSearchParams();
  if (comunaSlugOk) paramsRecomendarVacios.set("comuna", comunaSlugOk);
  if (tituloComunaCta) paramsRecomendarVacios.set("comuna_nombre", tituloComunaCta);
  if (qLegibleTitulo) paramsRecomendarVacios.set("servicio", qLegibleTitulo);

  const qParaResultadosGlobal =
    String(meta?.q ?? q ?? "").trim() || qLegibleTitulo;
  const regionFocoSlug = String(_regionFocoSlug ?? "").trim();
  const regionFocoNombre = String(_regionFocoNombre ?? "").trim();
  const regionParam =
    regionFocoSlug && regionFocoSlug.startsWith("region-")
      ? regionFocoSlug
      : regionFocoSlug
        ? `region-${regionFocoSlug}`
        : "";
  const paramsOtrasComunas = new URLSearchParams();
  if (qParaResultadosGlobal) paramsOtrasComunas.set("q", qParaResultadosGlobal);
  if (regionParam) paramsOtrasComunas.set("region", regionParam);
  const hrefOtrasComunas = `/resultados?${paramsOtrasComunas.toString()}`;

  return (
    <div className="space-y-0">
      {soloAtiendenParaQ ? (
        <>
          <TrackImpressions
            slugs={atiendenParaBloque.map((i) => String(i.slug || i.id || "")).filter(Boolean)}
            comuna_slug={comunaSlugCtx}
            q={meta?.q || q}
          />
          <div className="mb-4 space-y-1.5 text-sm">
            <p className="m-0 font-semibold text-slate-900">
              No encontramos {qLegibleTitulo} con base en {nombreComunaLinea}
            </p>
            <p className="m-0 text-slate-600">
              Pero sí hay opciones que atienden esta comuna.
            </p>
          </div>
          <TerritorialAccordionBlock
            variant="cobertura"
            persistPrefix={`resultados:${comunaSlugCtx}`}
            which="atienden"
            instanceId={`resultados-${comunaSlugCtx}-atienden-solo-q`}
            title={
              <>
                {qLegibleTitulo} que atienden {nombreComunaParaTitulos} (
                {atiendenParaBloque.length})
              </>
            }
            subtitle="Negocios con base en otra comuna que atienden esta zona"
          >
            <CategoriaEmprendedoresGrid
              items={atiendenParaBloque as BuscarApiItem[]}
              comunaSlug={comunaSlugCtx}
              comunaNombre={nombreComunaLinea}
              comunaNombreEnCard={
                nombreComunaParaTitulos.trim() !== nombreComunaLinea.trim()
                  ? nombreComunaParaTitulos
                  : null
              }
              usarCardSimple={modoActivacionPreview}
              emptyMessage="No encontramos resultados de cobertura para esta búsqueda."
            />
          </TerritorialAccordionBlock>
        </>
      ) : sinResultadosParaQ ? (
        <>
          <TrackImpressions
            slugs={[
              ...fallbackBaseOrdenados,
              ...fallbackAtiendenOrdenados,
              ...fallbackGlobalNacional,
            ]
              .map((i) => String(i.slug || i.id || ""))
              .filter(Boolean)}
            comuna_slug={comunaSlugCtx}
            q={meta?.q || q}
          />
          <div
            className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-5"
            style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
          >
            <h3 className="m-0 text-lg font-black text-slate-900">
              Aún no tenemos {qLegibleTitulo} en {nombreComunaLinea}
            </h3>
            <p className="mt-2 m-0 text-sm leading-relaxed text-slate-600">
              Puedes ser el primero en aparecer o recomendarnos a alguien que ofrezca este servicio.
            </p>
            {!modoActivacionPreview && comunaSlugOk ? (
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href={`/publicar?${paramsPublicarVacios.toString()}`}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-extrabold text-white no-underline hover:bg-slate-800"
                >
                  Publicar mi emprendimiento
                </Link>
                <Link
                  href={`/recomendar?${paramsRecomendarVacios.toString()}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-900 no-underline hover:bg-slate-50"
                >
                  Recomendar emprendedor
                </Link>
              </div>
            ) : null}
          </div>

          <p className="mb-5 m-0 text-sm leading-relaxed text-slate-700">
            No hay resultados en esta comuna. Puedes ver servicios que atienden tu comuna o explorar
            otras zonas.
          </p>

          <div className="space-y-6 sm:space-y-7">
            <TerritorialAccordionBlock
              variant="local"
              persistPrefix={`resultados:${comunaSlugCtx}`}
              which="base"
              instanceId={`resultados-${comunaSlugCtx}-fallback-base`}
              title={
                <>
                  Otros emprendimientos en {nombreComunaParaTitulos} (
                  {fallbackBaseOrdenados.length})
                </>
              }
              subtitle="Con base en esta comuna · sin filtrar por tu búsqueda"
            >
              <CategoriaEmprendedoresGrid
                items={fallbackBaseOrdenados as BuscarApiItem[]}
                comunaSlug={comunaSlugCtx}
                comunaNombre={nombreComunaLinea}
                comunaNombreEnCard={
                  nombreComunaParaTitulos.trim() !== nombreComunaLinea.trim()
                    ? nombreComunaParaTitulos
                    : null
                }
                usarCardSimple={modoActivacionPreview}
                emptyMessage="Aún no hay otros emprendimientos con base en esta comuna."
              />
            </TerritorialAccordionBlock>
            <TerritorialAccordionBlock
              variant="cobertura"
              persistPrefix={`resultados:${comunaSlugCtx}`}
              which="atienden"
              instanceId={`resultados-${comunaSlugCtx}-fallback-atienden`}
              className="mt-6 sm:mt-7"
              title={
                <>
                  También atienden {nombreComunaParaTitulos} desde otras comunas (
                  {fallbackAtiendenOrdenados.length})
                </>
              }
              subtitle="Negocios con base fuera de esta comuna que atienden esta zona"
            >
              <CategoriaEmprendedoresGrid
                items={fallbackAtiendenOrdenados as BuscarApiItem[]}
                comunaSlug={comunaSlugCtx}
                comunaNombre={nombreComunaLinea}
                comunaNombreEnCard={
                  nombreComunaParaTitulos.trim() !== nombreComunaLinea.trim()
                    ? nombreComunaParaTitulos
                    : null
                }
                usarCardSimple={modoActivacionPreview}
                emptyMessage="Aún no hay negocios que declaren cobertura hacia esta comuna."
              />
            </TerritorialAccordionBlock>
            {!modoActivacionPreview ? (
              <div className="mt-6 sm:mt-7 space-y-3">
                {!fueraZonaIntentada && fallbackGlobalNacional.length === 0 && !loadingFueraZona ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void cargarOpcionesFueraZona()}
                      className="inline-flex w-full max-w-md items-center justify-center rounded-xl border border-teal-300 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-extrabold text-teal-950 shadow-sm hover:bg-emerald-100/90 sm:w-auto"
                    >
                      Mostrar opciones fuera de tu zona
                    </button>
                    {regionParam ? (
                      <p className="m-0 text-sm text-slate-600">
                        También puedes{" "}
                        <Link
                          href={hrefOtrasComunas}
                          className="font-bold text-sky-900 underline decoration-sky-300 underline-offset-2 hover:text-sky-950"
                        >
                          ver {qLegibleTitulo} en {regionFocoNombre || "tu región"}
                        </Link>
                        .
                      </p>
                    ) : null}
                  </>
                ) : null}
                {loadingFueraZona ? (
                  <p className="m-0 text-sm text-slate-600" aria-live="polite">
                    Buscando opciones en otras regiones…
                  </p>
                ) : null}
                {errorFueraZona ? (
                  <p className="m-0 text-sm text-red-700" role="alert">
                    {errorFueraZona}
                  </p>
                ) : null}
                {fueraZonaIntentada &&
                !loadingFueraZona &&
                fallbackGlobalNacional.length === 0 &&
                !errorFueraZona ? (
                  <p className="m-0 text-sm text-slate-600">
                    No encontramos opciones fuera de tu región para esta búsqueda.
                  </p>
                ) : null}
                {fallbackGlobalNacional.length > 0 ? (
                  <TerritorialAccordionBlock
                    variant="cobertura"
                    persistPrefix={`resultados:${comunaSlugCtx}`}
                    which="fuera_zona"
                    instanceId={`resultados-${comunaSlugCtx}-fallback-fuera-zona`}
                    className="mt-2"
                    defaultCollapsed
                    title={<>Opciones fuera de tu zona ({fallbackGlobalNacional.length})</>}
                    subtitle="Negocios en otras regiones que podrían servirte"
                  >
                    <CategoriaEmprendedoresGrid
                      items={fallbackGlobalNacional}
                      comunaSlug={comunaSlugCtx}
                      comunaNombre={nombreComunaLinea}
                      omitirContextoComuna
                      preservarOrdenItems
                      listadoNotaDebajoUbicacion="No disponible en tu región"
                      usarCardSimple={modoActivacionPreview}
                      emptyMessage="No encontramos opciones en otras regiones."
                    />
                  </TerritorialAccordionBlock>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>{bloques}</>
      )}
    </div>
  );
}
