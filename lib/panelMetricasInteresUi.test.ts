import { describe, expect, it } from "vitest";
import { panelInteresMetricasFlagsDesdeNegocioItem } from "./panelMetricasInteresUi";

describe("panelInteresMetricasFlagsDesdeNegocioItem", () => {
  it("sin Instagram ni web: no card Instagram/Web", () => {
    const f = panelInteresMetricasFlagsDesdeNegocioItem({
      instagram: "",
      sitio_web: null,
      modalidadesAtencion: ["local_fisico"],
      localesFisicos: [{ direccion: "Av. Siempre Viva 123", comunaSlug: "santiago" }],
    });
    expect(f.mostrarInstagramWeb).toBe(false);
    expect(f.mostrarComoLlegar).toBe(true);
  });

  it("solo Instagram: etiqueta Instagram", () => {
    const f = panelInteresMetricasFlagsDesdeNegocioItem({
      instagram: "mi_negocio",
      sitio_web: "",
    });
    expect(f.mostrarInstagramWeb).toBe(true);
    expect(f.etiquetaInstagramWeb).toBe("Instagram");
  });

  it("solo web (campo web): etiqueta Sitio web", () => {
    const f = panelInteresMetricasFlagsDesdeNegocioItem({
      instagram: null,
      web: "https://ejemplo.cl",
    });
    expect(f.mostrarInstagramWeb).toBe(true);
    expect(f.etiquetaInstagramWeb).toBe("Sitio web");
  });

  it("ambos: Instagram / Web", () => {
    const f = panelInteresMetricasFlagsDesdeNegocioItem({
      instagram: "x",
      sitio_web: "https://x.cl",
    });
    expect(f.etiquetaInstagramWeb).toBe("Instagram / Web");
  });

  it("sin local físico o sin dirección: no Cómo llegar", () => {
    expect(
      panelInteresMetricasFlagsDesdeNegocioItem({
        modalidadesAtencion: ["domicilio"],
        instagram: "a",
      }).mostrarComoLlegar
    ).toBe(false);
    expect(
      panelInteresMetricasFlagsDesdeNegocioItem({
        modalidadesAtencion: ["local_fisico"],
        localesFisicos: [],
        direccion: "",
      }).mostrarComoLlegar
    ).toBe(false);
  });

  it("local_fisico + dirección legacy: Cómo llegar", () => {
    const f = panelInteresMetricasFlagsDesdeNegocioItem({
      modalidadesAtencion: ["local_fisico"],
      direccion: "Calle 1",
    });
    expect(f.mostrarComoLlegar).toBe(true);
  });
});
