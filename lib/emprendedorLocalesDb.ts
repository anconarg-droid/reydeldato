import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeDireccionLocal } from "@/lib/geocoding";

export type LocalPersistRow = {
  comuna_slug: string;
  direccion: string;
  referencia: string | null;
  es_principal: boolean;
};

const MAX_LOCALES = 3;

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Entrada desde cliente (PATCH): array de objetos con comuna_slug, direccion, referencia opcional, es_principal.
 */
export function parseLocalesPatchInput(raw: unknown): LocalPersistRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: LocalPersistRow[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) return null;
    const o = item as Record<string, unknown>;
    const slug = s(o.comuna_slug);
    const dir = s(o.direccion);
    const refRaw = o.referencia;
    const ref =
      refRaw == null || refRaw === ""
        ? null
        : typeof refRaw === "string"
          ? refRaw.trim() || null
          : null;
    if (refRaw != null && typeof refRaw !== "string") return null;
    const esPrincipal = o.es_principal === true;
    if (!slug || !dir) return null;
    out.push({ comuna_slug: slug, direccion: dir, referencia: ref, es_principal: esPrincipal });
  }
  return out;
}

export function validateLocalesRules(
  locales: LocalPersistRow[],
  opts: {
    allowEmpty: boolean;
    requireNonEmpty?: boolean;
  }
): string | null {
  if (locales.length === 0) {
    if (opts.requireNonEmpty) return "Agrega al menos un local con dirección y comuna.";
    if (opts.allowEmpty) return null;
    return "Lista de locales inválida.";
  }
  if (locales.length > MAX_LOCALES) return `Máximo ${MAX_LOCALES} locales.`;
  const principals = locales.filter((l) => l.es_principal);
  if (principals.length !== 1) return "Debe haber exactamente un local principal.";
  return null;
}

export type ResolvedLocalRow = {
  comuna_id: string | number;
  direccion: string;
  referencia: string | null;
  es_principal: boolean;
  /** Rellenado al persistir si el geocoding devuelve coordenadas. */
  lat?: number | null;
  lng?: number | null;
};

export async function resolveLocalesComunaIds(
  supabase: SupabaseClient,
  locales: LocalPersistRow[]
): Promise<{ ok: true; rows: ResolvedLocalRow[] } | { ok: false; message: string }> {
  const rows: ResolvedLocalRow[] = [];
  for (const loc of locales) {
    const { data, error } = await supabase
      .from("comunas")
      .select("id")
      .eq("slug", loc.comuna_slug)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    const id = (data as { id?: unknown } | null)?.id;
    if (id == null || id === "") {
      return { ok: false, message: `Comuna no válida: ${loc.comuna_slug}` };
    }
    rows.push({
      comuna_id: id as string | number,
      direccion: loc.direccion,
      referencia: loc.referencia,
      es_principal: loc.es_principal,
    });
  }
  return { ok: true, rows };
}

/**
 * Obtiene nombre de comuna y región por `comuna_id` y adjunta `lat`/`lng` vía geocoding
 * (hoy stub: coordenadas `null` hasta conectar proveedor en `lib/geocoding.ts`).
 */
export async function attachGeocodeToResolvedLocales(
  supabase: SupabaseClient,
  rows: ResolvedLocalRow[]
): Promise<ResolvedLocalRow[]> {
  if (rows.length === 0) return rows;

  const idKeys = [
    ...new Set(rows.map((r) => String(r.comuna_id ?? "").trim()).filter(Boolean)),
  ];
  if (idKeys.length === 0) {
    return rows.map((r) => ({ ...r, lat: null, lng: null }));
  }

  const { data: comunasData, error: comErr } = await supabase
    .from("comunas")
    .select("id, nombre, region_id")
    .in("id", idKeys);

  if (comErr || !comunasData?.length) {
    return rows.map((r) => ({ ...r, lat: null, lng: null }));
  }

  const comunaById = new Map<
    string,
    { nombre: string; regionId: string }
  >();
  const regionIds = new Set<string>();
  for (const c of comunasData) {
    const rec = c as { id?: unknown; nombre?: unknown; region_id?: unknown };
    const id = s(rec.id);
    if (!id) continue;
    const rid = rec.region_id != null ? s(rec.region_id) : "";
    comunaById.set(id, { nombre: s(rec.nombre), regionId: rid });
    if (rid) regionIds.add(rid);
  }

  const regionNombreById = new Map<string, string>();
  if (regionIds.size > 0) {
    const { data: regs } = await supabase
      .from("regiones")
      .select("id, nombre")
      .in("id", [...regionIds]);
    for (const r of regs ?? []) {
      const rec = r as { id?: unknown; nombre?: unknown };
      const id = s(rec.id);
      if (id) regionNombreById.set(id, s(rec.nombre));
    }
  }

  const out: ResolvedLocalRow[] = [];
  for (const row of rows) {
    const cid = s(row.comuna_id);
    const meta = cid ? comunaById.get(cid) : undefined;
    const comunaNombre = meta?.nombre ?? "";
    const regionNombre =
      meta?.regionId && regionNombreById.has(meta.regionId)
        ? regionNombreById.get(meta.regionId)!
        : "";

    const geo = await geocodeDireccionLocal({
      direccion: row.direccion,
      comuna: comunaNombre,
      region: regionNombre,
    });

    out.push({
      ...row,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
    });
  }
  return out;
}

export async function principalComunaBaseIdFromLocales(
  supabase: SupabaseClient,
  locales: LocalPersistRow[]
): Promise<number | null> {
  const principal = locales.find((l) => l.es_principal);
  if (!principal) return null;
  const { data } = await supabase
    .from("comunas")
    .select("id")
    .eq("slug", principal.comuna_slug)
    .maybeSingle();
  const id = (data as { id?: unknown } | null)?.id;
  if (id == null) return null;
  const n = Number(id);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function replaceEmprendedorLocales(
  supabase: SupabaseClient,
  emprendedorId: string,
  rows: ResolvedLocalRow[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const eid = String(emprendedorId ?? "").trim();
  if (!eid) return { ok: false, message: "emprendedor_id inválido" };

  const { error: delErr } = await supabase
    .from("emprendedor_locales")
    .delete()
    .eq("emprendedor_id", eid);
  if (delErr) return { ok: false, message: delErr.message };

  if (rows.length === 0) return { ok: true };

  const rowsGeo = await attachGeocodeToResolvedLocales(supabase, rows);

  const { error: insErr } = await supabase.from("emprendedor_locales").insert(
    rowsGeo.map((r) => ({
      emprendedor_id: eid,
      comuna_id: r.comuna_id,
      direccion: r.direccion,
      referencia: r.referencia,
      es_principal: r.es_principal,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
    }))
  );
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

/**
 * Para GET borrador / respuestas API: usa `direccion` + comuna base como “local principal”.
 */
export function localesFromPostulacionRowForGet(
  row: {
    direccion?: unknown;
    direccion_referencia?: unknown;
  },
  comunaBaseSlug: string
): LocalPersistRow[] {
  const d = s(row.direccion);
  if (!d) return [];
  const slug = s(comunaBaseSlug);
  if (!slug) return [];
  return [
    {
      comuna_slug: slug,
      direccion: d,
      referencia: s(row.direccion_referencia) || null,
      es_principal: true,
    },
  ];
}
