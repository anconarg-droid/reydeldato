import { describe, expect, it } from "vitest";
import { getEstadoComercialEmprendedor } from "./getEstadoComercialEmprendedor";

describe("getEstadoComercialEmprendedor", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("trial_activo cuando faltan más de 7 días", () => {
    const r = getEstadoComercialEmprendedor(
      {
        trialExpiraAt: "2026-07-20T12:00:00.000Z",
      },
      now
    );
    expect(r.estado).toBe("trial_activo");
    expect(r.diasRestantes).toBeGreaterThan(7);
  });

  it("trial_por_vencer cuando faltan ≤7 días", () => {
    const r = getEstadoComercialEmprendedor(
      {
        trialExpiraAt: "2026-06-18T12:00:00.000Z",
      },
      now
    );
    expect(r.estado).toBe("trial_por_vencer");
    expect(r.diasRestantes).toBeLessThanOrEqual(7);
    expect(r.diasRestantes).toBeGreaterThan(0);
  });

  it("plan_activo prioriza sobre trial", () => {
    const r = getEstadoComercialEmprendedor(
      {
        planActivo: true,
        planExpiraAt: "2026-08-01T12:00:00.000Z",
        trialExpiraAt: "2026-06-16T12:00:00.000Z",
      },
      now
    );
    expect(r.estado).toBe("plan_activo");
  });

  it("plan_por_vencer", () => {
    const r = getEstadoComercialEmprendedor(
      {
        planActivo: true,
        planExpiraAt: "2026-06-18T12:00:00.000Z",
      },
      now
    );
    expect(r.estado).toBe("plan_por_vencer");
  });

  it("basico sin fechas vigentes ni vencimiento reciente", () => {
    const r = getEstadoComercialEmprendedor(
      {
        planActivo: false,
        trialExpiraAt: "2025-01-01T12:00:00.000Z",
      },
      now
    );
    expect(r.estado).toBe("basico");
  });

  it("vencido_reciente si trial cayó hace ≤7 días", () => {
    const r = getEstadoComercialEmprendedor(
      {
        planActivo: false,
        trialExpiraAt: "2026-06-12T12:00:00.000Z",
      },
      now
    );
    expect(r.estado).toBe("vencido_reciente");
  });
});
