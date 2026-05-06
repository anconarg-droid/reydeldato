/**
 * Persistencia manual en `public.pagos` (transferencias).
 * Mantener alineado con supabase/migrations/*pagos*.
 */

/** `plan_codigo` en tabla `pagos` ( coincide con checkout / periodicidad cobrada ). */
export const PAGO_PLAN_CODIGOS = ["basico", "semestral", "anual"] as const;
export type PagoPlanCodigoTabla = (typeof PAGO_PLAN_CODIGOS)[number];

export const PAGO_METODOS_TABLA = ["webpay", "transferencia"] as const;
export type PagoMetodoTabla = (typeof PAGO_METODOS_TABLA)[number];

export const PAGO_PROVEEDORES_TABLA = ["transbank", "manual"] as const;
export type PagoProveedorTabla = (typeof PAGO_PROVEEDORES_TABLA)[number];

export const PAGO_ESTADOS_MANUAL = [
  "pendiente",
  "en_revision",
  "aprobado",
  "rechazado",
  "expirado",
] as const;
export type PagoEstadoManual = (typeof PAGO_ESTADOS_MANUAL)[number];

/** Fila mínima devuelta por inserts/selects de transferencia. */
export type PagoTransferenciaRow = {
  id: string;
  emprendedor_id: string;
  plan_codigo: PagoPlanCodigoTabla;
  metodo_pago: PagoMetodoTabla;
  proveedor: PagoProveedorTabla;
  referencia_pago: string;
  estado: PagoEstadoManual;
  monto: number;
  moneda: string;
  comprobante_url: string | null;
  observaciones: string | null;
  access_token: string | null;
  created_at: string;
  paid_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
};

export function isPagoEstadoManual(v: string): v is PagoEstadoManual {
  return (PAGO_ESTADOS_MANUAL as readonly string[]).includes(v);
}
