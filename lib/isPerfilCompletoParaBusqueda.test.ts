import { describe, expect, it } from "vitest";
import { isPerfilCompletoParaBusqueda } from "./isPerfilCompletoParaBusqueda";

describe("isPerfilCompletoParaBusqueda", () => {
  it("acepta esFichaCompleta true", () => {
    expect(isPerfilCompletoParaBusqueda({ esFichaCompleta: true })).toBe(true);
  });

  it("acepta estadoFicha ficha_completa", () => {
    expect(isPerfilCompletoParaBusqueda({ estadoFicha: "ficha_completa" })).toBe(true);
  });

  it("acepta fichaActivaPorNegocio true (alias API)", () => {
    expect(isPerfilCompletoParaBusqueda({ fichaActivaPorNegocio: true })).toBe(true);
  });

  it("rechaza perfil básico", () => {
    expect(
      isPerfilCompletoParaBusqueda({
        esFichaCompleta: false,
        estadoFicha: "ficha_basica",
        fichaActivaPorNegocio: false,
      }),
    ).toBe(false);
  });
});
