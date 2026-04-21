/**
 * Etiquetas de por qué un emprendedor publicado cuenta para el avance de apertura
 * de una comuna (misma idea que count_emprendedores_abrir_comuna_activacion).
 */

export type MotivoCuentaComuna =
  | "comuna_base"
  | "comuna_legacy"
  | "cobertura_pivot_comunas"
  | "lista_comunas_cobertura"
  | "cobertura_regional"
  | "nacional";

export const MOTIVO_CUENTA_LABEL: Record<MotivoCuentaComuna, string> = {
  comuna_base: "Comuna base",
  comuna_legacy: "Comuna (campo legacy)",
  cobertura_pivot_comunas: "Cobertura N:M (pivot comunas)",
  lista_comunas_cobertura: "Lista comunas_cobertura",
  cobertura_regional: "Cobertura regional / varias regiones",
  nacional: "Cobertura nacional",
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Comparar IDs de comuna/emprendedor sin depender del casing del UUID. */
function normId(v: unknown): string {
  return s(v).toLowerCase();
}

function coberturaTipoNorm(e: {
  cobertura_tipo?: unknown;
  nivel_cobertura?: unknown;
}): string {
  return s(e.cobertura_tipo || e.nivel_cobertura).toLowerCase();
}

export type EmpRowCuenta = {
  id: unknown;
  comuna_base_id?: unknown;
  comuna_id?: unknown;
  cobertura_tipo?: unknown;
  nivel_cobertura?: unknown;
  comunas_cobertura?: unknown;
  /** Mismo tipo que `comunas.id`; canónico para varias_comunas. */
  comunas_cobertura_ids?: unknown;
};

export function motivosEmprendedorCuentaParaComuna(
  e: EmpRowCuenta,
  ctx: {
    comunaId: string;
    comunaSlug: string;
    emprendedorEnPivotComuna: boolean;
    emprendedorEnPivotRegion: boolean;
  }
): MotivoCuentaComuna[] {
  const eid = s(e.id);
  if (!eid) return [];

  const cid = normId(ctx.comunaId);
  const slug = ctx.comunaSlug.trim().toLowerCase();

  const out: MotivoCuentaComuna[] = [];

  const baseId = e.comuna_base_id != null ? normId(e.comuna_base_id) : "";
  const legacyId = e.comuna_id != null ? normId(e.comuna_id) : "";

  if (baseId && baseId === cid) {
    out.push("comuna_base");
  } else if (!baseId && legacyId === cid) {
    // Esquema solo `comuna_id`: es la comuna del negocio (equivalente a “base”).
    out.push("comuna_base");
  } else if (baseId && legacyId === cid && legacyId !== baseId) {
    // Conviven ambos campos y solo `comuna_id` apunta a esta comuna.
    out.push("comuna_legacy");
  }
  if (ctx.emprendedorEnPivotComuna) {
    out.push("cobertura_pivot_comunas");
  }

  const ct = coberturaTipoNorm(e);
  if (ct === "varias_comunas") {
    const idArr = Array.isArray(e.comunas_cobertura_ids) ? e.comunas_cobertura_ids : [];
    const hitId = idArr.some((x) => normId(x) === cid || Number(x) === Number(cid));
    const arr = Array.isArray(e.comunas_cobertura) ? e.comunas_cobertura : [];
    const hitSlug = arr.some((x) => s(x).toLowerCase() === slug);
    if (hitId || hitSlug) out.push("lista_comunas_cobertura");
  }

  if (
    (ct === "varias_regiones" || ct === "regional") &&
    ctx.emprendedorEnPivotRegion
  ) {
    out.push("cobertura_regional");
  }

  if (ct === "nacional") {
    out.push("nacional");
  }

  return out;
}
