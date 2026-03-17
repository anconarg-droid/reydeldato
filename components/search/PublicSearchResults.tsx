"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ComunaEnPreparacion from "@/components/ComunaEnPreparacion";

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

  // legado / opcionales
  comuna_base_nombre?: string | null;
  comuna_base_slug?: string | null;
  categoria_slug?: string | null;
  subcategoria_slug?: string | null;
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
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-20 rounded-lg border border-slate-200 bg-slate-100 animate-pulse"
            />
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

  const itemsFinal: SearchHit[] = Array.isArray(data?.items) ? data.items : [];
  const totalFinal =
    typeof data?.total === "number" ? data.total : itemsFinal.length;

  const comunaLabel =
    (comuna && comuna.trim()) ||
    data.comuna ||
    (itemsFinal[0]?.comuna_nombre ?? itemsFinal[0]?.comuna_base_nombre) ||
    "";

  return (
    <section className="mt-4 space-y-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {itemsFinal.map((item) => {
            const key = s(item.id || item.slug || item.objectID);
            const slug = s(item.slug || item.id || item.objectID);
            const nombre = item.nombre || "Emprendimiento sin nombre";
            const comunaTexto =
              item.comuna_nombre ||
              item.comuna_base_nombre ||
              comunaLabel ||
              "Sin comuna";
            const categoriaTexto =
              item.categoria_slug_final || item.categoria_slug || "Sin categoría";

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition p-4 flex flex-col"
              >
                {/* Imagen */}
                <div className="w-full h-40 bg-slate-100 rounded-lg overflow-hidden mb-3">
                  {item.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.foto_principal_url}
                      alt={nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">
                      🏪
                    </div>
                  )}
                </div>

                {/* Nombre */}
                <h3 className="font-semibold text-slate-900 text-base mb-1 line-clamp-2">
                  {nombre}
                </h3>

                {/* Comuna */}
                <p className="text-sm text-slate-600 mb-1">
                  {comunaTexto}
                </p>

                {/* Categoría */}
                <p className="text-xs text-slate-400 mb-2">
                  {categoriaTexto}
                </p>

                {/* Descripción */}
                {item.descripcion_corta && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {item.descripcion_corta}
                  </p>
                )}

                {/* CTA */}
                <div className="mt-auto flex gap-2">
                  {slug && (
                    <Link
                      href={`/emprendedor/${slug}`}
                      className="inline-flex items-center justify-center text-center bg-slate-900 text-white text-sm py-2 px-3 rounded-md hover:bg-slate-800 transition"
                    >
                      Ver ficha
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}