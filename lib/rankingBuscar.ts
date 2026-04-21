/**
 * Ranking de resultados de búsqueda por comuna.
 * - Bloque 1 (en la comuna): perfil completo, rotación estable, prioridad a nuevos.
 * - Bloque 2 (atienden la comuna): distancia geográfica, perfil completo, rotación leve.
 * No usar clics/visitas como criterio principal (evitar efecto bola de nieve).
 */

import { calcularEstadoFicha } from "@/lib/estadoFicha";

function slugNorm(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

/** Orden de cercanía desde la comuna buscada (ej.: desde Calera de Tango, San Bernardo y Talagante antes que Santiago). */
const RANKING_DISTANCE_ORDER: Record<string, string[]> = {
  "calera-de-tango": [
    "san-bernardo",
    "talagante",
    "padre-hurtado",
    "maipu",
    "penaflor",
    "santiago",
  ],
  "padre-hurtado": ["penaflor", "talagante", "maipu", "santiago"],
  "talagante": ["penaflor", "padre-hurtado", "buin", "san-bernardo", "calera-de-tango", "santiago"],
  "penaflor": ["padre-hurtado", "talagante", "maipu", "santiago"],
  "san-bernardo": ["calera-de-tango", "buin", "la-pintana", "el-bosque", "santiago"],
  maipu: ["padre-hurtado", "penaflor", "cerrillos", "pudahuel", "santiago"],
  santiago: ["providencia", "nunoa", "estacion-central", "recoleta", "maipu", "penaflor"],
};

/** Comunas vecinas (fallback si no hay orden explícito). */
const COMUNAS_CERCANAS: Record<string, string[]> = {
  "calera-de-tango": ["san-bernardo", "buin", "maipu"],
  "padre-hurtado": ["maipu", "penaflor", "talagante"],
  penaflor: ["padre-hurtado", "talagante", "isla-de-maipo"],
  talagante: ["penaflor", "padre-hurtado", "buin", "san-bernardo"],
  buin: ["san-bernardo", "talagante", "paine", "calera-de-tango"],
  "san-bernardo": ["buin", "calera-de-tango", "la-pintana", "el-bosque"],
  maipu: ["cerrillos", "estacion-central", "padre-hurtado", "pudahuel"],
  santiago: ["providencia", "nunoa", "estacion-central", "recoleta"],
};

/** Seed por día para rotación estable (mismo orden durante el día). */
export function getDaySeed(): number {
  return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

/** Clave de orden estable: mismo id + mismo día → misma posición. Evita que el orden cambie en cada refresh. */
export function stableRotationKey(id: string, seed: number): number {
  let h = 0;
  const str = `${id}-${seed}`;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % 100000;
}

export type ItemWithPlan = {
  plan_activo?: boolean | null;
  plan_expira_at?: string | null;
  trial_expira_at?: string | null;
  trial_expira?: string | null;
  descripcion_libre?: string | null;
  frase_negocio?: string | null;
  whatsapp_principal?: string | null;
  foto_principal_url?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
};

/** Perfil completo: `calcularEstadoFicha` (solo suscripción). */
export function isFullProfile(item: ItemWithPlan): boolean {
  return (
    calcularEstadoFicha({
      nombre_emprendimiento: null,
      whatsapp_principal: item.whatsapp_principal ?? null,
      frase_negocio: item.frase_negocio ?? null,
      comuna_id: null,
      cobertura_tipo: null,
      descripcion_libre: item.descripcion_libre ?? null,
      galeria_count: null,
      foto_principal_url: item.foto_principal_url,
      instagram: item.instagram,
      sitio_web: item.sitio_web,
      plan_activo: item.plan_activo === true ? true : item.plan_activo ?? null,
      plan_expira_at: item.plan_expira_at ?? null,
      trial_expira_at: item.trial_expira_at ?? null,
      trial_expira: item.trial_expira ?? null,
    }) === "mejorada"
  );
}

/**
 * Distancia de ranking: menor = más cerca de la comuna buscada.
 * Usa orden explícito si existe; si no, vecinos = 1, resto = 2.
 */
export function distanceRank(comunaBaseSlug: string, comunaBuscadaSlug: string): number {
  const base = slugNorm(comunaBaseSlug);
  const buscada = slugNorm(comunaBuscadaSlug);
  if (!buscada) return 0;

  const order = RANKING_DISTANCE_ORDER[buscada];
  if (order) {
    const idx = order.indexOf(base);
    if (idx >= 0) return idx;
    return 500 + base.length; // mismo peso para “no en lista”, desempate por nombre
  }

  const vecinas = COMUNAS_CERCANAS[buscada];
  if (vecinas && vecinas.includes(base)) return 0;
  return 100;
}
