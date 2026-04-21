import { describe, expect, it } from "vitest";
import { buildAtiendeLine, humanizeCoverageSlug } from "./atiendeResumenLabel";

describe("buildAtiendeLine", () => {
  it("solo_comuna → vacío", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "solo_comuna",
        regionesCobertura: [],
      }),
    ).toBe("");
  });

  it("solo_mi_comuna (alias) → vacío", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "solo_mi_comuna",
        regionesCobertura: [],
      }),
    ).toBe("");
  });

  it("nacional", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "nacional",
        regionesCobertura: [],
      }),
    ).toBe("Atiende todo Chile");
  });

  it("varias_comunas → siempre el mismo texto (sin listar comunas)", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_comunas",
        regionesCobertura: [],
      }),
    ).toBe("Atiende varias comunas");
  });

  it("varias_regiones una región", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_regiones",
        regionesCobertura: ["region-metropolitana"],
      }),
    ).toBe("Atiende RM");
  });

  it("varias_regiones dos regiones", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_regiones",
        regionesCobertura: ["region-metropolitana", "valparaiso"],
      }),
    ).toBe("Atiende RM y Valparaíso");
  });

  it("varias_regiones más de dos", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_regiones",
        regionesCobertura: ["a", "b", "c"],
      }),
    ).toBe("Atiende varias regiones");
  });

  it("varias_regiones sin regiones en datos", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_regiones",
        regionesCobertura: [],
      }),
    ).toBe("Atiende varias regiones");
  });

  it("regional (alias) → varias_regiones", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "regional",
        regionesCobertura: ["region-metropolitana"],
      }),
    ).toBe("Atiende RM");
  });
});

describe("humanizeCoverageSlug", () => {
  it("slug a palabras", () => {
    expect(humanizeCoverageSlug("region-metropolitana")).toBe(
      "Region Metropolitana",
    );
  });
});
