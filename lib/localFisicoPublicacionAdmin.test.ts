import { describe, expect, it } from "vitest";
import {
  comunaIdTieneValor,
  esLocalFisicoFilaValida,
  normalizarUuidEmprendedorId,
} from "./localFisicoPublicacionAdmin";

describe("esLocalFisicoFilaValida", () => {
  it("acepta dirección con espacios y comuna_id", () => {
    expect(
      esLocalFisicoFilaValida({
        direccion: "  Av. Principal 123  ",
        comuna_id: "uuid-here",
      })
    ).toBe(true);
  });

  it("acepta comuna_id numérico (smallint/int en producción)", () => {
    expect(
      esLocalFisicoFilaValida({
        direccion: "pata local 6161 local 2",
        comuna_id: 1319,
      })
    ).toBe(true);
  });

  it("acepta referencia si dirección viene vacía", () => {
    expect(
      esLocalFisicoFilaValida({
        direccion: "",
        referencia: "Galpón 2, sector industrial",
        comuna_id: "uuid-here",
      })
    ).toBe(true);
  });

  it("rechaza sin comuna_id", () => {
    expect(
      esLocalFisicoFilaValida({
        direccion: "Calle 1",
        comuna_id: null,
      })
    ).toBe(false);
  });

  it("comunaIdTieneValor acepta int y string numérico", () => {
    expect(comunaIdTieneValor(1319)).toBe(true);
    expect(comunaIdTieneValor("1319")).toBe(true);
    expect(comunaIdTieneValor(null)).toBe(false);
  });

  it("normalizarUuidEmprendedorId inserta guiones en 32 hex", () => {
    const sin = "31d610e917ef4de9b35d444dcf2925da";
    expect(normalizarUuidEmprendedorId(sin)).toBe(
      "31d610e9-17ef-4de9-b35d-444dcf2925da"
    );
  });

  it("rechaza dirección vacía", () => {
    expect(
      esLocalFisicoFilaValida({
        direccion: "   ",
        comuna_id: "x",
      })
    ).toBe(false);
  });
});
