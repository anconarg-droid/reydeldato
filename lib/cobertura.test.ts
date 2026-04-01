import { describe, it, expect } from "vitest";
import { coberturaTexto, coberturaBadge, normalizeCoberturaTipoDb } from "./cobertura";

describe("normalizeCoberturaTipoDb", () => {
  it("mapea alias legacy al enum de DB", () => {
    expect(normalizeCoberturaTipoDb("solo_mi_comuna")).toBe("solo_comuna");
    expect(normalizeCoberturaTipoDb("regional")).toBe("varias_regiones");
  });

  it("deja valores ya alineados con DB", () => {
    expect(normalizeCoberturaTipoDb("varias_comunas")).toBe("varias_comunas");
    expect(normalizeCoberturaTipoDb("nacional")).toBe("nacional");
  });
});

describe("coberturaTexto", () => {
  it("nacional devuelve texto de todo Chile", () => {
    expect(coberturaTexto("nacional")).toBe("Atiende en todo Chile");
  });

  it("solo_mi_comuna devuelve Solo en su comuna", () => {
    expect(coberturaTexto("solo_mi_comuna")).toBe("Solo en su comuna");
    expect(coberturaTexto("solo_comuna")).toBe("Solo en su comuna");
  });

  it("varias_comunas con lista devuelve texto con comunas", () => {
    expect(coberturaTexto("varias_comunas", ["Calera de Tango", "Maipú"])).toBe(
      "Varias comunas: Calera de Tango, Maipú"
    );
  });

  it("varias_comunas sin lista devuelve solo Varias comunas", () => {
    expect(coberturaTexto("varias_comunas")).toBe("Varias comunas");
  });

  it("varias_regiones devuelve Varias regiones", () => {
    expect(coberturaTexto("varias_regiones")).toBe("Varias regiones");
  });

  it("regional (alias) devuelve Varias regiones", () => {
    expect(coberturaTexto("regional")).toBe("Varias regiones");
  });

  it("valor vacío o desconocido devuelve No informada o el valor", () => {
    expect(coberturaTexto("")).toBe("No informada");
    expect(coberturaTexto(undefined)).toBe("No informada");
  });
});

describe("coberturaBadge", () => {
  it("solo_mi_comuna devuelve badge con emoji ubicación", () => {
    const r = coberturaBadge("solo_mi_comuna");
    expect(r.label).toBe("Solo mi comuna");
    expect(r.emoji).toBe("📍");
  });

  it("varias_comunas devuelve badge Varias comunas", () => {
    const r = coberturaBadge("varias_comunas");
    expect(r.label).toBe("Varias comunas");
    expect(r.emoji).toBe("📌");
  });

  it("varias_regiones devuelve Cobertura regional", () => {
    const r = coberturaBadge("varias_regiones");
    expect(r.label).toBe("Cobertura regional");
    expect(r.emoji).toBe("🗺️");
  });

  it("regional (alias) devuelve Cobertura regional", () => {
    const r = coberturaBadge("regional");
    expect(r.label).toBe("Cobertura regional");
  });

  it("nacional devuelve Todo Chile", () => {
    const r = coberturaBadge("nacional");
    expect(r.label).toBe("Todo Chile");
    expect(r.emoji).toBe("🌎");
  });

  it("normaliza mayúsculas", () => {
    expect(coberturaBadge("NACIONAL").label).toBe("Todo Chile");
    expect(coberturaBadge("Solo_Mi_Comuna").label).toBe("Solo mi comuna");
  });
});
