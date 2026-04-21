import type { CSSProperties } from "react";

/**
 * Mismo ancho y gutters que `app/[comuna]/page.tsx` (`<div className="max-w-5xl mx-auto px-4 py-6">`).
 * Resultados (`PublicSearchResults`) viven dentro; sin caja intermedia para que la grilla use todo el ancho útil.
 */
export const busquedaComunaResultsShellClassName = "mx-auto w-full max-w-5xl px-4";

/**
 * Mismo ritmo vertical que `ResultadosClient` (header + barra + resultados en `/[comuna]`).
 */
export const busquedaComunaPageStackClassName = "mt-2 space-y-4";

/**
 * Mismo layout visual que `PublicSearchResults` (búsqueda por comuna en `/[comuna]`, Buscar, Resultados).
 * Centralizado para reutilizar en landing de categoría con `?comuna=`.
 */
export const busquedaComunaOuterSectionStyle: CSSProperties = {
  display: "grid",
  gap: 28,
};

export const busquedaComunaBlockSectionStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

export const busquedaComunaH2Style: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 900,
  color: "#111827",
};

export const busquedaComunaSubtextStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#6b7280",
};
