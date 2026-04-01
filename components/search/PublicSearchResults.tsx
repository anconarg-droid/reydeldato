"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeText } from "@/lib/search/normalizeText";
import { buildAtiendeLine } from "@/lib/search/atiendeResumenLabel";
import TrackImpressions from "@/components/TrackImpressions";
import EmprendedorSearchCard, {
  type EmprendedorSearchCardProps,
} from "@/components/search/EmprendedorSearchCard";

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
  esFichaCompleta?: boolean;
  estadoFicha?: "ficha_completa" | "ficha_basica";
  subcategoriasSlugs?: string[];
  subcategoriasNombres?: string[];
  categoriaNombre?: string;
  comunasCobertura?: string[];
  regionesCobertura?: string[];
  esNuevo?: boolean;
};

type SearchMeta = {
  comunaSlug: string;
  comunaNombre: string;
  q: string;
  page: number;
  limit: number;
  offset: number;
  total: number;
  modo: "busqueda_con_texto" | "solo_comuna";
  subcategoriaSlug?: string | null;
  subcategoriaId?: string | null;
};

type SearchResponse = {
  ok: boolean;
  items: SearchItem[];
  total: number;
  meta: SearchMeta;
};

function searchItemToCardProps(
  item: SearchItem,
  meta: SearchMeta | null,
  analyticsSource: EmprendedorSearchCardProps["analyticsSource"]
): EmprendedorSearchCardProps {
  const baseNombre =
    String(item.comunaBaseNombre || "").trim() ||
    String(item.comunaNombre || "").trim() ||
    "—";
  const slugCtx = String(meta?.comunaSlug || item.comunaSlug || "");
  const nombreCtx = String(meta?.comunaNombre || item.comunaNombre || "");
  const atiendeLine = buildAtiendeLine({
    coberturaTipo: item.coberturaTipo,
    comunasCobertura: item.comunasCobertura,
    regionesCobertura: item.regionesCobertura,
    comunaBuscadaSlug: slugCtx,
    comunaBuscadaNombre: nombreCtx,
  });
  const esFichaCompleta =
    item.esFichaCompleta === true || item.estadoFicha === "ficha_completa";

  return {
    slug: item.slug,
    nombre: item.nombre,
    fotoPrincipalUrl: item.fotoPrincipalUrl,
    whatsappPrincipal: item.whatsappPrincipal,
    esFichaCompleta,
    estadoFicha: item.estadoFicha,
    bloqueTerritorial: item.bloque,
    frase: item.frase,
    descripcionLibre: item.descripcion ?? "",
    subcategoriasNombres: item.subcategoriasNombres,
    subcategoriasSlugs: item.subcategoriasSlugs,
    categoriaNombre: item.categoriaNombre,
    comunaBaseNombre: baseNombre,
    atiendeLine,
    esNuevo: item.esNuevo === true,
    analyticsSource,
  };
}

function ResultadosGrid({
  items,
  meta,
  analyticsSource,
}: {
  items: SearchItem[];
  meta: SearchMeta | null;
  analyticsSource: EmprendedorSearchCardProps["analyticsSource"];
}) {
  if (!items.length) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          background: "#fff",
          padding: 18,
          color: "#6b7280",
          fontSize: 15,
        }}
      >
        No encontramos resultados.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: 16,
      }}
    >
      {items.map((item) => (
        <EmprendedorSearchCard
          key={item.id}
          {...searchItemToCardProps(item, meta, analyticsSource)}
        />
      ))}
    </div>
  );
}

export default function PublicSearchResults({
  comuna,
  q = "",
  subcategoriaSlug,
  subcategoriaId,
}: {
  comuna: string;
  q?: string;
  /** Slug en public.subcategorias; el API resuelve y filtra o hace fallback texto */
  subcategoriaSlug?: string;
  subcategoriaId?: string | null;
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
        let qSend = q.trim();
        if (
          slug &&
          qSend &&
          normalizeText(qSend) === normalizeText(slug)
        ) {
          qSend = "";
        }
        if (qSend) params.set("q", qSend);
        if (slug) params.set("subcategoria", slug);
        const sid = subcategoriaId?.trim();
        if (sid) params.set("subcategoria_id", sid);

        const res = await fetch(`/api/buscar?${params.toString()}`, {
          cache: "no-store",
        });

        const json: SearchResponse = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error("No se pudo cargar la búsqueda.");
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
  }, [comuna, q, subcategoriaSlug, subcategoriaId]);

  const deTuComuna = useMemo(
    () => items.filter((i) => i.bloque === "de_tu_comuna"),
    [items]
  );

  const atiendenTuComuna = useMemo(
    () => items.filter((i) => i.bloque === "atienden_tu_comuna"),
    [items]
  );

  if (loading) {
    return <div>Cargando resultados...</div>;
  }

  if (error) {
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

  return (
    <section style={{ display: "grid", gap: 24 }}>
      {/* Cards: EmprendedorSearchCard (misma base que búsqueda global en ResultadosClient). */}
      <TrackImpressions
        slugs={items.map((i) => i.slug)}
        comuna_slug={meta?.comunaSlug || comuna}
        q={meta?.q || q}
      />

      {/* Fuente de verdad: siempre mostrar bloques cuando hay comuna (con o sin texto). */}
      {true ? (
        <>
          {deTuComuna.length > 0 && (
            <section style={{ display: "grid", gap: 14 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                En tu comuna ({deTuComuna.length})
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                Negocios con base en {meta?.comunaNombre || comuna}
              </p>
              <ResultadosGrid
                items={deTuComuna}
                meta={meta}
                analyticsSource="comuna"
              />
            </section>
          )}
          {deTuComuna.length === 0 && atiendenTuComuna.length > 0 && (
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
          )}

          {deTuComuna.length === 0 && atiendenTuComuna.length === 0 && (
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
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    const qNorm = normalizeText(q);
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
          )}

          {atiendenTuComuna.length > 0 && (
            <section style={{ display: "grid", gap: 14 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                Atienden tu comuna ({atiendenTuComuna.length})
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                Emprendimientos de otras comunas que atienden en {meta?.comunaNombre || comuna}
              </p>
              <ResultadosGrid
                items={atiendenTuComuna}
                meta={meta}
                analyticsSource="comuna"
              />
            </section>
          )}

          {deTuComuna.length === 0 &&
            atiendenTuComuna.length === 0 && (
              <ResultadosGrid
                items={[]}
                meta={meta}
                analyticsSource="comuna"
              />
            )}
        </>
      ) : null}
    </section>
  );
}
