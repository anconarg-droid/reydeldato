"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ComunaEnPreparacion from "@/components/ComunaEnPreparacion";
import ResultadoBadge from "@/components/ResultadoBadge";

type ProgresoItem = { nombre: string; actual: number; meta: number };

type SearchHit = {
  objectID?: string;
  id?: string;
  slug?: string;
  nombre?: string;
  descripcion_corta?: string | null;
  descripcion_larga?: string | null;

  comuna_nombre?: string | null;
  comuna_slug?: string | null;

  categoria_slug_final?: string | null;
  subcategoria_slug_final?: string | null;

  foto_principal_url?: string | null;
  keywords?: string[] | null;
  search_text?: string | null;
  public?: boolean;

  whatsapp?: string | null;

  // legado / opcionales
  comuna_base_nombre?: string | null;
  comuna_base_slug?: string | null;
  categoria_slug?: string | null;
  subcategoria_slug?: string | null;
  bucket?: "exacta" | "local" | "cobertura_comuna" | "regional" | "nacional" | "general";
  coverage_keys?: string[] | null;
  coverage_labels?: string[] | null;
  nivel_cobertura?: string | null;
  comuna_base_slug?: string | null;
  comuna_base_nombre?: string | null;
};

type SearchResponse = {
  ok: boolean;
  total: number;
  items: SearchHit[];
  q?: string;
  comuna?: string | null;
  suggested_terms?: string[];
  modo?: "comuna_en_preparacion";
  comuna_slug?: string;
  progreso?: ProgresoItem[];
};

export type QuickFilterOrderBy = "todos" | "perfil_completo" | "nuevos";

type Props = {
  query: string;
  comuna?: string;
  sectorSlug?: string;
  tipoActividad?: string;
  subcategoriaSlug?: string;
  orderBy?: QuickFilterOrderBy;
  onSuggestedTerms?: (terms: string[]) => void;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export default function PublicSearchResults({
  query,
  comuna,
  sectorSlug,
  tipoActividad,
  subcategoriaSlug,
  orderBy = "todos",
  onSuggestedTerms,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  const hasFilters =
    !!query.trim() ||
    !!(comuna && comuna.trim()) ||
    !!(sectorSlug && sectorSlug.trim()) ||
    !!(subcategoriaSlug && subcategoriaSlug.trim()) ||
    !!(tipoActividad && tipoActividad.trim());

  useEffect(() => {
    if (!hasFilters) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (comuna && comuna.trim()) params.set("comuna", comuna.trim());
        if (sectorSlug && sectorSlug.trim()) params.set("sector", sectorSlug.trim());
        if (subcategoriaSlug && subcategoriaSlug.trim()) {
          params.set("subcategoria", subcategoriaSlug.trim());
        }
        if (tipoActividad && tipoActividad.trim()) {
          params.set("tipo_actividad", tipoActividad.trim());
        }
        if (orderBy && orderBy !== "todos") {
          params.set("order", orderBy);
        }

        const res = await fetch(`/api/buscar?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Error HTTP ${res.status}`);
        }

        const json = await res.json();
        // eslint-disable-next-line no-console
        console.log("BUSCAR API RESPONSE:", json);

        // NORMALIZACIÓN CRÍTICA
        const normalizedData: SearchResponse = {
          ok: !!json.ok,
          items: Array.isArray(json.items)
            ? json.items
            : Array.isArray(json.data)
              ? json.data
              : [],
          total:
            typeof json.total === "number"
              ? json.total
              : Array.isArray(json.items)
                ? json.items.length
                : Array.isArray(json.data)
                  ? json.data.length
                  : 0,
          q: json.q,
          comuna: json.comuna ?? null,
          suggested_terms: Array.isArray(json.suggested_terms)
            ? json.suggested_terms
            : undefined,
          modo: json.modo,
          comuna_slug: json.comuna_slug,
          progreso: json.progreso,
        };

        setData(normalizedData);

        if (onSuggestedTerms && Array.isArray(normalizedData.suggested_terms)) {
          onSuggestedTerms(normalizedData.suggested_terms);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Error al buscar");
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [hasFilters, query, comuna, sectorSlug, subcategoriaSlug, tipoActividad, orderBy, onSuggestedTerms]);

  if (!hasFilters) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Buscando…</h2>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="animate-pulse">
            <div className="bg-slate-200 h-40 rounded-lg mb-3" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">Error al buscar: {error}</div>;
  }

  if (!data) {
    return null;
  }

  const items: SearchHit[] = Array.isArray(data?.items) ? data.items : [];
  const total: number =
    typeof data?.total === "number" ? data.total : items.length;

  // Logs temporales de depuración de UI
  // eslint-disable-next-line no-console
  console.log("SEARCH_UI_DATA", data);
  // eslint-disable-next-line no-console
  console.log("SEARCH_UI_ITEMS", items);
  // eslint-disable-next-line no-console
  console.log("SEARCH_UI_TOTAL", total);

  if (data.modo === "comuna_en_preparacion") {
    return (
      <div className="mt-6 max-w-2xl mx-auto">
        <p className="text-sm text-slate-600 mb-4">
          Rey del Dato aún no está disponible en <strong>{data.comuna}</strong>.
        </p>
        <ComunaEnPreparacion
          comunaSlug={data.comuna_slug}
          comunaNombre={data.comuna}
          progreso={data.progreso ?? [{ nombre: "Emprendimientos", actual: 0, meta: 40 }]}
        />
      </div>
    );
  }

  // Usar directamente los items devueltos por la API (sin deduplicar por nombre)
  const itemsFinal: SearchHit[] = items;

  const totalFinal = total;

  const comunaLabel =
    (comuna && comuna.trim()) ||
    data.comuna ||
    (itemsFinal[0]?.comuna_nombre ?? itemsFinal[0]?.comuna_base_nombre) ||
    "";

  const comunaBuscadaNorm = (comuna || data.comuna || "").trim().toLowerCase();

  const hayExactos =
    comunaBuscadaNorm.length > 0 &&
    itemsFinal.some((item) => {
      const slug = (item.comuna_slug || item.comuna_base_slug || "").trim().toLowerCase();
      const nombre = (item.comuna_nombre || item.comuna_base_nombre || "").trim().toLowerCase();
      return slug === comunaBuscadaNorm || nombre === comunaBuscadaNorm;
    });

  const mostrarMensajeFallback =
    Boolean(comunaBuscadaNorm) && !hayExactos && itemsFinal.length > 0;

  return (
    <section className="mt-4 space-y-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm text-slate-500 mb-3">
          {totalFinal === 0
            ? "Sin resultados"
            : totalFinal === 1
              ? "1 resultado"
              : `${totalFinal} resultados`}
          {query.trim()
            ? ` para “${query.trim()}”${
                comunaLabel ? ` en ${comunaLabel}` : ""
              }`
            : comunaLabel
              ? ` en ${comunaLabel}`
              : ""}
        </h2>
      </header>

      {itemsFinal.length === 0 ? (
        <p className="text-sm text-slate-600">
          No encontramos resultados para esta búsqueda. Prueba con otra palabra
          o cambia la comuna.
        </p>
      ) : (
        <>
          {mostrarMensajeFallback && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                Aún no tenemos suficientes emprendimientos en {comunaLabel}.
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Te mostramos opciones cercanas mientras tanto.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {itemsFinal.map((item) => {
            const key = s(item.id || item.slug || item.objectID);
            const slug = s(item.slug || item.id || item.objectID);
            const nombre = item.nombre || "Emprendimiento";
            const descripcion =
              item.descripcion_corta ||
              item.descripcion_larga ||
              "Sin descripción disponible";
            const comunaTexto =
              item.comuna_nombre ||
              (item.comuna_slug ? item.comuna_slug.replace(/-/g, " ") : "") ||
              comunaLabel ||
              "";
            const categoriaTexto =
              item.categoria_slug_final ||
              item.categoria_slug ||
              "";

            let motivo: string | undefined;
            if (item.bucket === "local" || item.bucket === "exacta") {
              motivo = "En tu comuna";
            } else if (
              item.bucket === "cobertura_comuna" ||
              item.bucket === "regional" ||
              item.bucket === "nacional"
            ) {
              motivo = "Disponible en tu comuna";
            }

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition p-4 flex flex-col"
              >
                {/* Imagen */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 mb-3">
                  {item.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.foto_principal_url}
                      alt={nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* Nombre */}
                <h3 className="font-bold text-slate-900 text-lg mb-1 line-clamp-2">
                  {nombre}
                </h3>

                {/* Comuna */}
                {comunaTexto && (
                  <p className="text-xs text-slate-500 mb-0.5">
                    {comunaTexto}
                  </p>
                )}

                {/* Categoría */}
                {categoriaTexto && (
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    {categoriaTexto}
                  </p>
                )}

                {/* Badge territorial */}
                {motivo && (
                  <div className="mb-2">
                    <ResultadoBadge bucket={item.bucket} motivo={motivo} />
                  </div>
                )}

                {/* Descripción */}
                <p className="text-xs text-slate-600 mb-3 line-clamp-2 overflow-hidden text-ellipsis">
                  {descripcion}
                </p>

                {/* CTA */}
                <div className="flex gap-2 mt-3">
                  {item.whatsapp ? (
                    <>
                      <a
                        href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        WhatsApp
                      </a>
                      {slug && (
                        <a
                          href={`/emprendedor/${slug}`}
                          className="flex-1 text-center bg-slate-900 text-white text-sm py-2 rounded-lg hover:bg-slate-800 transition"
                        >
                          Ver detalle
                        </a>
                      )}
                    </>
                  ) : (
                    slug && (
                      <a
                        href={`/emprendedor/${slug}`}
                        className="w-full text-center bg-slate-900 text-white text-sm py-2 rounded-lg hover:bg-slate-800 transition"
                      >
                        Ver detalle
                      </a>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </section>
  );
}