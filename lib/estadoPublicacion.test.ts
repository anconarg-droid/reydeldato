import { describe, it, expect } from "vitest";
import {
  ESTADO_PUBLICACION,
  emprendedorFichaVisiblePublicamente,
  normalizeEstadoPublicacionDb,
} from "./estadoPublicacion";

describe("estadoPublicacion", () => {
  it("normaliza a minúsculas", () => {
    expect(normalizeEstadoPublicacionDb("Publicado")).toBe(
      ESTADO_PUBLICACION.publicado
    );
  });

  it("mapea legacy pendiente a en_revision", () => {
    expect(normalizeEstadoPublicacionDb("pendiente")).toBe(
      ESTADO_PUBLICACION.en_revision
    );
  });

  it("solo publicado es visible públicamente", () => {
    expect(emprendedorFichaVisiblePublicamente("publicado")).toBe(true);
    expect(emprendedorFichaVisiblePublicamente("en_revision")).toBe(false);
    expect(emprendedorFichaVisiblePublicamente("pendiente")).toBe(false);
  });
});
