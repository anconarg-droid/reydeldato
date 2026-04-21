import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmprendedorId } from "@/lib/emprendedorGaleriaPivot";
import {
  etiquetaModalidadAtencion,
  modalidadesAtencionInputsToDbUnique,
} from "@/lib/modalidadesAtencion";

/** Fila mínima desde `emprendedor_locales` + join `comunas`. */
export type LocalMiniForCard = {
  comunaNombre: string;
  direccion: string;
  esPrincipal: boolean;
};

const MAX_DIRECCION_CARD_CHARS = 40;

export function truncateDireccionTarjeta(s: string, max = MAX_DIRECCION_CARD_CHARS): string {
  const t = String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Texto compacto para listados (puede ser multilínea con `\n`):
 * - 1 local: `Comuna · dirección` (dirección acortada)
 * - 2+ locales: una línea por local (orden principal primero), máximo 2 líneas visibles
 *   y una tercera línea-resumen `+N locales más` si aplica.
 */
export function buildLocalesResumenLineaTarjeta(locales: LocalMiniForCard[]): string | null {
  if (!locales.length) return null;
  const sorted = [...locales].sort(
    (a, b) => (b.esPrincipal ? 1 : 0) - (a.esPrincipal ? 1 : 0)
  );
  if (sorted.length === 1) {
    const L = sorted[0];
    const com = String(L.comunaNombre ?? "").trim();
    const dir = truncateDireccionTarjeta(L.direccion);
    if (com && dir) return `${com} · ${dir}`;
    if (com) return com;
    if (dir) return dir;
    return null;
  }

  const lines = sorted
    .map((L) => {
      const com = String(L.comunaNombre ?? "").trim();
      const dir = truncateDireccionTarjeta(L.direccion);
      if (com && dir) return `${com} · ${dir}`;
      if (com) return com;
      if (dir) return dir;
      return "";
    })
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;
  if (lines.length === 1) return lines[0];

  const head = lines.slice(0, 2);
  const extra = Math.max(0, lines.length - head.length);
  if (extra > 0) {
    return `${head.join("\n")}\n+${extra} ${extra === 1 ? "local más" : "locales más"}`;
  }
  return head.join("\n");
}

/**
 * Chips de modalidad para tarjetas (orden fijo): Local físico → A domicilio → Delivery → Online.
 * `presencial_terreno` legacy sin flags explícitos se desdobla en dos chips.
 */
export function modalidadesDbToCardBadges(raw: string[]): string[] {
  const db = modalidadesAtencionInputsToDbUnique(raw);
  const out: string[] = [];
  if (db.includes("local_fisico")) out.push(etiquetaModalidadAtencion("local_fisico"));
  if (db.includes("domicilio")) out.push(etiquetaModalidadAtencion("domicilio"));
  if (db.includes("delivery")) out.push(etiquetaModalidadAtencion("delivery"));
  if (
    db.includes("presencial_terreno") &&
    !db.includes("domicilio") &&
    !db.includes("delivery")
  ) {
    out.push(etiquetaModalidadAtencion("domicilio"));
    out.push(etiquetaModalidadAtencion("delivery"));
  }
  if (db.includes("online")) out.push(etiquetaModalidadAtencion("online"));
  return out;
}

export async function fetchLocalesYModalidadesByEmprendedorIds(
  supabase: SupabaseClient,
  emprendedorIds: string[]
): Promise<{
  localesMinisByEmp: Map<string, LocalMiniForCard[]>;
  modalidadesByEmp: Map<string, string[]>;
}> {
  const localesMinisByEmp = new Map<string, LocalMiniForCard[]>();
  const modalidadesByEmp = new Map<string, string[]>();
  const ids = [
    ...new Set(emprendedorIds.map((x) => normalizeEmprendedorId(x)).filter(Boolean)),
  ];
  if (ids.length === 0) return { localesMinisByEmp, modalidadesByEmp };

  // `emprendedor_locales` → embed `comunas` puede fallar según schema cache; intentar con FK explícita y fallback.
  const [locRes, modRes] = await Promise.all([
    supabase
      .from("emprendedor_locales")
      .select(
        "emprendedor_id, direccion, es_principal, comuna_id, comunas!emprendedor_locales_comuna_fkey(nombre)"
      )
      .in("emprendedor_id", ids),
    supabase
      .from("emprendedor_modalidades")
      .select("emprendedor_id, modalidad")
      .in("emprendedor_id", ids),
  ]);

  let locRows: any[] = Array.isArray(locRes.data) ? (locRes.data as any[]) : [];
  if (locRes.error) {
    const fallback = await supabase
      .from("emprendedor_locales")
      .select("emprendedor_id, direccion, es_principal, comuna_id")
      .in("emprendedor_id", ids);
    if (!fallback.error && Array.isArray(fallback.data)) {
      locRows = fallback.data as any[];
    }
  }

  // Fallback de nombres de comuna si el embed no vino.
  const comunaNombreById = new Map<string, string>();
  const comunaIds = [
    ...new Set(
      locRows
        .map((r) => String((r as any)?.comuna_id ?? "").trim())
        .filter(Boolean)
    ),
  ];
  if (comunaIds.length > 0) {
    const { data: comRows, error: comErr } = await supabase
      .from("comunas")
      .select("id,nombre")
      .in("id", comunaIds as any[]);
    if (!comErr && Array.isArray(comRows)) {
      for (const cr of comRows as any[]) {
        const id = String(cr?.id ?? "").trim();
        const nom = String(cr?.nombre ?? "").trim();
        if (id && nom) comunaNombreById.set(id, nom);
      }
    }
  }

  for (const row of locRows) {
    const rec = row as {
      emprendedor_id?: unknown;
      direccion?: unknown;
      es_principal?: unknown;
      comuna_id?: unknown;
      comunas?: { nombre?: unknown } | null;
    };
    const eid = normalizeEmprendedorId(rec.emprendedor_id);
    if (!eid) continue;
    const cn =
      rec.comunas != null && typeof rec.comunas === "object"
        ? String(rec.comunas.nombre ?? "").trim()
        : "";
    const cnFallback = !cn
      ? String(comunaNombreById.get(String(rec.comuna_id ?? "").trim()) ?? "").trim()
      : "";
    const dir = String(rec.direccion ?? "").trim();
    const esP = rec.es_principal === true;
    const comunaNombre = cn || cnFallback;
    if (!comunaNombre && !dir) continue;
    const list = localesMinisByEmp.get(eid) ?? [];
    list.push({ comunaNombre, direccion: dir, esPrincipal: esP });
    localesMinisByEmp.set(eid, list);
  }

  for (const row of modRes.data ?? []) {
    const rec = row as { emprendedor_id?: unknown; modalidad?: unknown };
    const eid = normalizeEmprendedorId(rec.emprendedor_id);
    const m = String(rec.modalidad ?? "").trim();
    if (!eid || !m) continue;
    const list = modalidadesByEmp.get(eid) ?? [];
    list.push(m);
    modalidadesByEmp.set(eid, list);
  }

  return { localesMinisByEmp, modalidadesByEmp };
}

export function enrichmentFromMaps(
  emprendedorId: string,
  localesMinisByEmp: Map<string, LocalMiniForCard[]>,
  modalidadesByEmp: Map<string, string[]>
): {
  resumenLocalesLinea: string | null;
  localFisicoComunaNombre: string | null;
  modalidadesCardBadges: string[];
} {
  const id = normalizeEmprendedorId(emprendedorId);
  const locs = id ? localesMinisByEmp.get(id) ?? [] : [];
  const mods = id ? modalidadesByEmp.get(id) ?? [] : [];
  const sortedLocs = [...locs].sort(
    (a, b) => (b.esPrincipal ? 1 : 0) - (a.esPrincipal ? 1 : 0)
  );
  const principalComuna = String(sortedLocs[0]?.comunaNombre ?? "").trim();
  return {
    resumenLocalesLinea: buildLocalesResumenLineaTarjeta(locs),
    localFisicoComunaNombre: principalComuna || null,
    modalidadesCardBadges: modalidadesDbToCardBadges(mods),
  };
}
