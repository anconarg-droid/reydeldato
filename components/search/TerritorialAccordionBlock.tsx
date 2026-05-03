"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

/**
 * Clave localStorage alineada con el patrón histórico:
 * `{persistPrefix}:bloque-base-colapsado` | `:bloque-atienden-colapsado`
 * con `persistPrefix` p.ej. `abrir-comuna:maipu` o `resultados:maipu`.
 */
export function accordionCollapsedStorageKey(
  persistPrefix: string,
  which: "base" | "atienden"
): string {
  const mid = which === "base" ? "base" : "atienden";
  return `${persistPrefix}:bloque-${mid}-colapsado`;
}

/** Flecha hacia abajo; rota 180° cuando el bloque está abierto. */
function AccordionChevronDown({
  expanded,
  iconClassName,
}: {
  expanded: boolean;
  iconClassName: string;
}) {
  return (
    <svg
      className={`size-[15px] shrink-0 transition-transform duration-200 ease-out ${
        expanded ? "rotate-180" : "rotate-0"
      } ${iconClassName}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export type TerritorialAccordionBlockProps = {
  /** Bloque “local” (marca verde) vs cobertura / atienden (fondo teal claro). */
  variant: "local" | "cobertura";
  /** Prefijo estable, p. ej. `abrir-comuna:slug` o `resultados:slug`. */
  persistPrefix: string;
  which: "base" | "atienden";
  /** Base para `id` de título y panel (único en la página). */
  instanceId: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  className?: string;
  /**
   * Si no hay valor en `localStorage` para este bloque, se usa este estado inicial.
   * Ej.: `/abrir-comuna` — base abierto (`false`), atienden cerrado (`true`).
   */
  defaultCollapsed?: boolean;
};

/**
 * Barra acordeón full width: en móvil título/subtítulo y pill apilados; desde `sm` fila con pill a la derecha.
 */
export default function TerritorialAccordionBlock({
  variant,
  persistPrefix,
  which,
  instanceId,
  title,
  subtitle,
  children,
  className = "",
  defaultCollapsed = false,
}: TerritorialAccordionBlockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const k = accordionCollapsedStorageKey(persistPrefix, which);
      const v = localStorage.getItem(k);
      if (v === "1") setCollapsed(true);
      else if (v === "0") setCollapsed(false);
    } catch {
      /* ignore */
    }
  }, [persistPrefix, which]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          accordionCollapsedStorageKey(persistPrefix, which),
          next ? "1" : "0"
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [persistPrefix, which]);

  const isLocal = variant === "local";
  const sectionClass = isLocal
    ? "w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-800/35 bg-[#0d7a5f] shadow-lg"
    : "w-full min-w-0 overflow-hidden rounded-2xl border border-teal-200 bg-emerald-50 shadow-md";
  const titleClass = isLocal
    ? "block text-base font-black leading-snug tracking-tight text-white sm:text-lg"
    : "block text-base font-black leading-snug tracking-tight text-teal-900 sm:text-lg";
  const subtitleClass = isLocal
    ? "mt-1.5 block text-sm font-medium leading-relaxed text-emerald-50"
    : "mt-1.5 block text-sm font-medium leading-relaxed text-teal-800/75";
  const pillClass = isLocal
    ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[13px] font-medium text-white transition-colors group-hover:bg-white/20"
    : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#99f6e4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#0d7a5f] transition-colors group-hover:bg-teal-50";
  const panelClass = isLocal
    ? "border-t border-emerald-900/25 bg-white px-4 py-5 sm:px-5 sm:py-6"
    : "border-t border-teal-200/90 bg-white px-4 py-5 sm:px-5 sm:py-6";

  /** Móvil: título arriba y pill ancho completo debajo; desktop: fila con botón a la derecha (sin superposición). */
  const headerButtonClass = isLocal
    ? "group flex w-full cursor-pointer flex-col gap-3 px-4 py-[0.85rem] text-left transition-colors hover:bg-[#0b6b54] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d7a5f] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    : "group flex w-full cursor-pointer flex-col gap-3 border-b border-teal-200/90 bg-emerald-50/90 px-4 py-[0.85rem] text-left transition-colors hover:bg-emerald-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4";

  const pillLayoutClass =
    "inline-flex w-full shrink-0 items-center justify-center gap-1.5 sm:w-auto sm:justify-start";

  const btnId = `${instanceId}-titulo`;
  const panelId = `${instanceId}-panel`;
  const expanded = !collapsed;
  const pillLabel = collapsed ? "Ver resultados" : "Ocultar";

  return (
    <section className={`${sectionClass} ${className}`.trim()}>
      <button
        type="button"
        id={btnId}
        onClick={toggle}
        className={headerButtonClass}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <div className="min-w-0 flex-1 text-left">
          <span className={titleClass}>{title}</span>
          <span className={subtitleClass}>{subtitle}</span>
        </div>
        <span className={`${pillClass} ${pillLayoutClass}`}>
          {pillLabel}
          <AccordionChevronDown
            expanded={expanded}
            iconClassName={isLocal ? "text-white" : "text-[#0d7a5f]"}
          />
        </span>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
        aria-hidden={collapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={panelClass}>
            <div className="w-full min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
