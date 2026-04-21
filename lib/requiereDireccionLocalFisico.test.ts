import { describe, expect, it } from "vitest";
import { requiereDireccionSiModalidadLocalFisico } from "./requiereDireccionLocalFisico";

const future = new Date("2035-01-01T12:00:00.000Z");
const past = new Date("2020-01-01T12:00:00.000Z");

describe("requiereDireccionSiModalidadLocalFisico", () => {
  it("sin trial ni plan ⇒ no exige dirección", () => {
    expect(requiereDireccionSiModalidadLocalFisico({}, future)).toBe(false);
    expect(
      requiereDireccionSiModalidadLocalFisico(
        {
          planActivo: false,
          trialExpiraAt: past.toISOString(),
        },
        future
      )
    ).toBe(false);
  });

  it("trial vigente ⇒ exige dirección", () => {
    expect(
      requiereDireccionSiModalidadLocalFisico(
        { trialExpiraAt: future.toISOString() },
        new Date("2030-06-01T12:00:00.000Z")
      )
    ).toBe(true);
  });

  it("plan activo y vigente ⇒ exige dirección", () => {
    expect(
      requiereDireccionSiModalidadLocalFisico(
        {
          planActivo: true,
          planExpiraAt: future.toISOString(),
        },
        new Date("2030-06-01T12:00:00.000Z")
      )
    ).toBe(true);
  });
});
