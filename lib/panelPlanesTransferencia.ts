import type { PlanCodigoPago } from "@/lib/planPagoCatalogo";
import { montoClpPorPlanCodigo } from "@/lib/planPagoCatalogo";

export type TransferenciaBancoUi = {
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  rut: string;
  correo: string;
  nombre: string;
};

export function getTransferenciaBancoUi(): TransferenciaBancoUi {
  // MVP: valores por env con fallback seguro (no secreto).
  return {
    banco: process.env.NEXT_PUBLIC_TRANSFER_BANCO?.trim() || "Banco (configurar)",
    tipoCuenta: process.env.NEXT_PUBLIC_TRANSFER_TIPO_CUENTA?.trim() || "Cuenta (configurar)",
    numeroCuenta: process.env.NEXT_PUBLIC_TRANSFER_NUMERO_CUENTA?.trim() || "—",
    rut: process.env.NEXT_PUBLIC_TRANSFER_RUT?.trim() || "—",
    correo: process.env.NEXT_PUBLIC_TRANSFER_CORREO?.trim() || "—",
    nombre: process.env.NEXT_PUBLIC_TRANSFER_NOMBRE?.trim() || "Rey del Dato",
  };
}

export function montoExactoTransferencia(planCodigo: PlanCodigoPago): number {
  return montoClpPorPlanCodigo(planCodigo);
}

export function montoExactoDisplayClp(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-CL")}`;
}

