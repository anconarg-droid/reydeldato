import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sortLocalesFichaPrincipalPrimero,
  type LocalFichaPublico,
} from "@/lib/emprendedorLocalesFichaPublica";
import { parseMapsGeoPair } from "@/lib/maps";

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Locales públicos desde `emprendedor_locales` (sin join embebido: más estable ante RLS/cache).
 * Orden: principal primero (`es_principal`), luego el resto.
 * No usa columnas de dirección en `emprendedores`.
 */
export async function fetchLocalesFichaPublicoForEmprendedor(
  supabase: SupabaseClient,
  emprendedorId: unknown
): Promise<LocalFichaPublico[]> {
  const id = s(emprendedorId);
  if (!id) return [];

  const { data: localesRows, error: locErr } = await supabase
    .from("emprendedor_locales")
    .select("*")
    .eq("emprendedor_id", id)
    .order("es_principal", { ascending: false });

  if (locErr) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[emprendedor_locales] lectura ficha pública:", locErr.message);
    }
    return [];
  }

  if (!Array.isArray(localesRows) || localesRows.length === 0) {
    return [];
  }

  const comunaIds = [
    ...new Set(
      localesRows
        .map((r) => s((r as Record<string, unknown>).comuna_id))
        .filter(Boolean)
    ),
  ];

  const comunaById = new Map<string, { nombre: string; slug: string }>();
  if (comunaIds.length > 0) {
    const { data: comunasData, error: comErr } = await supabase
      .from("comunas")
      .select("id, nombre, slug")
      .in("id", comunaIds);

    if (comErr && process.env.NODE_ENV === "development") {
      console.warn("[emprendedor_locales] comunas join manual:", comErr.message);
    }

    for (const c of comunasData ?? []) {
      const rec = c as { id?: unknown; nombre?: unknown; slug?: unknown };
      const cid = s(rec.id);
      if (cid) {
        comunaById.set(cid.toLowerCase(), {
          nombre: s(rec.nombre),
          slug: s(rec.slug),
        });
      }
    }
  }

  const raw: LocalFichaPublico[] = localesRows.map((row) => {
    const r = row as Record<string, unknown>;
    const cid = s(r.comuna_id).toLowerCase();
    const meta = cid ? comunaById.get(cid) : undefined;
    const refRaw = r.referencia;
    const nomLoc = r.nombre_local;
    const geo = parseMapsGeoPair(r.lat, r.lng);
    return {
      nombre_local:
        nomLoc != null && s(nomLoc) !== "" ? s(nomLoc) : null,
      direccion: s(r.direccion),
      referencia:
        refRaw != null && s(refRaw) !== "" ? s(refRaw) : "",
      comuna_nombre: meta?.nombre ?? "",
      comuna_slug: meta?.slug ?? "",
      es_principal: r.es_principal === true,
      ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
    };
  });

  return sortLocalesFichaPrincipalPrimero(raw);
}
