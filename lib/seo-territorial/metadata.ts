import type { Metadata } from "next";

const SITE_NAME = "Rey del Dato";

/**
 * Base URL del sitio (sin barra final). Usar en canonical y og:url.
 */
export function getBaseUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Construye la URL canónica absoluta a partir de segmentos de path (sin leading/trailing slashes).
 */
export function buildCanonical(...pathSegments: string[]): string {
  const base = getBaseUrl();
  const path = pathSegments
    .filter(Boolean)
    .map((s) => s.replace(/^\/|\/$/g, ""))
    .join("/");
  return path ? `${base}/${path}` : base;
}

export type RobotsOption = "index" | "noindex";

/**
 * Criterio index/noindex para páginas territoriales.
 * - index: hay resultados o hay contenido de apertura útil (CTAs, estado).
 * - noindex: página vacía / thin.
 */
export function getRobotsForTerritorialPage(
  hasResults: boolean,
  hasAperturaContent: boolean
): Metadata["robots"] {
  if (hasResults) return { index: true, follow: true };
  if (hasAperturaContent) return { index: true, follow: true };
  return { index: false, follow: false };
}

type MetadataOptions = {
  robots?: Metadata["robots"];
};

/**
 * Metadatos para página de comuna: /[comuna_slug]
 */
export function buildMetadataComuna(
  comunaSlug: string,
  comunaNombre: string,
  options?: MetadataOptions
): Metadata {
  const title = `Emprendimientos y servicios en ${comunaNombre} | ${SITE_NAME}`;
  const description = `Encuentra emprendimientos y servicios en ${comunaNombre}. Contacta directo por WhatsApp con negocios de tu comuna.`;
  const canonical = buildCanonical(comunaSlug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(options?.robots != null && { robots: options.robots }),
  };
}

/**
 * Metadatos para página de categoría o subcategoría en comuna: /[comuna_slug]/[segment_slug]
 */
export function buildMetadataSegment(
  comunaSlug: string,
  comunaNombre: string,
  segmentNombre: string,
  segmentSlug: string,
  options?: MetadataOptions
): Metadata {
  const title = `${segmentNombre} en ${comunaNombre} | ${SITE_NAME}`;
  const description = `Encuentra ${segmentNombre.toLowerCase()} en ${comunaNombre}. Emprendedores y servicios locales. Contacta por WhatsApp.`;
  const canonical = buildCanonical(comunaSlug, segmentSlug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(options?.robots != null && { robots: options.robots }),
  };
}
