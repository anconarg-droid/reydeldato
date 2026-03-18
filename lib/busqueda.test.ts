import { describe, it, expect } from "vitest";
import { classifyTier, type HitBusqueda } from "./busqueda";

describe("classifyTier", () => {
  it("devuelve base cuando la comuna base coincide con la buscada", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "calera-de-tango",
      nivel_cobertura: "solo_mi_comuna",
    };
    const r = classifyTier(hit, "calera-de-tango");
    expect(r.tier).toBe("base");
    expect(r.reason).toContain("Es de");
  });

  it("devuelve base aunque el slug tenga mayúsculas (normaliza)", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "Calera-De-Tango",
      nivel_cobertura: "solo_mi_comuna",
    };
    const r = classifyTier(hit, "calera-de-tango");
    expect(r.tier).toBe("base");
  });

  it("devuelve cobertura cuando no es de la comuna pero tiene cobertura en ella", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "maipu",
      nivel_cobertura: "varias_comunas",
      comunas_cobertura_slugs: ["calera-de-tango", "padre-hurtado"],
    };
    const r = classifyTier(hit, "calera-de-tango");
    expect(r.tier).toBe("cobertura");
    expect(r.reason).toContain("Atiende");
  });

  it("devuelve cobertura usando cobertura_comunas_slugs si existe", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "san-bernardo",
      nivel_cobertura: "varias_comunas",
      cobertura_comunas_slugs: ["calera-de-tango"],
    };
    const r = classifyTier(hit, "calera-de-tango");
    expect(r.tier).toBe("cobertura");
  });

  it("devuelve regional cuando nivel es regional (o legacy) y regionId coincide", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "providencia",
      nivel_cobertura: "regional",
      region_ids: ["rm", "valparaiso"],
    };
    const r = classifyTier(hit, "calera-de-tango", "valparaiso");
    expect(r.tier).toBe("regional");
    expect(r.reason).toContain("región");
  });

  it("devuelve nacional cuando nivel es nacional", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "santiago",
      nivel_cobertura: "nacional",
    };
    const r = classifyTier(hit, "calera-de-tango");
    expect(r.tier).toBe("nacional");
    expect(r.reason).toContain("nacional");
  });

  it("sin comuna buscada no asigna base", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "calera-de-tango",
      nivel_cobertura: "solo_mi_comuna",
    };
    const r = classifyTier(hit, "");
    expect(r.tier).not.toBe("base");
  });

  it("varias_comunas sin la comuna en cobertura no es cobertura", () => {
    const hit: HitBusqueda = {
      comuna_base_slug: "maipu",
      nivel_cobertura: "varias_comunas",
      comunas_cobertura_slugs: ["padre-hurtado", "talagante"],
    };
    const r = classifyTier(hit, "calera-de-tango");
    expect(r.tier).not.toBe("cobertura");
  });
});
