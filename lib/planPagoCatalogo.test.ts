import { describe, expect, it } from "vitest";
import {
  montoClpPorPlanCodigo,
  planCodigoToPeriodicidad,
} from "./planPagoCatalogo";

describe("planPagoCatalogo", () => {
  it("montos alineados al panel", () => {
    expect(montoClpPorPlanCodigo("basico")).toBe(5900);
    expect(montoClpPorPlanCodigo("semestral")).toBe(24900);
    expect(montoClpPorPlanCodigo("anual")).toBe(39900);
  });

  it("basico → periodicidad mensual en BD", () => {
    expect(planCodigoToPeriodicidad("basico")).toBe("mensual");
  });
});
