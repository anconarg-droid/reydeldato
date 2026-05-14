import type { PlanCodigoPago } from "@/lib/planPagoCatalogo";
import { montoClpPorPlanCodigo } from "@/lib/planPagoCatalogo";

/** Lee env nuevo; si vacío, intenta nombre legacy (migración suave). */
function envTransferPreferido(nuevo: string, legacyKey?: string): string {
  const prim = String(process.env[nuevo] ?? "").trim();
  if (prim) return prim;
  if (legacyKey) return String(process.env[legacyKey] ?? "").trim();
  return "";
}

/**
 * True solo si están definidas todas las variables públicas obligatorias
 * (sin fallbacks). La opción “Pagar por transferencia” debe ocultarse si falta alguna.
 */
export function transferenciaBancoEnvCompleto(): boolean {
  const banco = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_BANK_NAME",
    "NEXT_PUBLIC_TRANSFER_BANCO"
  );
  const numero = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_ACCOUNT_NUMBER",
    "NEXT_PUBLIC_TRANSFER_NUMERO_CUENTA"
  );
  const rut = envTransferPreferido("NEXT_PUBLIC_TRANSFER_RUT");
  const titular = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_ACCOUNT_HOLDER",
    "NEXT_PUBLIC_TRANSFER_NOMBRE"
  );
  const correo = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_EMAIL",
    "NEXT_PUBLIC_TRANSFER_CORREO"
  );
  return Boolean(banco && numero && rut && titular && correo);
}

export type TransferenciaBancoUi = {
  titular: string;
  rut: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  correo: string;
  /** Igual que {@link transferenciaBancoEnvCompleto} al momento de leer. */
  configuracionCompleta: boolean;
};

/**
 * Datos para mostrar en /panel/planes. Si falta alguna variable obligatoria,
 * `configuracionCompleta` es false y los campos pueden venir como "—".
 */
export function getTransferenciaBancoUi(): TransferenciaBancoUi {
  const banco = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_BANK_NAME",
    "NEXT_PUBLIC_TRANSFER_BANCO"
  );
  const tipoCuenta = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_ACCOUNT_TYPE",
    "NEXT_PUBLIC_TRANSFER_TIPO_CUENTA"
  );
  const numeroCuenta = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_ACCOUNT_NUMBER",
    "NEXT_PUBLIC_TRANSFER_NUMERO_CUENTA"
  );
  const rut = envTransferPreferido("NEXT_PUBLIC_TRANSFER_RUT");
  const titular = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_ACCOUNT_HOLDER",
    "NEXT_PUBLIC_TRANSFER_NOMBRE"
  );
  const correo = envTransferPreferido(
    "NEXT_PUBLIC_TRANSFER_EMAIL",
    "NEXT_PUBLIC_TRANSFER_CORREO"
  );
  const ok = transferenciaBancoEnvCompleto();
  return {
    titular: titular || "—",
    rut: rut || "—",
    banco: banco || "—",
    tipoCuenta: tipoCuenta || "—",
    numeroCuenta: numeroCuenta || "—",
    correo: correo || "—",
    configuracionCompleta: ok,
  };
}

export function montoExactoTransferencia(planCodigo: PlanCodigoPago): number {
  return montoClpPorPlanCodigo(planCodigo);
}

export function montoExactoDisplayClp(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-CL")}`;
}
