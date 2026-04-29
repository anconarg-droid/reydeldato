"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

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

function defaultColumns(itemCount: number): string {
  const n = Math.max(0, Math.floor(Number(itemCount) || 0));
  return n === 1
    ? "grid-cols-1 justify-items-center [&>*]:w-full [&>*]:max-w-sm"
    : n === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
}

/**
 * Contenedor de grilla compartido por búsqueda pública y landing de categoría
 * (mismas columnas, gap y estado vacío que `PublicSearchResults`).
 *
 * `gridClassName`: si se pasa (p. ej. `/abrir-comuna`), reemplaza la rejilla por defecto.
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
  /** Rejilla responsive fija (ej. `grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4`). */
  gridClassName?: string;
}) {
  if (itemCount <= 0) {
    return <div style={EMPTY_STYLE}>{emptyMessage}</div>;
  }
  const baseGridClassName = `grid w-full gap-4 items-stretch ${defaultColumns(itemCount)}`;
  return (
    <div className={cn(gridChildLayoutClass, gridClassName ?? baseGridClassName)}>
      {children}
    </div>
  );
}
