/**
 * Reglas de producto centralizadas (listados, cards, badges).
 * Documentación: `docs/reglas-producto.md`, `docs/decisiones.md`.
 */

import type { EstadoFichaCard } from "@/lib/types/productRules";
import { getRegionShort } from "@/utils/regionShort";
import { tieneFichaCompleta } from "@/lib/tieneFichaCompleta";

export type { EstadoFichaCard };

const MS_POR_DIA = 86_400_000;
const NUEVO_MAX_DIAS = 15;

function trimStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseInstant(v: unknown): Date | null {
  const s = trimStr(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Etiqueta "Nuevo": publicado, con fecha de creación y antigüedad ≤ 15×24h (ms).
 * No usa librerías externas; válido en Node y navegador.
 */
export function isNuevo(args: {
  createdAt?: string | Date | null;
  estadoPublicacion?: string | null;
  now?: Date;
}): boolean {
  if (trimStr(args.estadoPublicacion) !== "publicado") return false;
  const creado = args.createdAt instanceof Date ? args.createdAt : parseInstant(args.createdAt);
  if (creado == null) return false;
  const ref = args.now ?? new Date();
  const ageMs = ref.getTime() - creado.getTime();
  if (ageMs < 0) return false;
  return ageMs <= NUEVO_MAX_DIAS * MS_POR_DIA;
}

function instantToIso(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  const s = trimStr(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Perfil completo en producto = {@link tieneFichaCompleta} (trial o plan pagado vigente).
 * Campos de contenido se ignoran.
 */
export function isPerfilCompleto(args: {
  planActivo?: boolean | null;
  planExpiraAt?: string | Date | null;
  trialActivo?: boolean | null;
  trialExpiraAt?: string | Date | null;
  trialExpira?: string | Date | null;
  descripcionLibre?: string | null;
  fraseNegocio?: string | null;
  whatsappPrincipal?: string | null;
  instagram?: string | null;
  sitioWeb?: string | null;
  fotoPrincipalUrl?: string | null;
  now?: Date;
}): boolean {
  return tieneFichaCompleta(
    {
      planActivo: args.planActivo,
      planExpiraAt: instantToIso(args.planExpiraAt),
      trialExpiraAt: instantToIso(args.trialExpiraAt),
      trialExpira: instantToIso(args.trialExpira),
      trialActivo: args.trialActivo,
    },
    args.now
  );
}

export function getEstadoFicha(args: {
  planActivo?: boolean | null;
  planExpiraAt?: string | Date | null;
  trialActivo?: boolean | null;
  trialExpiraAt?: string | Date | null;
  trialExpira?: string | Date | null;
  descripcionLibre?: string | null;
  fraseNegocio?: string | null;
  whatsappPrincipal?: string | null;
  fotoPrincipalUrl?: string | null;
  instagram?: string | null;
  sitioWeb?: string | null;
  now?: Date;
}): EstadoFichaCard {
  return isPerfilCompleto(args) ? "ficha_completa" : "ficha_basica";
}

function regionEtiqueta(args: {
  regionNombre?: string | null;
  regionSlug?: string | null;
}): string {
  const nombre = trimStr(args.regionNombre);
  if (nombre) {
    const short = getRegionShort(nombre);
    return short || nombre;
  }
  const slug = trimStr(args.regionSlug);
  if (!slug) return "";
  const pseudoNombre = slug.replace(/[-_]+/g, " ");
  const short = getRegionShort(pseudoNombre);
  return short || pseudoNombre;
}

/**
 * Una línea: `📍 Comuna · RM` o sin región si no hay datos de región.
 */
export function formatComunaRegion(args: {
  comunaNombre?: string | null;
  regionNombre?: string | null;
  regionSlug?: string | null;
}): string {
  const comuna = trimStr(args.comunaNombre);
  if (!comuna) return "";
  const reg = regionEtiqueta(args);
  return reg ? `📍 ${comuna} · ${reg}` : `📍 ${comuna}`;
}

function normSlug(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Texto del badge de cobertura si la base territorial ≠ comuna filtro (por slug).
 */
export function getBadgeCobertura(args: {
  comunaBaseSlug?: string | null;
  comunaBuscadaSlug?: string | null;
  comunaBuscadaNombre?: string | null;
}): string | null {
  const base = normSlug(trimStr(args.comunaBaseSlug));
  const buscada = normSlug(trimStr(args.comunaBuscadaSlug));
  const nombre = trimStr(args.comunaBuscadaNombre);
  if (!base || !buscada || base === buscada || !nombre) return null;
  return `Atiende ${nombre}`;
}

export function getTextoCardBasica(): string {
  return "Solo WhatsApp";
}

export function getTextoCardCompleta(): string {
  return "Ver detalles";
}

/** Línea 1 del placeholder sin foto en cards (ver `docs/reglas-producto.md`). */
export function getPlaceholderSinFotoTitulo(): string {
  return "Aún no muestra fotos";
}

/** Línea 2 del placeholder sin foto en cards. */
export function getPlaceholderSinFotoSub(): string {
  return "Puedes pedir referencias por WhatsApp";
}
