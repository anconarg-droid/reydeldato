"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeText } from "@/lib/search/normalizeText";
import TrackImpressions from "@/components/TrackImpressions";
import ComunaTerritorialBloquesConFiltro from "@/components/search/ComunaTerritorialBloquesConFiltro";
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

export default function PublicSearchResults({
  comuna,
  q = "",
  categoriaSlug,
  subcategoriaSlug,
  subcategoriaId,
  modoActivacionPreview = false,
  activacionServicioLabel = "",
  activacionCtaPublicarHref = "",
  activacionCtaRecomendarHref = "",
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
  activacionCtaPublicarHref?: string;
  activacionCtaRecomendarHref?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

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
          throw new Error(
            apiErr || "No se pudo cargar la búsqueda."
          );
        }

        if (!mounted) return;

        const nextItems = Array.isArray(json.items) ? json.items : [];
        setItems(nextItems);
        setMeta(json.meta || null);
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
  }, [comuna, q, subcategoriaSlug, subcategoriaId, modoActivacionPreview]);

  /** El API ya entrega con-foto primero y rotación por subgrupo; esto refuerza el mismo criterio de forma estable. */
  const deTuComuna = useMemo(
    () =>
      sortItemsConFotoPrimeroStable(
        items.filter((i) => i.bloque === "de_tu_comuna"),
        (i) => i.fotoPrincipalUrl
      ),
    [items]
  );

  const atiendenTuComuna = useMemo(
    () =>
      sortItemsConFotoPrimeroStable(
        items.filter((i) => i.bloque === "atienden_tu_comuna"),
        (i) => i.fotoPrincipalUrl
      ),
    [items]
  );

  if (loading) {
    if (modoActivacionPreview) {
      return (
        <p className="text-sm text-slate-500" aria-live="polite">
          Buscando en esta comuna según lo que escribiste…
        </p>
      );
    }
    return <div>Cargando resultados...</div>;
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

  if (items.length === 0) {
    if (modoActivacionPreview) {
      const label = (activacionServicioLabel || "").trim() || "servicios";
      const hp = (activacionCtaPublicarHref || "").trim();
      const hr = (activacionCtaRecomendarHref || "").trim();
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 sm:px-6">
          <p className="m-0 text-sm font-semibold text-slate-900">
            Aún no hay {label} registrados en esta comuna
          </p>
          {hp && hr ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={hp}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Publicar mi emprendimiento
              </Link>
              <Link
                href={hr}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Recomendar emprendedor
              </Link>
            </div>
          ) : null}
        </div>
      );
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
      enTuComuna={deTuComuna as BuscarApiItem[]}
      atiendenTuComuna={atiendenTuComuna as BuscarApiItem[]}
      comunaSlug={meta?.comunaSlug || comuna}
      comunaNombre={nombreComunaLinea}
      nombreComunaDisplay={nombreComunaLinea}
      gridEmptyMessage="No encontramos resultados."
      ocultarFiltroSoloCompletos={modoActivacionPreview}
      usarCardSimple={modoActivacionPreview}
      pocosResultadosServicioLabel={
        modoActivacionPreview && (activacionServicioLabel || "").trim()
          ? (activacionServicioLabel || "").trim()
          : null
      }
      trackImpressions={{
        comuna_slug: meta?.comunaSlug || comuna,
        q: meta?.q || q,
      }}
      panelSinBaseEnComuna={
        deTuComuna.length === 0 && atiendenTuComuna.length > 0 ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              background: "#fff",
              padding: 18,
            }}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 900, color: "#111827" }}>
              Aún no hay resultados en tu comuna
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
              Pero estos emprendimientos sí pueden atenderte:
            </p>
          </div>
        ) : null
      }
    />
  );

  if (modoActivacionPreview) {
    const label = (activacionServicioLabel || "").trim() || "servicios";
    return (
      <div className="mt-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-4 sm:px-5">
        <p className="text-sm font-semibold text-slate-900">
          Encontramos algunos {label} que ya atienden esta comuna
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Resultados acotados a tu búsqueda; no es el directorio completo hasta que la comuna esté
          activa.
        </p>
        <div className="mt-4">{bloques}</div>
      </div>
    );
  }

  return bloques;
}
