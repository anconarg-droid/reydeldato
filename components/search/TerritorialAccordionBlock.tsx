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

function AccordionChevron({
  collapsed,
  iconClassName,
}: {
  collapsed: boolean;
  iconClassName: string;
}) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-out ${
        collapsed ? "-rotate-90" : "rotate-0"
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
 * Barra acordeón full width: título + subtítulo + chevron; mismo patrón en búsqueda y abrir-comuna.
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
  const buttonClass = isLocal
    ? "flex w-full min-h-[4.5rem] cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-[#0b6b54] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d7a5f] sm:min-h-0 sm:items-center sm:gap-4 sm:px-4 sm:py-4"
    : "flex w-full min-h-[4.5rem] cursor-pointer items-start gap-3 border-b border-teal-200/90 bg-emerald-50/90 px-4 py-4 text-left transition-colors hover:bg-emerald-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 sm:min-h-0 sm:items-center sm:gap-4 sm:px-4 sm:py-4";
  const titleClass = isLocal
    ? "block text-base font-black leading-snug tracking-tight text-white sm:text-lg"
    : "block text-base font-black leading-snug tracking-tight text-teal-900 sm:text-lg";
  const subtitleClass = isLocal
    ? "mt-1.5 block text-sm font-medium leading-relaxed text-emerald-50"
    : "mt-1.5 block text-sm font-medium leading-relaxed text-teal-800/75";
  const hintClass = isLocal
    ? "mt-1.5 block text-[11px] font-medium leading-snug text-white/75"
    : "mt-1.5 block text-[11px] font-medium leading-snug text-teal-700/70";
  const chevronWrapClass = isLocal
    ? "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/35 bg-white/15 shadow-sm transition-colors hover:bg-white/25 sm:mt-0 sm:size-10"
    : "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-teal-300/80 bg-white shadow-sm transition-colors hover:bg-teal-50 sm:mt-0 sm:size-10";
  const panelClass = isLocal
    ? "border-t border-emerald-900/25 bg-white px-4 py-5 sm:px-5 sm:py-6"
    : "border-t border-teal-200/90 bg-white px-4 py-5 sm:px-5 sm:py-6";

  const btnId = `${instanceId}-titulo`;
  const panelId = `${instanceId}-panel`;

  const toggleLabel = collapsed ? "Abrir bloque" : "Cerrar bloque";

  return (
    <section className={`${sectionClass} ${className}`.trim()}>
      <button
        type="button"
        id={btnId}
        onClick={toggle}
        className={buttonClass}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        aria-label={toggleLabel}
      >
        <span className="min-w-0 flex-1 pr-1">
          <span className={titleClass}>{title}</span>
          <span className={subtitleClass}>{subtitle}</span>
          <span className={hintClass}>Ver / ocultar resultados</span>
        </span>
        <span className={chevronWrapClass} aria-hidden>
          <AccordionChevron
            collapsed={collapsed}
            iconClassName={isLocal ? "text-white" : "text-teal-900"}
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
