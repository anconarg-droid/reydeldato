import { getRegionShort } from "@/utils/regionShort";

export type ComunaCatalogRow = {
  id: number | string;
  slug: string;
  nombre: string;
  regionNombre: string;
};

/** Formato único de etiqueta: `{nombre} - {región}`. */
export function formatComunaCatalogLabel(c: Pick<ComunaCatalogRow, "nombre" | "regionNombre">): string {
  const n = String(c.nombre ?? "").trim();
  const r = String(c.regionNombre ?? "").trim();
  return r ? `${n} - ${r}` : n;
}

/**
 * Etiqueta compacta para listados / preview: `{nombre} {región corta}` (ej. «Calera de Tango RM»).
 * Usa {@link getRegionShort}; si no hay región, solo el nombre.
 */
export function formatComunaCatalogLabelCorto(
  c: Pick<ComunaCatalogRow, "nombre" | "regionNombre">
): string {
  const nombre = String(c.nombre ?? "").trim();
  const regionNombre = String(c.regionNombre ?? "").trim();
  if (!nombre) return regionNombre || "";
  const short = getRegionShort(regionNombre);
  if (short) return `${nombre} ${short}`;
  return nombre;
}

function normKey(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function comunaCatalogIdKey(id: number | string): string {
  return String(id);
}

/**
 * Resuelve un valor de cobertura (slug canónico o variación) a una fila del catálogo.
 * Deduplicación lógica por `id` de comuna.
 */
export function resolveComunaFromCatalog(
  catalog: ComunaCatalogRow[],
  raw: string
): ComunaCatalogRow | undefined {
  const t = String(raw ?? "").trim();
  if (!t) return undefined;

  const nk = normKey(t);
  const slugish = nk.replace(/\s+/g, "-");

  for (const c of catalog) {
    if (c.slug === t) return c;
  }
  for (const c of catalog) {
    if (normKey(c.slug) === nk || normKey(c.slug) === slugish) return c;
  }
  for (const c of catalog) {
    if (normKey(c.nombre) === nk) return c;
  }
  /** Etiqueta de UI: «Las Condes - Región Metropolitana» (mismo formato que el autocomplete). */
  for (const c of catalog) {
    if (normKey(formatComunaCatalogLabel(c)) === nk) return c;
  }
  return undefined;
}

/**
 * Compara comuna base vs comuna del local (slugs canónicos del catálogo cuando existen).
 * Usado para exigir que el local principal esté en la misma comuna que la base.
 */
export function principalLocalComunaMatchesBase(
  comunaBaseSlug: string,
  localComunaSlug: string,
  catalog: ComunaCatalogRow[]
): boolean {
  const b = String(comunaBaseSlug ?? "").trim();
  const l = String(localComunaSlug ?? "").trim();
  if (!b || !l) return false;
  const br = resolveComunaFromCatalog(catalog, b);
  const lr = resolveComunaFromCatalog(catalog, l);
  const bs = String(br?.slug ?? b).trim();
  const ls = String(lr?.slug ?? l).trim();
  return bs === ls;
}

/** Misma forma que envía `buildBorradorFullPatchFromForm` / espera `parseLocalesPatchInput`. */
export type LocalFisicoBorradorPatchRow = {
  comuna_slug: string;
  direccion: string;
  referencia: string | null;
  es_principal: boolean;
};

export type LocalFisicoLike = {
  comunaSlug: string;
  direccion: string;
  referencia: string;
  esPrincipal: boolean;
};

/**
 * Serializa locales del formulario al PATCH del borrador: siempre `comuna_slug` canónico
 * del catálogo (nunca el label visible). Omite filas sin dirección o sin comuna resoluble.
 */
export function serializeLocalesFisicosParaBorradorPatch(
  catalog: ComunaCatalogRow[],
  locales: LocalFisicoLike[],
  opts?: { comunaBaseSlugFallback?: string }
): LocalFisicoBorradorPatchRow[] {
  const fb = String(opts?.comunaBaseSlugFallback ?? "").trim();
  const out: LocalFisicoBorradorPatchRow[] = [];
  for (const l of locales) {
    const dir = String(l.direccion ?? "").trim();
    if (!dir) continue;
    let raw = String(l.comunaSlug ?? "").trim();
    if (!raw && fb) raw = fb;
    if (!raw) continue;

    let slug = "";
    if (catalog.length > 0) {
      const row = resolveComunaFromCatalog(catalog, raw);
      if (row?.slug) slug = String(row.slug).trim();
    } else {
      slug = raw;
    }
    if (!slug) continue;

    const ref = String(l.referencia ?? "").trim();
    out.push({
      comuna_slug: slug,
      direccion: dir,
      referencia: ref || null,
      es_principal: l.esPrincipal === true,
    });
  }
  return out;
}

type FormLike = {
  coberturaTipo:
    | "solo_comuna"
    | "varias_comunas"
    | "regional"
    | "nacional";
  comunaBaseSlug: string;
  comunasCoberturaSlugs: string[];
};

/**
 * Solo la fila de la comuna base (p. ej. local principal: siempre la base hasta que el usuario la cambie arriba).
 */
export function comunaRowsSoloComunaBase(
  form: Pick<FormLike, "comunaBaseSlug">,
  catalog: ComunaCatalogRow[]
): ComunaCatalogRow[] {
  if (!catalog.length) return [];
  const base = String(form.comunaBaseSlug ?? "").trim();
  const r = resolveComunaFromCatalog(catalog, base);
  return r ? [r] : [];
}

/** Comunas permitidas para locales físicos según cobertura, resueltas solo desde catálogo; sin duplicados por id. */
export function comunaRowsPermitidosLocales(
  form: FormLike,
  catalog: ComunaCatalogRow[]
): ComunaCatalogRow[] {
  if (!catalog.length) return [];

  const base = String(form.comunaBaseSlug ?? "").trim();
  if (form.coberturaTipo === "solo_comuna") {
    const r = resolveComunaFromCatalog(catalog, base);
    return r ? [r] : [];
  }

  if (form.coberturaTipo === "varias_comunas") {
    const extras = form.comunasCoberturaSlugs
      .map((s) => String(s).trim())
      .filter(Boolean);
    const orderedInputs = [base, ...extras];
    const seen = new Set<string>();
    const out: ComunaCatalogRow[] = [];
    for (const input of orderedInputs) {
      const row = resolveComunaFromCatalog(catalog, input);
      if (!row) continue;
      const kid = comunaCatalogIdKey(row.id);
      if (seen.has(kid)) continue;
      seen.add(kid);
      out.push(row);
    }
    return out;
  }

  return [];
}

export function clampLocalesFisicosComunasWithCatalog<
  T extends { comunaSlug: string },
>(
  form: FormLike,
  catalog: ComunaCatalogRow[],
  locales: T[],
  mode: "solo_base" | "fixed_list" | "free_search"
): T[] {
  if (mode === "free_search" || !catalog.length) return locales;

  const rows = comunaRowsPermitidosLocales(form, catalog);
  const allowedSlugs = new Set(rows.map((r) => r.slug));
  if (allowedSlugs.size === 0) {
    return locales.map((l) => ({ ...l, comunaSlug: "" }));
  }

  return locales.map((l) => {
    const raw = String(l.comunaSlug ?? "").trim();
    /** Sin comuna elegida: no forzar la primera permitida (p. ej. local 2/3 recién agregado). */
    if (raw === "") return { ...l, comunaSlug: "" };
    const resolved = resolveComunaFromCatalog(catalog, raw);
    const canon = resolved && allowedSlugs.has(resolved.slug) ? resolved.slug : "";
    if (canon) return { ...l, comunaSlug: canon };
    return { ...l, comunaSlug: rows[0]!.slug };
  });
}
