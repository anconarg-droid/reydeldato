/**
 * Completitud de una categoría (catálogo) en una comuna, usando filas tipo
 * `vw_faltantes_comuna_v2`: solo subcategorías que cruzan con `rubros_apertura`.
 */

export type FilaFaltanteRubroComuna = {
  subcategoria_slug: string;
  subcategoria_nombre: string;
  maximo_contable: number;
  total_contado: number;
  faltantes: number;
};

export type FaltanteSubcategoriaItem = {
  subcategoria_slug: string;
  subcategoria_nombre: string;
  faltan: number;
};

export type ResultadoCompletitudCategoriaComuna = {
  /** Hay al menos un rubro de apertura que pertenece al catálogo de la categoría. */
  tieneRubrosConfigurados: boolean;
  /** Sin rubros configurados → se considera completa (no mostramos bloque). */
  categoriaCompleta: boolean;
  /** Suma de `total_contado` (tope aplicado) en rubros de la categoría. */
  actual: number;
  /** Suma de `maximo_contable` en esos rubros. */
  minimo: number;
  /** Suma de cupos aún faltantes (solo UI de alto nivel; sin desglose en categoría). */
  totalFaltan: number;
  faltantes: FaltanteSubcategoriaItem[];
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function calcularCompletitudCategoriaComuna(
  subSlugsCatalogo: readonly string[],
  filasVista: FilaFaltanteRubroComuna[]
): ResultadoCompletitudCategoriaComuna {
  const allowed = new Set(
    subSlugsCatalogo.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean)
  );

  const filtered = filasVista.filter((r) =>
    allowed.has(String(r.subcategoria_slug || "").trim().toLowerCase())
  );

  if (filtered.length === 0) {
    return {
      tieneRubrosConfigurados: false,
      categoriaCompleta: true,
      actual: 0,
      minimo: 0,
      totalFaltan: 0,
      faltantes: [],
    };
  }

  let actual = 0;
  let minimo = 0;
  const faltantes: FaltanteSubcategoriaItem[] = [];

  for (const r of filtered) {
    actual += n(r.total_contado);
    minimo += n(r.maximo_contable);
    const f = n(r.faltantes);
    if (f > 0) {
      const slug = String(r.subcategoria_slug || "").trim();
      const nombre = String(r.subcategoria_nombre || "").trim() || slug;
      faltantes.push({ subcategoria_slug: slug, subcategoria_nombre: nombre, faltan: f });
    }
  }

  faltantes.sort((a, b) => {
    if (b.faltan !== a.faltan) return b.faltan - a.faltan;
    return a.subcategoria_nombre.localeCompare(b.subcategoria_nombre, "es");
  });

  const categoriaCompleta = faltantes.length === 0;
  const totalFaltan = faltantes.reduce((s, x) => s + x.faltan, 0);

  return {
    tieneRubrosConfigurados: true,
    categoriaCompleta,
    actual,
    minimo,
    totalFaltan,
    faltantes,
  };
}

/** Panel solo si hay metas de apertura para la categoría y aún faltan cupos. */
export function categoriaMuestraPanelIncompleta(r: ResultadoCompletitudCategoriaComuna): boolean {
  return r.tieneRubrosConfigurados && !r.categoriaCompleta;
}
