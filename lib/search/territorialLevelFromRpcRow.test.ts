import { describe, expect, it } from "vitest";
import {
  territorialLevelFromRpcRow,
  splitByTerritorialBucket,
} from "./territorialLevelFromRpcRow";

describe("territorialLevelFromRpcRow", () => {
  it("ranking_score 4 => nivel 1 (base comuna)", () => {
    expect(territorialLevelFromRpcRow({ ranking_score: 4 })).toBe(1);
  });

  it("ranking_score 3,2,1 => niveles 2,3,4 (atienden)", () => {
    expect(territorialLevelFromRpcRow({ ranking_score: 3 })).toBe(2);
    expect(territorialLevelFromRpcRow({ ranking_score: 2 })).toBe(3);
    expect(territorialLevelFromRpcRow({ ranking_score: 1 })).toBe(4);
  });

  it("prioriza ranking_score sobre score cuando ambos existen (evita mezclar escalas)", () => {
    expect(
      territorialLevelFromRpcRow({
        ranking_score: 4,
        score: 2,
      })
    ).toBe(1);
  });

  it("sin ranking_score válido usa score legacy 1–4", () => {
    expect(territorialLevelFromRpcRow({ score: 1 })).toBe(1);
    expect(territorialLevelFromRpcRow({ score: 4 })).toBe(4);
  });

  it("bloque/suborden como en ComunaPage", () => {
    expect(territorialLevelFromRpcRow({ bloque: 1 })).toBe(1);
    expect(territorialLevelFromRpcRow({ suborden: 1 })).toBe(2);
    expect(territorialLevelFromRpcRow({ suborden: 3 })).toBe(4);
  });
});

describe("splitByTerritorialBucket", () => {
  it("no duplica filas entre buckets", () => {
    const rows = [
      { id: "a", ranking_score: 4 },
      { id: "b", ranking_score: 3 },
      { id: "c", score: 1 },
    ];
    const { deMiComuna, atiendenMiComuna } = splitByTerritorialBucket(rows);
    expect(deMiComuna).toHaveLength(2);
    expect(atiendenMiComuna).toHaveLength(1);
    const allIds = [...deMiComuna, ...atiendenMiComuna].map((r) => r.id).sort();
    expect(allIds).toEqual(["a", "b", "c"]);
  });

  it("ranking_score 4 nunca va solo a atienden por confusion con score 4 legacy", () => {
    const { deMiComuna, atiendenMiComuna } = splitByTerritorialBucket([
      { ranking_score: 4 },
    ]);
    expect(deMiComuna).toHaveLength(1);
    expect(atiendenMiComuna).toHaveLength(0);
  });
});
