/**
 * Tests para learnFromManualClassification: inserción de keywords, prioridad source_type,
 * cierre de clasificacion_pendiente y registro en feedback_log.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { learnFromManualClassification } from "./learnFromManualClassification";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(opts: {
  emprendedor?: Record<string, unknown> | null;
  existingKeywordRows?: Array<{ normalized_keyword: string; source_type: string }>;
  captureUpsert?: (rows: unknown) => void;
  captureUpdatePendiente?: (payload: unknown) => void;
  captureInsertFeedback?: (payload: unknown) => void;
}): SupabaseClient {
  const defaultEmp = {
    id: "emp-1",
    subcategoria_principal_id: null,
    keywords_usuario_json: ["pan", "panadería"],
    keywords_usuario: null,
    ai_keywords_json: { keywords: ["reposteria"], keywords_ia: [] },
    ai_raw_classification_json: null,
  };
  const emprendedor = "emprendedor" in opts ? opts.emprendedor : defaultEmp;
  const existingKeywordRows = opts.existingKeywordRows ?? [];

  const from = vi.fn().mockImplementation((table: string) => {
    const chain = {
      select: (_cols?: string) => ({
        eq: (_col: string, _val: unknown) => ({
          single: () =>
            table === "emprendedores"
              ? Promise.resolve({ data: emprendedor, error: null })
              : Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
        in: (_col: string, _vals: unknown[]) =>
          table === "keyword_to_subcategory_map"
            ? Promise.resolve({ data: existingKeywordRows, error: null })
            : Promise.resolve({ data: [], error: null }),
      }),
      upsert: (rows: unknown, _opts?: unknown) => {
        opts.captureUpsert?.(rows);
        return Promise.resolve({ data: null, error: null });
      },
      update: (payload: unknown) => {
        opts.captureUpdatePendiente?.(payload);
        return { eq: () => Promise.resolve({ data: null, error: null }) };
      },
      insert: (payload: unknown) => {
        opts.captureInsertFeedback?.(payload);
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
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

describe("learnFromManualClassification", () => {
  it("inserta keywords válidas del usuario con source_type manual", async () => {
    let upserted: unknown = null;
    const supabase = createMockSupabase({
      emprendedor: {
        id: "e1",
        subcategoria_principal_id: null,
        keywords_usuario_json: ["pan", "panadería", "reposteria"],
        ai_keywords_json: null,
        ai_raw_classification_json: null,
      },
      existingKeywordRows: [],
      captureUpsert: (rows) => {
        upserted = rows;
      },
    });
    const result = await learnFromManualClassification(
      supabase,
      "e1",
      "sub-panaderia-id",
      {}
    );
    expect(result.ok).toBe(true);
    expect(result.keywordsAdded).toBeGreaterThanOrEqual(1);
    const rows = upserted as Array<{ source_type: string }>;
    if (rows?.length) {
      expect(rows.some((r) => r.source_type === "manual")).toBe(true);
    }
  });

  it("inserta keywords de IA con source_type ai_feedback cuando no existen", async () => {
    let upserted: unknown = null;
    const supabase = createMockSupabase({
      emprendedor: {
        id: "e2",
        subcategoria_principal_id: null,
        keywords_usuario_json: [],
        ai_keywords_json: { keywords: ["veterinaria", "mascotas"], keywords_ia: [] },
        ai_raw_classification_json: null,
      },
      existingKeywordRows: [],
      captureUpsert: (rows) => {
        upserted = rows;
      },
    });
    const result = await learnFromManualClassification(supabase, "e2", "sub-vet-id", {});
    expect(result.ok).toBe(true);
    const rows = upserted as Array<{ source_type: string }>;
    if (rows?.length) {
      expect(rows.some((r) => r.source_type === "ai_feedback")).toBe(true);
    }
  });

  it("evita duplicados por normalized_keyword (mismo término usuario e IA)", async () => {
    let upserted: unknown = null;
    const supabase = createMockSupabase({
      emprendedor: {
        id: "e3",
        subcategoria_principal_id: null,
        keywords_usuario_json: ["pan"],
        ai_keywords_json: { keywords: ["pan"], keywords_ia: [] },
        ai_raw_classification_json: null,
      },
      existingKeywordRows: [],
      captureUpsert: (rows) => {
        upserted = rows;
      },
    });
    await learnFromManualClassification(supabase, "e3", "sub-id", {});
    const rows = upserted as Array<{ normalized_keyword: string }>;
    const norms = rows?.map((r) => r.normalized_keyword) ?? [];
    expect(new Set(norms).size).toBe(norms.length);
  });

  it("resuelve clasificacion_pendiente (status resuelto, reviewed_at)", async () => {
    let updatePayload: Record<string, unknown> | null = null;
    const supabase = createMockSupabase({
      captureUpdatePendiente: (p) => {
        updatePayload = p as Record<string, unknown>;
      },
    });
    await learnFromManualClassification(supabase, "emp-1", "sub-1", { reviewedBy: "user-123" });
    expect(updatePayload).not.toBeNull();
    expect(updatePayload?.status).toBe("resuelto");
    expect(updatePayload?.reviewed_by).toBe("user-123");
  });

  it("inserta en clasificacion_feedback_log con action correccion", async () => {
    let insertPayload: Record<string, unknown> | null = null;
    const supabase = createMockSupabase({
      captureInsertFeedback: (p) => {
        insertPayload = p as Record<string, unknown>;
      },
    });
    await learnFromManualClassification(supabase, "emp-1", "sub-1", {});
    expect(insertPayload).not.toBeNull();
    expect(insertPayload?.action).toBe("correccion");
    expect(insertPayload?.new_subcategoria_id).toBe("sub-1");
    expect(insertPayload?.emprendedor_id).toBe("emp-1");
  });

  it("no sobrescribe manual: no incluye en upsert keyword que ya existe con source_type manual", async () => {
    let upserted: unknown = null;
    const supabase = createMockSupabase({
      emprendedor: {
        id: "e4",
        subcategoria_principal_id: null,
        keywords_usuario_json: [],
        ai_keywords_json: { keywords: ["pan"], keywords_ia: [] },
        ai_raw_classification_json: null,
      },
      existingKeywordRows: [{ normalized_keyword: "pan", source_type: "manual" }],
      captureUpsert: (rows) => {
        upserted = rows;
      },
    });
    await learnFromManualClassification(supabase, "e4", "sub-1", {});
    const rows = upserted as Array<{ normalized_keyword: string; source_type: string }>;
    const panRow = rows?.find((r) => r.normalized_keyword === "pan");
    expect(panRow).toBeUndefined();
  });

  it("devuelve error si emprendedor no existe", async () => {
    const supabase = createMockSupabase({ emprendedor: null });
    const result = await learnFromManualClassification(supabase, "no-existe", "sub-1", {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Emprendimiento no encontrado");
  });
});
