/**
 * Interpreta respuesta JSON de `WebpayPlus.Transaction.commit` (REST).
 *
 * Criterio de éxito: `status === "AUTHORIZED"`, `response_code === 0` y monto
 * `amount` presente y mayor que 0 (validación defensiva alineada a flujo Webpay Plus).
 */

export function webpayCommitFueAprobado(
  data: Record<string, unknown> | null | undefined
): boolean {
  if (!data || typeof data !== "object") return false;
  if (data.status !== "AUTHORIZED") return false;
  const code = data.response_code;
  if (!(code === 0 || code === "0")) return false;
  const amt = amountDesdeCommit(data);
  return amt != null && amt > 0;
}

export function authorizationCodeDesdeCommit(
  data: Record<string, unknown>
): string | null {
  const v = data.authorization_code;
  if (v == null) return null;
  return String(v).trim() || null;
}

export function transactionDateDesdeCommit(
  data: Record<string, unknown>
): string | null {
  const v = data.transaction_date;
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

export function amountDesdeCommit(data: Record<string, unknown>): number | null {
  const v = data.amount;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
