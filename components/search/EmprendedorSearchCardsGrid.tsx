"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const GRID_STYLE_DENSO: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
  gap: 16,
  alignItems: "stretch",
};

/**
 * Por cantidad de cards en el bloque (cada bloque usa su propio `itemCount`):
 * - 1 → una columna centrada
 * - 2–4 → dos columnas (alineado con el otro bloque territorial)
 * - >4 → rejilla habitual
 */
export function gridStyleForResultCount(n: number): CSSProperties {
  if (n <= 0) return GRID_STYLE_DENSO;
  if (n === 1) {
    return {
      display: "grid",
      gridTemplateColumns: "minmax(0, min(100%, 420px))",
      justifyContent: "center",
      width: "100%",
      gap: 16,
      alignItems: "stretch",
    };
  }
  if (n <= 4) {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      maxWidth: 920,
      marginLeft: "auto",
      marginRight: "auto",
      width: "100%",
      gap: 16,
      alignItems: "stretch",
    };
  }
  return GRID_STYLE_DENSO;
}

const EMPTY_STYLE: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  background: "#fff",
  padding: 18,
  color: "#6b7280",
  fontSize: 15,
};

const gridChildLayoutClass =
  "min-h-0 [&>*]:h-full [&>*]:min-h-0 [&>[data-grid-row='banner']]:h-auto [&>[data-grid-row='banner']]:min-h-0";

/**
 * Contenedor de grilla compartido por búsqueda pública y landing de categoría
 * (mismas columnas, gap y estado vacío que `PublicSearchResults`).
 *
 * `gridClassName`: si se pasa (p. ej. `/abrir-comuna`), reemplaza el estilo inline
 * por clases Tailwind sin cambiar el resto de rutas.
 */
export default function EmprendedorSearchCardsGrid({
  emptyMessage,
  itemCount,
  children,
  gridClassName,
}: {
  emptyMessage: string;
  itemCount: number;
  children: ReactNode;
  /** Rejilla responsive fija (ej. `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`). */
  gridClassName?: string;
}) {
  if (itemCount <= 0) {
    return <div style={EMPTY_STYLE}>{emptyMessage}</div>;
  }
  if (gridClassName) {
    return <div className={cn(gridChildLayoutClass, gridClassName)}>{children}</div>;
  }
  return (
    <div className={cn(gridChildLayoutClass)} style={gridStyleForResultCount(itemCount)}>
      {children}
    </div>
  );
}
