import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";

/**
 * Reindexa emprendedores desde Supabase -> Algolia
 *
 * URL:
 *   http://localhost:3000/api/reindex/emprendedores?secret=123
 */

// -------------------------
// Helpers
// -------------------------
function cleanKey(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s.replace(/^\/+/, "").replace(/\/+$/, "");
}

function uniqStrings(arr: (string | null | undefined)[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    if (!v) continue;
    const s = String(v).trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function safeLower(s: unknown) {
  return String(s ?? "").toLowerCase();
}

function toUuidArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  // soporta "uuid" suelto
  return [String(v)];
}

// -------------------------
// ENV
// -------------------------
const REINDEX_SECRET = process.env.REINDEX_SECRET;

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;

// Índice emprendedores (ojo con el nombre exacto)
const ALGOLIA_INDEX_EMPRENDEDORES =
  process.env.ALGOLIA_INDEX_EMPRENDEDORES ||
  process.env.ALGOLIA_INDEX_EMPRENDEDORES_PUBLICOS ||
  "emprendedores";

// Supabase server
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fuente Supabase (view) — usa tu view real (por tus capturas: vw_emprendedores_busqueda_v3)
const SUPABASE_SOURCE_VIEW =
  process.env.SUPABASE_VIEW_EMPRENDEDORES || "vw_emprendedores_busqueda_v3";

export async function GET(req: Request) {
  try {
    // -------------------------
    // Auth simple por secret
    // -------------------------
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (!REINDEX_SECRET || secret !== REINDEX_SECRET) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    // -------------------------
    // Validaciones ENV
    // -------------------------
    if (!ALGOLIA_APP_ID) {
      return NextResponse.json({ ok: false, error: "Falta ALGOLIA_APP_ID" }, { status: 500 });
    }
    if (!ALGOLIA_ADMIN_KEY) {
      return NextResponse.json({ ok: false, error: "Falta ALGOLIA_ADMIN_KEY" }, { status: 500 });
    }
    if (!ALGOLIA_INDEX_EMPRENDEDORES) {
      return NextResponse.json(
        { ok: false, error: "Falta ALGOLIA_INDEX_EMPRENDEDORES" },
        { status: 500 }
      );
    }
    if (!SUPABASE_URL) {
      return NextResponse.json({ ok: false, error: "Falta SUPABASE_URL" }, { status: 500 });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    // -------------------------
    // Clientes
    // -------------------------
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    const index = algolia.initIndex(ALGOLIA_INDEX_EMPRENDEDORES);

    // -------------------------
    // Traer datos desde la VIEW
    // -------------------------
    const { data, error } = await supabase.from(SUPABASE_SOURCE_VIEW).select("*");

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Supabase error leyendo ${SUPABASE_SOURCE_VIEW}: ${error.message}` },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];

    // -------------------------
    // Mapear -> objetos Algolia
    // -------------------------
    const objects = rows.map((r: any) => {
      // Territorio por slugs (legacy útil)
      const countrySlug =
        cleanKey(r.country_slug) || cleanKey(r.pais_slug) || cleanKey(r.pais) || "chile";

      const regionSlug =
        cleanKey(r.region_slug) || cleanKey(r.region) || cleanKey(r.region_nombre) || null;

      const comunaBaseSlug =
        cleanKey(r.comuna_base_slug) || cleanKey(r.comuna_slug) || null;

      // Keys legacy para compat (si aún usas coverage_keys en algo)
      const baseKey =
        countrySlug && regionSlug && comunaBaseSlug
          ? `${countrySlug}/${regionSlug}/${comunaBaseSlug}`
          : null;

      const regionKey = countrySlug && regionSlug ? `${countrySlug}/${regionSlug}` : null;
      const countryKey = countrySlug ? `${countrySlug}` : null;

      const incomingCoverageKeys = Array.isArray(r.coverage_keys) ? r.coverage_keys : [];
      const normalizedIncoming = incomingCoverageKeys.map(cleanKey).filter(Boolean) as string[];

      const finalCoverageKeys = uniqStrings([baseKey, ...normalizedIncoming, regionKey, countryKey]);

      // Labels (si existen)
      const incomingLabels = Array.isArray(r.coverage_labels) ? r.coverage_labels : [];
      const normalizedLabels = uniqStrings(incomingLabels.map((x: any) => String(x ?? "").trim()));

      // Texto
      const nombre = String(r.nombre ?? "").trim();
      const descripcion = String(r.descripcion ?? "").trim();
      const descripcionCorta = String(r.descripcion_corta ?? "").trim();
      const descripcionLarga = String(r.descripcion_larga ?? "").trim();

      const searchText = uniqStrings([
        nombre,
        descripcionCorta,
        descripcionLarga,
        descripcion,
        comunaBaseSlug ? comunaBaseSlug.replace(/-/g, " ") : null,
        regionSlug ? regionSlug.replace(/-/g, " ") : null,
        countrySlug ? countrySlug.replace(/-/g, " ") : null,
        // también categorías si vienen
        r.categoria_nombre ? String(r.categoria_nombre) : null,
        ...(Array.isArray(r.subcategorias_nombres) ? r.subcategorias_nombres : []).map((x: any) =>
          String(x ?? "").trim()
        ),
      ]).join(" ");

      // -------------------------
      // ✅ CLAVE PARA TU /api/buscar (esto arregla “regional:0”)
      // -------------------------
      // region_ids: tu vista puede traer region_ids (array) o region_id (uuid)
      const region_ids = toUuidArray(r.region_ids ?? r.region_id);

      // cobertura_comunas_ids: tu vista puede traer cobertura_comunas_ids (array)
      // si no trae, intenta con cobertura_comunas_ids / cobertura_comunas_id
      const cobertura_comunas_ids = toUuidArray(
        r.cobertura_comunas_ids ?? r.cobertura_comunas_id
      );

      // is_national: si tu vista lo trae, úsalo; si no, derivamos de nivel_cobertura
      const nivel_cobertura = String(r.nivel_cobertura ?? "").trim();
      const is_national =
        typeof r.is_national === "boolean"
          ? r.is_national
          : nivel_cobertura === "nacional";

      const obj = {
        objectID: r.objectID || r.id, // Algolia requiere objectID
        id: r.id,
        nombre,
        slug: r.slug ?? null,

        // Descripciones
        descripcion: descripcion || null,
        descripcion_corta: descripcionCorta || null,
        descripcion_larga: descripcionLarga || null,

        // Territorio base (para mostrar/depurar)
        country_slug: countrySlug,
        region_slug: regionSlug,
        comuna_base_slug: comunaBaseSlug,
        comuna_base_id: r.comuna_base_id ?? null,

        // ✅ Campos que usa /api/buscar
        region_ids,
        cobertura_comunas_ids,
        is_national,

        // Cobertura (enum + legacy)
        nivel_cobertura: nivel_cobertura || null,
        coverage_keys: finalCoverageKeys,
        coverage_labels: normalizedLabels,

        // Contacto
        whatsapp: r.whatsapp ?? null,
        email: r.email ?? null,
        instagram: r.instagram ?? null,
        sitio_web: r.sitio_web ?? null,
        logo_path: r.logo_path ?? null,

        // Búsqueda
        search_text: safeLower(searchText),

        created_at: r.created_at ?? null,
      };

      return obj;
    });

    // -------------------------
    // Subir a Algolia (reemplaza todo)
    // -------------------------
    await index.replaceAllObjects(objects, { safe: true });

    return NextResponse.json({
      ok: true,
      index: ALGOLIA_INDEX_EMPRENDEDORES,
      fuente: SUPABASE_SOURCE_VIEW,
      total_indexados: objects.length,
      nota:
        "Indexado con region_ids + cobertura_comunas_ids + is_national. Ahora /api/buscar debería devolver regional/nacional cuando corresponda.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error inesperado" }, { status: 500 });
  }
}