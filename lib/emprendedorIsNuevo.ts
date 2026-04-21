/**
 * Alias de compatibilidad hacia {@link isNuevo} en `productRules.ts`.
 * La regla definitiva y los tests viven en `lib/productRules.ts`.
 */

import { isNuevo } from "@/lib/productRules";

export type EmprendedorIsNuevoInput = {
  fechaCreacion: unknown;
  estadoPublicacion: unknown;
  fechaReferencia?: Date;
};

export function emprendedorIsNuevo(input: EmprendedorIsNuevoInput): boolean {
  return isNuevo({
    createdAt: input.fechaCreacion as string | Date | null | undefined,
    estadoPublicacion: input.estadoPublicacion as string | null | undefined,
    now: input.fechaReferencia,
  });
}
