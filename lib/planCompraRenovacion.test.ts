import { describe, expect, it } from "vitest";
import { calcularUpdatePlanTrasCompra } from "./planCompraRenovacion";

describe("calcularUpdatePlanTrasCompra", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("sin plan vigente: ancla en now y reinicia plan_inicia_at", () => {
    const r = calcularUpdatePlanTrasCompra({
      periodicidad: "mensual",
      planActivoActual: false,
      planExpiraAtActual: "2025-01-01T00:00:00.000Z",
      planIniciaAtActual: "2024-01-01T00:00:00.000Z",
      now,
    });
    expect(r.plan_inicia_at).toBe(now.toISOString());
    const exp = new Date(r.plan_expira_at);
    expect(exp.getTime()).toBeGreaterThan(now.getTime());
  });

  it("plan vigente: extiende desde plan_expira_at y conserva plan_inicia_at", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const fin = "2026-12-31T23:59:59.000Z";
    const r = calcularUpdatePlanTrasCompra({
      periodicidad: "mensual",
      planActivoActual: true,
      planExpiraAtActual: fin,
      planIniciaAtActual: inicio,
      now,
    });
    expect(r.plan_inicia_at).toBe(inicio);
    const exp = new Date(r.plan_expira_at);
    const ancla = new Date(fin);
    const esperado = new Date(ancla);
    esperado.setDate(esperado.getDate() + 30);
    expect(exp.toISOString()).toBe(esperado.toISOString());
  });
});
