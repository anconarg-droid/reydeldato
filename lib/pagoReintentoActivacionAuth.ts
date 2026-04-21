import type { NextRequest } from "next/server";

/**
 * POST `/api/admin/pagos/reintentar-activacion`.
 * En producción exige `PAGO_REINTENTO_ACTIVACION_SECRET` en header `x-pago-reintento-secret`.
 */
export function pagoReintentoActivacionAllowed(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const secret = process.env.PAGO_REINTENTO_ACTIVACION_SECRET?.trim();
  if (!secret) {
    return false;
  }
  return req.headers.get("x-pago-reintento-secret") === secret;
}
