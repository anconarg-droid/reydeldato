/** Helpers para planes con inicio diferido (pagar durante trial). */

function parseFin(v: string | null | undefined): Date | null {
  if (v == null || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ¿Hay una compra de plan ya persistida pero cuyo periodo pagado **aún no comenzó**?
 *
 * Convención (producto): `plan_inicia_at > now` implica periodo diferido (p. ej. parte al término del trial).
 */
export function planContratadoPendienteDeInicio(
  planActivo: boolean | null | undefined,
  planIniciaAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (planActivo !== true) return false;
  const ini = parseFin(planIniciaAt ?? null);
  return ini != null && ini.getTime() > now.getTime();
}
