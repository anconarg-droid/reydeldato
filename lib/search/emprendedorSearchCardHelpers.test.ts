import { describe, expect, it } from "vitest";
import {
  getCategoriaCompacta,
  getCoberturaResumen,
  getCoberturaTexto,
  getDescripcionCardCorta,
  getDireccionCard,
  getLineaTaxonomiaCard,
  getModalidadesChips,
  getSubcategoriaDescripcionFallback,
  isPerfilCompletoCard,
  listadoFooterCtasDosColumnas,
  listadoPerfilCompletoUi,
  takeModalidadesChipsPreview,
} from "./emprendedorSearchCardHelpers";

describe("emprendedorSearchCardHelpers", () => {
  it("getCategoriaCompacta arma rubro compacto", () => {
    expect(
      getCategoriaCompacta({
        categoriaNombre: "Automotriz",
        subcategoriasNombres: ["Mecánica integral"],
      }),
    ).toBe("Automotriz · Mecánica integral");
    expect(getCategoriaCompacta({ categoriaNombre: "X", subcategoriasNombres: [] })).toBe("X");
    expect(getCategoriaCompacta({ categoriaNombre: "", subcategoriasSlugs: ["panaderia"] })).toBe(
      "Panaderia",
    );
  });

  it("getLineaTaxonomiaCard coincide con rubro compacto si hay categoría", () => {
    const item = {
      categoriaNombre: "Automotriz",
      subcategoriasNombres: ["Mecánica integral"],
    };
    expect(getLineaTaxonomiaCard(item)).toBe(getCategoriaCompacta(item));
  });

  it("getLineaTaxonomiaCard no muestra sub suelta sin categoría", () => {
    expect(
      getLineaTaxonomiaCard({
        categoriaNombre: "",
        subcategoriasSlugs: ["panaderia"],
      }),
    ).toBe("");
    expect(getSubcategoriaDescripcionFallback({ categoriaNombre: "", subcategoriasSlugs: ["panaderia"] })).toBe(
      "Panaderia",
    );
  });

  it("getDescripcionCardCorta usa sub como fallback si no hay categoría ni texto", () => {
    expect(
      getDescripcionCardCorta(
        { frase: "", descripcionLibre: "" },
        "",
        getSubcategoriaDescripcionFallback({
          categoriaNombre: "",
          subcategoriasNombres: ["Destapes"],
        }),
      ),
    ).toContain("Destapes");
  });

  it("takeModalidadesChipsPreview limita a 3 y cuenta el resto", () => {
    expect(takeModalidadesChipsPreview(["A", "B", "C", "D", "E"], 3)).toEqual({
      visible: ["A", "B", "C"],
      masCount: 2,
    });
    expect(takeModalidadesChipsPreview(["A"], 3)).toEqual({ visible: ["A"], masCount: 0 });
  });

  it("getCoberturaResumen preview comunas +N", () => {
    const line = getCoberturaResumen({
      coberturaTipo: "varias_comunas",
      comunasCobertura: ["maipu", "talagante", "padre-hurtado", "santiago", "providencia"],
      atiendeLine: "",
    });
    expect(line).toContain("Atiende:");
    expect(line).toContain("+2");
  });

  it("getCoberturaTexto varias_comunas sin lista usa comuna base", () => {
    expect(
      getCoberturaTexto({
        coberturaTipo: "varias_comunas",
        comunasCobertura: [],
        comunaBaseNombre: "Maipú",
        atiendeLine: "",
      }),
    ).toBe("Atiende: Maipú");
    expect(
      getCoberturaTexto({
        coberturaTipo: "varias_comunas",
        comunasCobertura: [],
        atiendeLine: "",
      }),
    ).toBe("Atiende: su comuna");
  });

  it("getCoberturaTexto solo_comuna usa Atiende: comuna", () => {
    expect(
      getCoberturaTexto({
        coberturaTipo: "solo_comuna",
        comunaBaseNombre: "Maipú",
        atiendeLine: "",
      }),
    ).toBe("Atiende: Maipú");
  });

  it("getCoberturaTexto nacional y regiones con prefijo Atiende:", () => {
    expect(getCoberturaTexto({ coberturaTipo: "nacional", atiendeLine: "" })).toBe("Atiende: todo Chile");
    expect(
      getCoberturaTexto({
        coberturaTipo: "varias_regiones",
        regionesCobertura: ["metropolitana"],
        atiendeLine: "",
      }),
    ).toMatch(/^Atiende:\s+/);
  });

  it("getDireccionCard respeta plan", () => {
    expect(
      getDireccionCard({
        esPerfilCompletoListado: true,
        resumenLocalesLinea: "Maipú · Av. Principal 123",
        localFisicoComunaNombre: null,
        tieneModalidadLocalFisico: true,
      }),
    ).toBe("📍 Maipú · Av. Principal 123");
    expect(
      getDireccionCard({
        esPerfilCompletoListado: false,
        resumenLocalesLinea: "Secreto",
        localFisicoComunaNombre: null,
        tieneModalidadLocalFisico: true,
      }),
    ).toBe("Tiene local físico");
  });

  it("getModalidadesChips usa badges precalculados", () => {
    expect(getModalidadesChips({ modalidadesCardBadges: ["Local físico", "Online"] })).toEqual([
      "Local físico",
      "Online",
    ]);
  });

  it("getModalidadesChips elimina duplicados (evita 4 chips + +1 por ruido)", () => {
    expect(
      getModalidadesChips({
        modalidadesCardBadges: ["Online", "online", "Local físico", "Online"],
      }),
    ).toEqual(["Online", "Local físico"]);
  });

  it("isPerfilCompletoCard respeta modo panel básica", () => {
    expect(isPerfilCompletoCard({ esFichaCompleta: true, modoVista: "completa" })).toBe(true);
    expect(isPerfilCompletoCard({ esFichaCompleta: true, modoVista: "basica" })).toBe(false);
  });

  it("listadoPerfilCompletoUi exige publicado y no bloqueo además de trial/plan", () => {
    const base = { esFichaCompleta: true, modoVista: "completa" as const };
    expect(listadoPerfilCompletoUi({ ...base, estadoPublicacion: "publicado" })).toBe(true);
    expect(
      listadoPerfilCompletoUi({
        ...base,
        estadoPublicacion: "publicado",
        bloquearAccesoFichaPublica: true,
      }),
    ).toBe(false);
    expect(listadoPerfilCompletoUi({ ...base, estadoPublicacion: "borrador" })).toBe(false);
    expect(listadoPerfilCompletoUi({ ...base, estadoPublicacion: undefined })).toBe(false);
  });

  it("listadoFooterCtasDosColumnas es true con trial y publicado aunque ficha esté bloqueada", () => {
    const base = { esFichaCompleta: true, modoVista: "completa" as const, estadoPublicacion: "publicado" };
    expect(listadoFooterCtasDosColumnas(base)).toBe(true);
    expect(listadoFooterCtasDosColumnas({ ...base, bloquearAccesoFichaPublica: true })).toBe(true);
    expect(listadoFooterCtasDosColumnas({ ...base, estadoPublicacion: "borrador" })).toBe(false);
  });
});
