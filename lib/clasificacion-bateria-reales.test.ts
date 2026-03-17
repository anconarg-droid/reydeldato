/**
 * Batería de validación de clasificación con casos reales de emprendimientos chilenos.
 * Ejecuta cada caso contra el motor de clasificación (keyword map + similitud) y genera
 * un reporte: bien clasificados, ambiguos, faltan en diccionario.
 *
 * - Batería 1: casos limpios/realistas (lib/clasificacion-bateria-casos-reales.ts)
 * - Batería 2: casos sucios/ambiguos (lib/clasificacion-bateria-casos-sucios.ts)
 *
 * Ejecutar: npm run test -- lib/clasificacion-bateria-reales.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapKeywordsToSubcategories } from "./classifyBusiness";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBCATEGORIAS_FIXTURE,
  KEYWORD_TO_SUBCATEGORY_MAP_FIXTURE,
} from "./classificacion-taxonomia-fixture";
import { BATERIA_CASOS_REALES } from "./clasificacion-bateria-casos-reales";
import { BATERIA_CASOS_SUCIOS } from "./clasificacion-bateria-casos-sucios";
import type { CasoClasificacion } from "./clasificacion-bateria-casos-reales";

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

function principalIdToSlug(principalId: string | null): string | null {
  if (!principalId) return null;
  const sub = SUBCATEGORIAS_FIXTURE.find((s) => s.id === principalId);
  return sub?.slug ?? null;
}

type ResultadoCaso = {
  id: string;
  nombre_emprendimiento: string;
  expected_slug: string;
  got_slug: string | null;
  match: boolean;
  confidence: number;
  cayo_en_pendiente: boolean;
  etiqueta: "bien_clasificado" | "ambiguo" | "falta_diccionario";
};

describe("Batería de clasificación – casos reales chilenos", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it("ejecuta los casos y genera reporte bien/ambiguo/falta_diccionario", async () => {
    const { bien, ambiguos, falta } = await ejecutarBateria(mockSupabase, BATERIA_CASOS_REALES);

    imprimirReporte(
      "REPORTE BATERÍA 1 – CASOS REALES",
      BATERIA_CASOS_REALES.length,
      bien,
      ambiguos,
      falta
    );

    // Umbral mínimo: al menos 80% bien clasificados con el fixture actual
    expect(bien.length).toBeGreaterThanOrEqual(
      Math.floor(BATERIA_CASOS_REALES.length * 0.8),
      "Se espera al menos 80% de casos bien clasificados con el diccionario actual"
    );
  });

  it("incluye al menos 30 casos en la batería", () => {
    expect(BATERIA_CASOS_REALES.length).toBeGreaterThanOrEqual(30);
  });
});

/** Ejecuta una batería de casos y devuelve resultados + reporte por etiqueta */
async function ejecutarBateria(
  supabase: SupabaseClient,
  casos: CasoClasificacion[]
): Promise<{ resultados: ResultadoCaso[]; bien: ResultadoCaso[]; ambiguos: ResultadoCaso[]; falta: ResultadoCaso[] }> {
  const resultados: ResultadoCaso[] = [];

  for (const caso of casos) {
    const keywordsUsuario = caso.keywords_usuario ?? [];
    const keywordsIa = caso.keywords_ia_simulados ?? [];
    const keywords = [...new Set([...keywordsUsuario, ...keywordsIa])];
    const keywordsParaMap = keywords.length > 0 ? keywords : [caso.subcategoria_esperada];

    const { candidatas, principalId } = await mapKeywordsToSubcategories(supabase, keywordsParaMap);

    const gotSlug = principalIdToSlug(principalId);
    const match = gotSlug === caso.subcategoria_esperada;
    const confidence = candidatas[0]?.score ?? 0;
    const cayoEnPendiente = candidatas.length === 0;

    let etiqueta: ResultadoCaso["etiqueta"];
    if (cayoEnPendiente || !gotSlug) {
      etiqueta = "falta_diccionario";
    } else if (match && confidence >= 0.8) {
      etiqueta = "bien_clasificado";
    } else if (match && confidence < 0.8) {
      etiqueta = "ambiguo";
    } else {
      etiqueta = "falta_diccionario";
    }

    resultados.push({
      id: caso.id,
      nombre_emprendimiento: caso.nombre_emprendimiento,
      expected_slug: caso.subcategoria_esperada,
      got_slug: gotSlug,
      match,
      confidence,
      cayo_en_pendiente: cayoEnPendiente,
      etiqueta,
    });
  }

  const bien = resultados.filter((r) => r.etiqueta === "bien_clasificado");
  const ambiguos = resultados.filter((r) => r.etiqueta === "ambiguo");
  const falta = resultados.filter((r) => r.etiqueta === "falta_diccionario");
  return { resultados, bien, ambiguos, falta };
}

function imprimirReporte(
  titulo: string,
  total: number,
  bien: ResultadoCaso[],
  ambiguos: ResultadoCaso[],
  falta: ResultadoCaso[]
) {
  console.log(`\n=== ${titulo} ===\n`);
  console.log(`Total casos: ${total}`);
  console.log(`Bien clasificados: ${bien.length}`);
  console.log(`Ambiguos: ${ambiguos.length}`);
  console.log(`Faltan en diccionario: ${falta.length}\n`);

  console.log("--- Bien clasificados ---");
  bien.forEach((r) =>
    console.log(`  [${r.id}] ${r.nombre_emprendimiento} → ${r.got_slug} (conf: ${r.confidence})`)
  );

  if (ambiguos.length > 0) {
    console.log("\n--- Ambiguos (revisar) ---");
    ambiguos.forEach((r) =>
      console.log(
        `  [${r.id}] ${r.nombre_emprendimiento} | esperado: ${r.expected_slug} | got: ${r.got_slug} (conf: ${r.confidence})`
      )
    );
  }

  if (falta.length > 0) {
    console.log("\n--- Faltan en diccionario ---");
    falta.forEach((r) =>
      console.log(
        `  [${r.id}] ${r.nombre_emprendimiento} | esperado: ${r.expected_slug} | got: ${r.got_slug ?? "sin match"}`
      )
    );
  }
  console.log("\n=====================================\n");
}

describe("Batería 2 – casos sucios / ambiguos", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it("ejecuta los casos sucios y genera reporte bien/ambiguo/falta_diccionario", async () => {
    const { bien, ambiguos, falta } = await ejecutarBateria(mockSupabase, BATERIA_CASOS_SUCIOS);

    imprimirReporte(
      "REPORTE BATERÍA 2 – CASOS SUCIOS / AMBIGUOS",
      BATERIA_CASOS_SUCIOS.length,
      bien,
      ambiguos,
      falta
    );

    // Con lenguaje sucio/ambiguo se espera al menos la mitad bien clasificados (diccionario ampliado)
    expect(bien.length + ambiguos.length + falta.length).toBe(BATERIA_CASOS_SUCIOS.length);
    expect(bien.length).toBeGreaterThanOrEqual(
      Math.floor(BATERIA_CASOS_SUCIOS.length * 0.5),
      "Se espera al menos 50% bien clasificados en batería sucia con el diccionario actual"
    );
  });

  it("incluye al menos 20 casos en la batería sucia", () => {
    expect(BATERIA_CASOS_SUCIOS.length).toBeGreaterThanOrEqual(20);
  });
});
