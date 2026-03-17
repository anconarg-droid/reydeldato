/**
 * Batería de pruebas de clasificación con casos reales de emprendimientos chilenos.
 * Valida que mapKeywordsToSubcategories (taxonomía v1) asigne la subcategoría
 * principal esperada a partir de keywords típicas.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapKeywordsToSubcategories } from "./classifyBusiness";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBCATEGORIAS_FIXTURE,
  KEYWORD_TO_SUBCATEGORY_MAP_FIXTURE,
} from "./classificacion-taxonomia-fixture";

/** Crea un mock de Supabase que devuelve el fixture de taxonomía v1 */
function createMockSupabase(): SupabaseClient {
  const subcategorias = SUBCATEGORIAS_FIXTURE.map((s) => ({
    id: s.id,
    slug: s.slug,
    nombre: s.nombre,
    categoria_id: s.categoria_id,
  }));

  const keywordMap = KEYWORD_TO_SUBCATEGORY_MAP_FIXTURE.map((r) => ({
    keyword: r.keyword,
    normalized_keyword: r.normalized_keyword,
    subcategoria_id: r.subcategoria_id,
    confidence_default: r.confidence_default,
  }));

  const from = vi.fn().mockImplementation((table: string) => {
    const builder = {
      _table: table,
      select: (_cols?: string) => builder,
      eq: (col: string, _val: unknown) => {
        if (table === "keyword_to_subcategory_map" && col === "activo") {
          return Promise.resolve({ data: keywordMap, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      },
      in: (col: string, ids: string[]) => {
        if (table === "subcategorias" && col === "id") {
          const filtered = subcategorias.filter((s) => ids.includes(s.id));
          return Promise.resolve({ data: filtered, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      },
      then: (resolve: (v: { data: typeof subcategorias | null; error: null }) => void) => {
        if (table === "subcategorias") {
          return Promise.resolve({ data: subcategorias, error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return builder;
  });

  return {
    from,
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    rpc: vi.fn(),
    auth: {} as SupabaseClient["auth"],
    storage: {} as SupabaseClient["storage"],
    rest: {} as SupabaseClient["rest"],
    realtime: {} as SupabaseClient["realtime"],
    schema: vi.fn(),
    removeAllChannels: vi.fn(),
  } as unknown as SupabaseClient;
}

describe("Clasificación taxonomía v1 – casos reales chilenos", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  const casos: Array<{
    nombre: string;
    keywords: string[];
    expectedPrincipalSlug: string;
  }> = [
    {
      nombre: "Panadería del barrio",
      keywords: ["pan", "panadería", "panadero"],
      expectedPrincipalSlug: "panaderia",
    },
    {
      nombre: "Pastelería y tortas",
      keywords: ["tortas", "repostería", "pasteleria"],
      expectedPrincipalSlug: "pasteleria",
    },
    {
      nombre: "Empanadas caseras",
      keywords: ["empanadas"],
      expectedPrincipalSlug: "empanadas",
    },
    {
      nombre: "Gasfiter / plomero",
      keywords: ["plomero", "gasfiter", "plomería"],
      expectedPrincipalSlug: "gasfiter",
    },
    {
      nombre: "Electricista a domicilio",
      keywords: ["electricista", "electricidad"],
      expectedPrincipalSlug: "electricista",
    },
    {
      nombre: "Vulcanización",
      keywords: ["vulca", "vulcanización"],
      expectedPrincipalSlug: "vulcanizacion",
    },
    {
      nombre: "Mecánico automotriz",
      keywords: ["mecánico", "taller mecánico"],
      expectedPrincipalSlug: "mecanico",
    },
    {
      nombre: "Fletes y mudanzas",
      keywords: ["fletes", "mudanza", "flete"],
      expectedPrincipalSlug: "fletes",
    },
    {
      nombre: "Veterinaria y peluquería canina",
      keywords: ["veterinaria", "veterinario"],
      expectedPrincipalSlug: "veterinaria",
    },
    {
      nombre: "Ferretería",
      keywords: ["ferretería"],
      expectedPrincipalSlug: "ferreteria",
    },
    {
      nombre: "Clases particulares",
      keywords: ["clases", "clases particulares"],
      expectedPrincipalSlug: "clases",
    },
    {
      nombre: "Peluquería",
      keywords: ["peluqueria", "peluquero"],
      expectedPrincipalSlug: "peluqueria",
    },
    {
      nombre: "Pizzería",
      keywords: ["pizzas", "pizza"],
      expectedPrincipalSlug: "pizzas",
    },
    {
      nombre: "Comida casera y delivery",
      keywords: ["comida casera", "delivery"],
      expectedPrincipalSlug: "comida_casera",
    },
  ];

  it.each(casos)(
    "asigna $expectedPrincipalSlug para caso: $nombre",
    async ({ keywords, expectedPrincipalSlug }) => {
      const { candidatas, principalId } = await mapKeywordsToSubcategories(
        mockSupabase,
        keywords
      );

      expect(candidatas.length).toBeGreaterThan(0);
      expect(principalId).toBeTruthy();

      const principal = candidatas.find((c) => c.subcategoria_id === principalId) ?? candidatas[0];
      const slug = principal.subcategoria_slug || resolveSlugFromFixture(principal.subcategoria_id);

      expect(slug).toBe(expectedPrincipalSlug);
    }
  );

  it("devuelve la subcategoría principal con mayor score", async () => {
    const { candidatas, principalId } = await mapKeywordsToSubcategories(mockSupabase, [
      "pan",
      "panadería",
      "tortas",
    ]);

    expect(candidatas.length).toBeGreaterThanOrEqual(1);
    const principal = candidatas[0];
    expect(principal.subcategoria_id).toBe(principalId);
    const slug = principal.subcategoria_slug || resolveSlugFromFixture(principal.subcategoria_id);
    expect(["panaderia", "pasteleria"]).toContain(slug);
  });

  it("normaliza términos (minúsculas, sin acentos) para el match", async () => {
    const { candidatas } = await mapKeywordsToSubcategories(mockSupabase, [
      "Panadería",
      "PLOMERO",
    ]);

    expect(candidatas.length).toBeGreaterThanOrEqual(1);
    const slugs = candidatas.map((c) => c.subcategoria_slug || resolveSlugFromFixture(c.subcategoria_id));
    expect(slugs.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
    expect(slugs).toContain("panaderia");
    expect(slugs).toContain("gasfiter");
  });
});

function resolveSlugFromFixture(subcategoriaId: string): string {
  const sub = SUBCATEGORIAS_FIXTURE.find((s) => s.id === subcategoriaId);
  return sub?.slug ?? "";
}
