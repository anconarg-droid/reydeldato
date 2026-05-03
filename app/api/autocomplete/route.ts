/**
 * Autocomplete V1: solo sugerencias de búsqueda (intent, intent_comuna, comuna, sector).
 * NO devuelve emprendimientos individuales. Fuentes: intentAliases, comunaAliases, sectores, Algolia (solo para descubrir términos).
 */
import { NextRequest, NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { INTENT_ALIASES } from "@/lib/search/intentAliases";
import { COMUNA_ALIASES } from "@/lib/search/comunaAliases";
import {
  SECTORES,
  intentLabelFromSlug,
  comunaLabelFromSlug,
} from "@/lib/search/autocompleteConstants";
import {
  isResolvedQueryExactGas,
  suggestionMentionsGasfiteria,
} from "@/lib/gasQueryExcludeGasfiteria";

export const runtime = "nodejs";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function norm(v: unknown): string {
  return s(v)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function env(name: string): string {
  const v = process.env[name];
  return (v && v.trim().length ? v.trim() : "") as string;
}

// --- Tipos de respuesta (sin negocios) ---
export type SuggestionIntent = {
  type: "intent";
  label: string;
  value: string;
  url: string;
};

export type SuggestionIntentComuna = {
  type: "intent_comuna";
  label: string;
  value: string;
  comuna: string;
  url: string;
};

export type SuggestionComuna = {
  type: "comuna";
  label: string;
  comuna: string;
  url: string;
};

export type SuggestionSector = {
  type: "sector";
  label: string;
  sector: string;
  url: string;
};

export type AutocompleteSuggestion =
  | SuggestionIntent
  | SuggestionIntentComuna
  | SuggestionComuna
  | SuggestionSector;

function matchesQuery(normalizedAlias: string, qNorm: string): boolean {
  if (!qNorm) return true;
  return (
    normalizedAlias.startsWith(qNorm) ||
    qNorm.startsWith(normalizedAlias) ||
    normalizedAlias.includes(qNorm)
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = s(url.searchParams.get("q"));
    const comunaParam = s(url.searchParams.get("comuna"));
    const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 8), 20);

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, suggestions: [] as AutocompleteSuggestion[] });
    }

    const qNorm = norm(q);
    const seen = new Set<string>();
    let suggestions: AutocompleteSuggestion[] = [];

    function dedupeKey(type: string, value: string, comuna?: string): string {
      return comuna ? `${type}:${value}:${comuna}` : `${type}:${value}`;
    }
    function add(s: AutocompleteSuggestion) {
      const key =
        s.type === "intent_comuna"
          ? dedupeKey(s.type, s.value, s.comuna)
          : s.type === "comuna"
            ? dedupeKey(s.type, s.comuna, "")
            : s.type === "sector"
              ? dedupeKey(s.type, s.sector, "")
              : dedupeKey(s.type, s.value, "");
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push(s);
    }

    // 1) Comunas que coinciden con q (para intent_comuna y comuna)
    const comunasMatched: { slug: string; label: string }[] = [];
    for (const [slug, aliases] of Object.entries(COMUNA_ALIASES)) {
      const label = comunaLabelFromSlug(slug);
      const slugNorm = norm(slug);
      const labelNorm = norm(label);
      let match = slugNorm.startsWith(qNorm) || labelNorm.startsWith(qNorm) || labelNorm.includes(qNorm);
      if (!match) {
        for (const alias of aliases) {
          const an = norm(alias);
          if (an.startsWith(qNorm) || qNorm.startsWith(an) || an.includes(qNorm)) {
            match = true;
            break;
          }
        }
      }
      if (match) comunasMatched.push({ slug, label });
    }

    // 2) Intents: alias o finalQuery coincide con q
    const intentsMatched: { value: string; label: string }[] = [];
    for (const [_key, def] of Object.entries(INTENT_ALIASES)) {
      const value = def.finalQuery;
      const label = intentLabelFromSlug(value);
      const valueNorm = norm(value);
      const labelNorm = norm(label);
      if (!value || !label) continue;
      let match = valueNorm.startsWith(qNorm) || qNorm.startsWith(valueNorm) || labelNorm.includes(qNorm);
      if (!match) {
        for (const alias of def.aliases) {
          const an = norm(alias);
          if (matchesQuery(an, qNorm) || matchesQuery(qNorm, an)) {
            match = true;
            break;
          }
        }
      }
      if (match) {
        intentsMatched.push({ value, label });
        add({
          type: "intent",
          label,
          value,
          url: `/buscar?q=${encodeURIComponent(value)}`,
        });
      }
    }

    // 3) intent_comuna (prioridad 2)
    const comunasPool =
      comunasMatched.length > 0
        ? comunasMatched
        : Object.entries(COMUNA_ALIASES)
            .map(([slug]) => ({ slug, label: comunaLabelFromSlug(slug) }))
            .slice(0, 6);
    let intentComunaCount = 0;
    for (const { value, label: intentLabel } of intentsMatched) {
      if (intentComunaCount >= 4) break;
      for (const { slug, label: comunaLabel } of comunasPool) {
        if (intentComunaCount >= 4) break;
        add({
          type: "intent_comuna",
          label: `${intentLabel} en ${comunaLabel}`,
          value,
          comuna: slug,
          url: `/buscar?q=${encodeURIComponent(value)}&comuna=${encodeURIComponent(slug)}`,
        });
        intentComunaCount++;
      }
    }

    // 4) comuna (prioridad 3)
    for (const { slug, label } of comunasMatched) {
      add({
        type: "comuna",
        label,
        comuna: slug,
        url: `/buscar?comuna=${encodeURIComponent(slug)}`,
      });
    }

    // 5) sector (prioridad 4)
    for (const { slug, label } of SECTORES) {
      const slugNorm = norm(slug);
      const labelNorm = norm(label);
      if (
        slugNorm.includes(qNorm) ||
        labelNorm.includes(qNorm) ||
        qNorm.includes(slugNorm) ||
        qNorm.includes(labelNorm)
      ) {
        add({
          type: "sector",
          label,
          sector: slug,
          url: `/buscar?sector=${encodeURIComponent(slug)}`,
        });
      }
    }

    // 5) Algolia: solo para descubrir términos (tags/sector); nunca nombres de negocios
    const appId = env("ALGOLIA_APP_ID") || env("NEXT_PUBLIC_ALGOLIA_APP_ID");
    const searchKey = env("ALGOLIA_SEARCH_KEY") || env("NEXT_PUBLIC_ALGOLIA_SEARCH_KEY");
    const indexName = env("ALGOLIA_INDEX_EMPRENDEDORES") || "emprendedores";
    if (appId && searchKey && qNorm.length >= 2) {
      try {
        const client = algoliasearch(appId, searchKey);
        const index = client.initIndex(indexName);
        const res = await index.search(q, {
          hitsPerPage: 20,
          attributesToRetrieve: ["tags_slugs", "sector_slug"],
          typoTolerance: true,
          advancedSyntax: false,
        });
        const hits = (res.hits || []) as any[];
        const tagsSeen = new Set<string>();
        const sectorsFromAlgolia = new Set<string>();
        for (const hit of hits) {
          for (const tag of Array.isArray(hit.tags_slugs) ? hit.tags_slugs : []) {
            const t = s(tag);
            if (!t || tagsSeen.has(t)) continue;
            tagsSeen.add(t);
            const def = Object.values(INTENT_ALIASES).find((d) => norm(d.finalQuery) === norm(t));
            if (def) {
              const value = def.finalQuery;
              const label = intentLabelFromSlug(value);
              add({
                type: "intent",
                label,
                value,
                url: `/buscar?q=${encodeURIComponent(value)}`,
              });
            }
          }
          const sec = s(hit.sector_slug);
          if (sec) sectorsFromAlgolia.add(sec);
        }
        for (const sectorSlug of sectorsFromAlgolia) {
          const sector = SECTORES.find((x) => norm(x.slug) === norm(sectorSlug));
          if (sector && !seen.has(dedupeKey("sector", sector.slug, ""))) {
            add({
              type: "sector",
              label: sector.label,
              sector: sector.slug,
              url: `/buscar?sector=${encodeURIComponent(sector.slug)}`,
            });
          }
        }
      } catch {
        // Algolia opcional; si falla seguimos con intents/comunas/sectores
      }
    }

    if (isResolvedQueryExactGas(q)) {
      suggestions = suggestions.filter((s) => !suggestionMentionsGasfiteria(s));
    }

    return NextResponse.json({
      ok: true,
      suggestions: suggestions.slice(0, limit),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "autocomplete_error" },
      { status: 500 }
    );
  }
}
