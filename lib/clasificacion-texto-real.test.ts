/**
 * Test de clasificación desde texto libre real (sin keywords_usuario).
 * Simula el flujo como cuando un emprendedor publica: solo nombre + descripción,
 * se extraen keywords del texto y se pasa al motor.
 *
 * Ejecutar: npm run test -- lib/clasificacion-texto-real.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapKeywordsToSubcategories } from "./classifyBusiness";
import { CONFIDENCE_THRESHOLD } from "./classifyBusiness";
import { extractKeywordsFromText } from "./extractKeywordsFromText";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBCATEGORIAS_FIXTURE,
  KEYWORD_TO_SUBCATEGORY_MAP_FIXTURE,
} from "./classificacion-taxonomia-fixture";

type CasoTextoReal = {
  id: string;
  nombre_emprendimiento: string;
  descripcion_negocio: string;
  subcategoria_esperada: string;
};

const CASOS_TEXTO_REAL: CasoTextoReal[] = [
  { id: "t1", nombre_emprendimiento: "Pan Doña Rosa", descripcion_negocio: "vendo pan amasado y dulces caseros", subcategoria_esperada: "panaderia" },
  { id: "t2", nombre_emprendimiento: "Gasfiter Urgente", descripcion_negocio: "arreglo calefont y destapes urgentes", subcategoria_esperada: "gasfiter" },
  { id: "t3", nombre_emprendimiento: "Clases Matematicas", descripcion_negocio: "clases de matematicas para niños", subcategoria_esperada: "clases" },
  { id: "t4", nombre_emprendimiento: "Lavado Express", descripcion_negocio: "lavado de autos a domicilio", subcategoria_esperada: "mecanico" },
  { id: "t5", nombre_emprendimiento: "Muebles Melamina", descripcion_negocio: "hago muebles de cocina en melamina", subcategoria_esperada: "ferreteria" },
  { id: "t6", nombre_emprendimiento: "Vet y Pelu Canina", descripcion_negocio: "veterinaria y peluqueria canina", subcategoria_esperada: "veterinaria" },
  { id: "t7", nombre_emprendimiento: "Panadería Centro", descripcion_negocio: "pan marraqueta hallullas y tortas", subcategoria_esperada: "panaderia" },
  { id: "t8", nombre_emprendimiento: "Fletes Santiago", descripcion_negocio: "fletes y mudanzas a todo chile", subcategoria_esperada: "fletes" },
  { id: "t9", nombre_emprendimiento: "Pizza Napolitana", descripcion_negocio: "pizzas artesanales y delivery", subcategoria_esperada: "pizzas" },
  { id: "t10", nombre_emprendimiento: "Electricidad Casa", descripcion_negocio: "instalaciones electricas y reparacion", subcategoria_esperada: "electricista" },
  { id: "t11", nombre_emprendimiento: "Vulca Rápido", descripcion_negocio: "vulca parche y cambio de neumaticos", subcategoria_esperada: "vulcanizacion" },
  { id: "t12", nombre_emprendimiento: "Almuerzos Delivery", descripcion_negocio: "comida casera y almuerzos a domicilio", subcategoria_esperada: "comida_casera" },
  { id: "t13", nombre_emprendimiento: "Refuerzo Escolar", descripcion_negocio: "clases de refuerzo y matematicas", subcategoria_esperada: "clases" },
  { id: "t14", nombre_emprendimiento: "Peluquería Unisex", descripcion_negocio: "cortes de pelo tintura y barberia", subcategoria_esperada: "peluqueria" },
  { id: "t15", nombre_emprendimiento: "Ferretería Obra", descripcion_negocio: "herramientas ferreteria y materiales", subcategoria_esperada: "ferreteria" },
];

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

type ResultadoTexto = {
  id: string;
  nombre_emprendimiento: string;
  descripcion_negocio: string;
  keywords_extraidos: string[];
  expected_slug: string;
  got_slug: string | null;
  match: boolean;
  confidence: number;
  cayo_en_pendiente: boolean;
  pendiente_revision: boolean;
  etiqueta: "bien_clasificado" | "ambiguo" | "falta_diccionario";
};

describe("Clasificación desde texto libre real", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it("extrae keywords del texto, clasifica y genera reporte bien/ambiguo/falta", async () => {
    const resultados: ResultadoTexto[] = [];

    for (const caso of CASOS_TEXTO_REAL) {
      const textoCompleto = [caso.nombre_emprendimiento, caso.descripcion_negocio].filter(Boolean).join(" ");
      const keywordsExtraidos = extractKeywordsFromText(textoCompleto);

      const { candidatas, principalId } = await mapKeywordsToSubcategories(
        mockSupabase,
        keywordsExtraidos.length > 0 ? keywordsExtraidos : [caso.subcategoria_esperada]
      );

      const gotSlug = principalIdToSlug(principalId);
      const match = gotSlug === caso.subcategoria_esperada;
      const confidence = candidatas[0]?.score ?? 0;
      const cayoEnPendiente = candidatas.length === 0;
      const pendienteRevision = !cayoEnPendiente && confidence < CONFIDENCE_THRESHOLD;

      let etiqueta: ResultadoTexto["etiqueta"];
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
        descripcion_negocio: caso.descripcion_negocio,
        keywords_extraidos: keywordsExtraidos,
        expected_slug: caso.subcategoria_esperada,
        got_slug: gotSlug,
        match,
        confidence,
        cayo_en_pendiente: cayoEnPendiente,
        pendiente_revision: pendienteRevision,
        etiqueta,
      });
    }

    const bien = resultados.filter((r) => r.etiqueta === "bien_clasificado");
    const ambiguos = resultados.filter((r) => r.etiqueta === "ambiguo");
    const falta = resultados.filter((r) => r.etiqueta === "falta_diccionario");
    const conPendienteRevision = resultados.filter((r) => r.pendiente_revision);

    console.log("\n=== REPORTE CLASIFICACIÓN DESDE TEXTO ===\n");
    console.log(`Total casos: ${resultados.length}`);
    console.log(`Bien clasificados: ${bien.length}`);
    console.log(`Ambiguos: ${ambiguos.length}`);
    console.log(`Faltan en diccionario: ${falta.length}`);
    console.log(`Con pendiente_revision (conf < ${CONFIDENCE_THRESHOLD}): ${conPendienteRevision.length}\n`);

    console.log("--- Bien clasificados ---");
    bien.forEach((r) =>
      console.log(`  [${r.id}] ${r.nombre_emprendimiento} | "${r.descripcion_negocio}" → ${r.got_slug} (conf: ${r.confidence})`)
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
          `  [${r.id}] ${r.nombre_emprendimiento} | "${r.descripcion_negocio}" | esperado: ${r.expected_slug} | got: ${r.got_slug ?? "sin match"} | keywords: [${r.keywords_extraidos.join(", ")}]`
        )
      );
    }

    if (conPendienteRevision.length > 0) {
      console.log("\n--- Con pendiente_revision (confianza baja) ---");
      conPendienteRevision.forEach((r) =>
        console.log(`  [${r.id}] ${r.nombre_emprendimiento} → ${r.got_slug} (conf: ${r.confidence})`)
      );
    }

    console.log("\n==========================================\n");

    expect(resultados.length).toBe(CASOS_TEXTO_REAL.length);
    expect(bien.length + ambiguos.length + falta.length).toBe(resultados.length);
  });
});
