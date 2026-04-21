import { describe, expect, it } from "vitest";
import { calcularCompletitudCategoriaComuna } from "./calcularCompletitudCategoriaComuna";

describe("calcularCompletitudCategoriaComuna", () => {
  it("sin filas para la categoría → completa y sin rubros configurados", () => {
    const r = calcularCompletitudCategoriaComuna(["gasfiter"], [
      {
        subcategoria_slug: "otro",
        subcategoria_nombre: "Otro",
        maximo_contable: 3,
        total_contado: 0,
        faltantes: 3,
      },
    ]);
    expect(r.tieneRubrosConfigurados).toBe(false);
    expect(r.categoriaCompleta).toBe(true);
    expect(r.totalFaltan).toBe(0);
    expect(r.faltantes).toEqual([]);
  });

  it("suma actual/mínimo y lista faltantes", () => {
    const r = calcularCompletitudCategoriaComuna(["gasfiter", "electricista"], [
      {
        subcategoria_slug: "gasfiter",
        subcategoria_nombre: "Gasfiter",
        maximo_contable: 4,
        total_contado: 1,
        faltantes: 3,
      },
      {
        subcategoria_slug: "electricista",
        subcategoria_nombre: "Electricista",
        maximo_contable: 2,
        total_contado: 2,
        faltantes: 0,
      },
    ]);
    expect(r.tieneRubrosConfigurados).toBe(true);
    expect(r.categoriaCompleta).toBe(false);
    expect(r.actual).toBe(3);
    expect(r.minimo).toBe(6);
    expect(r.faltantes).toHaveLength(1);
    expect(r.faltantes[0].subcategoria_slug).toBe("gasfiter");
    expect(r.faltantes[0].faltan).toBe(3);
    expect(r.totalFaltan).toBe(3);
  });

  it("completa cuando no hay faltantes", () => {
    const r = calcularCompletitudCategoriaComuna(["gasfiter"], [
      {
        subcategoria_slug: "gasfiter",
        subcategoria_nombre: "Gasfiter",
        maximo_contable: 2,
        total_contado: 2,
        faltantes: 0,
      },
    ]);
    expect(r.categoriaCompleta).toBe(true);
    expect(r.totalFaltan).toBe(0);
    expect(r.faltantes).toEqual([]);
  });
});
