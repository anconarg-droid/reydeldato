import { describe, expect, it } from "vitest";
import { basicsFormFromPanelNegocioItem } from "./publicarEdicionBasicaPanel";

/**
 * Contrato validación bug panel: GET mergeado debe mapear a SimpleForm
 * (keywords desde json preferente; cobertura en comunasCoberturaSlugs).
 */
describe("basicsFormFromPanelNegocioItem", () => {
  it("mapea keywords (kiwi) y comunasCoberturaSlugs (buin) como ítem GET panel (text[] o json mergeado)", () => {
    const item: Record<string, unknown> = {
      id: "emp-test",
      nombre: "Negocio test",
      email: "a@b.cl",
      whatsapp: "+56912345678",
      descripcionCorta: "Resumen",
      descripcionLarga: "Larga",
      comunaBaseSlug: "santiago",
      coberturaTipo: "varias_comunas",
      comunasCoberturaSlugs: ["buin"],
      regionesCoberturaSlugs: [],
      modalidadesAtencion: [],
      keywords_usuario: ["kiwi"],
    };

    const form = basicsFormFromPanelNegocioItem(item);

    expect(form.keywordsUsuario).toBe("kiwi");
    expect(form.comunaBase).toBe("santiago");
    expect(form.coberturaTipo).toBe("varias_comunas");
    expect(form.comunasCobertura).toEqual(["buin"]);
  });

  it("si json ausente o vacío, usa keywords_usuario (emprendedores / merge)", () => {
    const item: Record<string, unknown> = {
      comunaBaseSlug: "maipu",
      coberturaTipo: "solo_comuna",
      comunasCoberturaSlugs: [],
      keywords_usuario: ["pera", "uva"],
    };

    const form = basicsFormFromPanelNegocioItem(item);
    expect(form.keywordsUsuario).toBe("pera, uva");
  });
});
