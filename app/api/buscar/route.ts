// app/api/buscar/route.ts
import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";

type TierName = "local_base" | "atiende_comuna" | "regional" | "nacional";

const K_DEFAULT = 12;

function toBool(v: string | null | undefined) {
  return v === "1" || v === "true" || v === "yes";
}

function toInt(v: string | null | undefined, def = 0) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

function json(ok: boolean, payload: any, status = 200) {
  return NextResponse.json({ ok, ...payload }, { status });
}

function cleanUuid(v: string | null) {
  if (!v) return "";
  return v.trim();
}

/**
 * Construye filtros Algolia con seguridad básica (evita undefined)
 */
function fEq(field: string, value: string) {
  const v = value?.trim();
  if (!v) return "";
  return `${field}:${v}`;
}

function fNot(field: string, value: string) {
  const v = value?.trim();
  if (!v) return "";
  return `NOT ${field}:${v}`;
}

function fOr(parts: string[]) {
  const p = parts.filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0];
  return `(${p.join(" OR ")})`;
}

function fAnd(parts: string[]) {
  const p = parts.filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0];
  return p.join(" AND ");
}

async function lookupComunaAndRegionIds(opts: {
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  comunaSlug?: string;
  regionId?: string;
}) {
  const comunaSlug = (opts.comunaSlug ?? "").trim();
  let regionId = cleanUuid(opts.regionId ?? null);
  let comunaId = "";

  // Si ya viene regionId pero falta comunaId, igual intentamos resolver comunaId por slug.
  // Si no hay supabase env, devolvemos lo que tengamos.
  if (!opts.supabaseUrl || !opts.supabaseServiceKey || !comunaSlug) {
    return { comunaId, regionId };
  }

  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Intento 1: tabla comunas (slug)
  // (Si tú usas otra tabla o vista, cámbiala aquí)
  const { data, error } = await supabase
    .from("comunas")
    .select("id, region_id")
    .eq("slug", comunaSlug)
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    comunaId = String(data.id ?? "");
    if (!regionId) regionId = String(data.region_id ?? "");
  }

  return { comunaId, regionId };
}

/**
 * Buscar en Algolia con filtros, trayendo suficientes hits para paginar por capas.
 */
async function searchAlgolia(params: {
  index: ReturnType<ReturnType<typeof algoliasearch>["initIndex"]>;
  q: string;
  filters: string;
  hitsPerPage: number;
}) {
  const r = await params.index.search(params.q, {
    filters: params.filters || undefined,
    hitsPerPage: Math.min(Math.max(params.hitsPerPage, 0), 1000),
  });
  return r;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const comunaSlug = (url.searchParams.get("comuna") ?? "").trim();
    const debug = toBool(url.searchParams.get("debug") ?? "0");

    // Identificadores (idealmente ya vienen)
    let regionId = cleanUuid(url.searchParams.get("regionId"));
    const page = toInt(url.searchParams.get("page"), 0);
    const k = toInt(url.searchParams.get("k"), K_DEFAULT);

    // Flags de alcance
    const onlyLocal = toBool(url.searchParams.get("onlyLocal") ?? "0"); // solo local + atiende
    const expandNational = toBool(url.searchParams.get("expandNational") ?? "0");

    // Env Algolia
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY; // search key (server o public, depende tu config)
    const ALGOLIA_INDEX = process.env.ALGOLIA_INDEX_EMPRENDEDORES;

    if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY || !ALGOLIA_INDEX) {
      return json(false, { error: "Faltan envs Algolia (ALGOLIA_APP_ID / ALGOLIA_SEARCH_KEY / ALGOLIA_INDEX_EMPRENDEDORES)" }, 500);
    }

    const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const index = algolia.initIndex(ALGOLIA_INDEX);

    // Env Supabase (opcional para resolver comunaId)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Resolver comunaId y regionId si falta
    const { comunaId, regionId: resolvedRegionId } = await lookupComunaAndRegionIds({
      supabaseUrl: SUPABASE_URL,
      supabaseServiceKey: SUPABASE_SERVICE_ROLE_KEY,
      comunaSlug,
      regionId,
    });

    regionId = resolvedRegionId;

    // Cálculo de cuántos hits necesitamos “pre-cargar” por tier para cortar por page*k
    const start = page * k;
    const end = start + k;
    const need = end; // necesitamos al menos "end" en el stream

    // Permisos lógicos:
    const allowRegional = !onlyLocal && !!regionId; // si no hay regionId, regional no sirve
    const allowNational = !onlyLocal && expandNational;

    // -------------------------
    // Definición de filtros por tier
    // -------------------------
    // OJO: usamos ids (comuna_base_id, cobertura_comunas_ids, region_ids, is_national)
    const localBaseFilter = comunaId ? fEq("comuna_base_id", comunaId) : "";
    const atiendeFilter = comunaId
      ? fAnd([fEq("cobertura_comunas_ids", comunaId), fNot("comuna_base_id", comunaId)])
      : "";

    // Regional: dentro de región, excluyendo lo ya mostrado en local/atiende
    const regionalFilter = allowRegional
      ? fAnd([
          fEq("region_ids", regionId),
          comunaId ? fNot("comuna_base_id", comunaId) : "",
          comunaId ? fNot("cobertura_comunas_ids", comunaId) : "",
        ])
      : "";

    // Nacional: is_national:true excluyendo lo ya mostrado en local/atiende
    const nationalFilter = allowNational
      ? fAnd([
          "is_national:true",
          comunaId ? fNot("comuna_base_id", comunaId) : "",
          comunaId ? fNot("cobertura_comunas_ids", comunaId) : "",
        ])
      : "";

    // -------------------------
    // Ejecutar búsquedas por tier (en orden)
    // -------------------------
    const tiers: { tier: TierName; filters: string; enabled: boolean }[] = [
      { tier: "local_base", filters: localBaseFilter, enabled: !!localBaseFilter },
      { tier: "atiende_comuna", filters: atiendeFilter, enabled: !!atiendeFilter },
      { tier: "regional", filters: regionalFilter, enabled: !!regionalFilter },
      { tier: "nacional", filters: nationalFilter, enabled: !!nationalFilter },
    ];

    // Guardamos resultados y conteos por tier
    const tierHits: Record<TierName, any[]> = {
      local_base: [],
      atiende_comuna: [],
      regional: [],
      nacional: [],
    };

    const tierNbHits: Record<TierName, number> = {
      local_base: 0,
      atiende_comuna: 0,
      regional: 0,
      nacional: 0,
    };

    // stream jerárquico
    const stream: { tier: TierName; hit: any }[] = [];

    for (const t of tiers) {
      if (!t.enabled) continue;

      // Traemos hasta "need" por tier para poder armar stream y cortar
      const r = await searchAlgolia({
        index,
        q,
        filters: t.filters,
        hitsPerPage: need,
      });

      const hits = Array.isArray(r.hits) ? r.hits : [];
      tierHits[t.tier] = hits;
      tierNbHits[t.tier] = typeof r.nbHits === "number" ? r.nbHits : hits.length;

      for (const h of hits) {
        stream.push({ tier: t.tier, hit: h });
        if (stream.length >= need) break;
      }
      if (stream.length >= need) break;
    }

    // Emergencia: si page=0 y quedan muy pocos resultados, podemos “rellenar” con nacionales
    // SOLO si allowNational=true (o sea, el usuario aceptó expandNational)
    let emergencyAdded = 0;
    if (page === 0 && allowNational && stream.length < Math.min(4, k)) {
      // Traemos algunos nacionales extra (hasta 3)
      const r = await searchAlgolia({
        index,
        q,
        filters: nationalFilter || "is_national:true",
        hitsPerPage: 20,
      });

      const extra = (Array.isArray(r.hits) ? r.hits : []).slice(0, 3);
      for (const h of extra) {
        // evitar duplicados por objectID/id
        const key = String(h.objectID ?? h.id ?? "");
        const exists = stream.some((x) => String(x.hit.objectID ?? x.hit.id ?? "") === key);
        if (exists) continue;
        stream.push({ tier: "nacional", hit: h });
        emergencyAdded++;
      }
    }

    // Cortamos página
    const pageSlice = stream.slice(start, end);

    // ✅ CAMBIO ROCÍO: incluir tier en cada item
    const items = pageSlice.map((x) => ({
      ...x.hit,
      tier: x.tier,
    }));

    // buckets (solo conteo simple + (opcional) ids si debug)
    const buckets: any = {
      local_base: { titulo: "Opciones en tu comuna", items: debug ? tierHits.local_base : [] },
      atiende_comuna: { titulo: "Opciones que atienden tu comuna", items: debug ? tierHits.atiende_comuna : [] },
      regional: { titulo: "Opciones con cobertura regional", items: debug ? tierHits.regional : [] },
      nacional: { titulo: "Opciones con cobertura nacional", items: debug ? tierHits.nacional : [] },
    };

    const counts = {
      local_base: tierNbHits.local_base,
      atiende_comuna: tierNbHits.atiende_comuna,
      regional: tierNbHits.regional,
      nacional: tierNbHits.nacional,
    };

    const scope_used = onlyLocal ? "local_base" : (allowNational ? "nacional" : "regional");

    return json(true, {
      input: { q, comuna: comunaSlug || null, comunaId: comunaId || null, regionId: regionId || null },
      page,
      k,
      onlyLocal,
      expandNational: allowNational,
      allowRegional,
      scope_used,
      total: items.length,
      items,
      counts,
      emergencyAdded,
      ...(debug
        ? {
            debug: {
              filters: {
                local_base: localBaseFilter || null,
                atiende_comuna: atiendeFilter || null,
                regional: regionalFilter || null,
                nacional: nationalFilter || null,
              },
              note:
                "Paginación por capas: se arma stream jerárquico y se corta. 'tier' se adjunta por item para badges.",
            },
            buckets,
          }
        : {}),
    });
  } catch (e: any) {
    return json(false, { error: e?.message || "Error inesperado" }, 500);
  }
}