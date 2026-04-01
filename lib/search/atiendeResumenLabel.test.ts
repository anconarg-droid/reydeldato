import { describe, expect, it } from "vitest";
import { buildAtiendeLine, humanizeCoverageSlug } from "./atiendeResumenLabel";

describe("buildAtiendeLine", () => {
  it("solo_comuna → vacío", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "solo_comuna",
        comunasCobertura: ["x"],
        regionesCobertura: [],
        comunaBuscadaSlug: "maipu",
        comunaBuscadaNombre: "Maipú",
      })
    ).toBe("");
  });

  it("nacional", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "nacional",
        comunasCobertura: [],
        regionesCobertura: [],
        comunaBuscadaSlug: "maipu",
        comunaBuscadaNombre: "Maipú",
      })
    ).toBe("Atiende: Todo Chile");
  });

  it("varias_comunas una coincidencia con comuna buscada", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_comunas",
        comunasCobertura: ["maipu"],
        regionesCobertura: [],
        comunaBuscadaSlug: "maipu",
        comunaBuscadaNombre: "Maipú",
      })
    ).toBe("Atiende: Maipú");
  });

  it("varias_comunas varias", () => {
    expect(
      buildAtiendeLine({
        coberturaTipo: "varias_comunas",
        comunasCobertura: ["a", "b"],
        regionesCobertura: [],
        comunaBuscadaSlug: "maipu",
        comunaBuscadaNombre: "Maipú",
      })
    ).toBe("Atiende: varias comunas");
  });
});

describe("humanizeCoverageSlug", () => {
  it("slug a palabras", () => {
    expect(humanizeCoverageSlug("region-metropolitana")).toBe("Region Metropolitana");
  });
});
