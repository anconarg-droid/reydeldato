import { describe, expect, it } from "vitest";
import {
  abiertaPorMinimosFromVwRow,
  comunaPublicaAbierta,
} from "./comunaPublicaAbierta";

describe("abiertaPorMinimosFromVwRow", () => {
  it("porcentaje >= 100", () => {
    expect(abiertaPorMinimosFromVwRow({ porcentaje_apertura: 100 })).toBe(true);
    expect(abiertaPorMinimosFromVwRow({ porcentaje_apertura: 34.6 })).toBe(false);
  });

  it("abierta explícita", () => {
    expect(abiertaPorMinimosFromVwRow({ abierta: true, porcentaje_apertura: 0 })).toBe(
      true
    );
  });
});

describe("comunaPublicaAbierta", () => {
  it("forzar gana sobre vw", () => {
    expect(comunaPublicaAbierta(true, { porcentaje_apertura: 10 })).toBe(true);
  });

  it("sin forzar usa minimos", () => {
    expect(comunaPublicaAbierta(false, { porcentaje_apertura: 100 })).toBe(true);
    expect(comunaPublicaAbierta(false, { porcentaje_apertura: 10 })).toBe(false);
  });
});
