import { describe, expect, it } from "vitest";
import {
  formatComunaRegion,
  getBadgeCobertura,
  getEstadoFicha,
  getTextoCardBasica,
  getTextoCardCompleta,
  isNuevo,
  isPerfilCompleto,
} from "./productRules";

describe("isNuevo", () => {
  const base = new Date("2026-04-01T12:00:00.000Z");

  it("publicado + 10 días => true", () => {
    const created = new Date(base.getTime() - 10 * 86_400_000);
    expect(
      isNuevo({
        createdAt: created,
        estadoPublicacion: "publicado",
        now: base,
      })
    ).toBe(true);
  });

  it("publicado + 16 días => false", () => {
    const created = new Date(base.getTime() - 16 * 86_400_000);
    expect(
      isNuevo({
        createdAt: created,
        estadoPublicacion: "publicado",
        now: base,
      })
    ).toBe(false);
  });

  it("no publicado => false", () => {
    expect(
      isNuevo({
        createdAt: new Date(base.getTime() - 5 * 86_400_000),
        estadoPublicacion: "borrador",
        now: base,
      })
    ).toBe(false);
  });

  it("sin fecha => false", () => {
    expect(
      isNuevo({
        createdAt: null,
        estadoPublicacion: "publicado",
        now: base,
      })
    ).toBe(false);
  });
});

describe("isPerfilCompleto", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("trial activo => true (sin exigir contenido)", () => {
    expect(isPerfilCompleto({ trialActivo: true, now })).toBe(true);
  });

  it("plan activo => true", () => {
    expect(isPerfilCompleto({ planActivo: true, now })).toBe(true);
  });

  it("plan activo con expiración pasada => false", () => {
    expect(
      isPerfilCompleto({
        planActivo: true,
        planExpiraAt: "2020-01-01T00:00:00.000Z",
        now,
      })
    ).toBe(false);
  });

  it("trial activo aunque falte descripción, whatsapp e instagram => true", () => {
    expect(
      isPerfilCompleto({
        trialActivo: true,
        descripcionLibre: "corta",
        whatsappPrincipal: "",
        instagram: "",
        now,
      })
    ).toBe(true);
  });

  it("trial vencido => false", () => {
    expect(
      isPerfilCompleto({
        trialActivo: false,
        trialExpiraAt: "2020-01-01T00:00:00.000Z",
        now,
      })
    ).toBe(false);
  });

  it("trial por fecha futura => true", () => {
    expect(
      isPerfilCompleto({
        trialExpiraAt: "2027-01-01T00:00:00.000Z",
        now,
      })
    ).toBe(true);
  });
});

describe("getEstadoFicha", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("completo => ficha_completa", () => {
    expect(
      getEstadoFicha({
        planActivo: true,
        now,
      })
    ).toBe("ficha_completa");
  });

  it("plan sin suscripción vigente => ficha_basica", () => {
    expect(
      getEstadoFicha({
        planActivo: true,
        planExpiraAt: "2020-01-01T00:00:00.000Z",
        now,
      })
    ).toBe("ficha_basica");
  });
});

describe("formatComunaRegion", () => {
  it("Maipú + Región Metropolitana => 📍 Maipú · RM", () => {
    expect(
      formatComunaRegion({
        comunaNombre: "Maipú",
        regionNombre: "Región Metropolitana de Santiago",
      })
    ).toBe("📍 Maipú · RM");
  });

  it("Maipú + null => 📍 Maipú", () => {
    expect(formatComunaRegion({ comunaNombre: "Maipú", regionNombre: null })).toBe(
      "📍 Maipú"
    );
  });

  it("null + región => ''", () => {
    expect(
      formatComunaRegion({
        comunaNombre: null,
        regionNombre: "Región Metropolitana de Santiago",
      })
    ).toBe("");
  });
});

describe("getBadgeCobertura", () => {
  it("base distinta de comuna buscada => Atiende Maipú", () => {
    expect(
      getBadgeCobertura({
        comunaBaseSlug: "san-bernardo",
        comunaBuscadaSlug: "maipu",
        comunaBuscadaNombre: "Maipú",
      })
    ).toBe("Atiende Maipú");
  });

  it("base igual => null", () => {
    expect(
      getBadgeCobertura({
        comunaBaseSlug: "maipu",
        comunaBuscadaSlug: "maipu",
        comunaBuscadaNombre: "Maipú",
      })
    ).toBe(null);
  });
});

describe("textos CTA card", () => {
  it("básica", () => expect(getTextoCardBasica()).toBe("Solo WhatsApp"));
  it("completa", () => expect(getTextoCardCompleta()).toBe("Ver detalles"));
});
