/**
 * Tests para normalización y filtrado de keywords, y prioridad de source_type.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeAndFilterKeyword,
  canOverwriteKeywordSource,
  NOISE_WORDS,
  MAX_KEYWORD_LENGTH,
  MIN_KEYWORD_LENGTH,
} from "./keywordValidation";

describe("normalizeAndFilterKeyword", () => {
  it("quita tildes", () => {
    expect(normalizeAndFilterKeyword("panadería")).toBe("panaderia");
    expect(normalizeAndFilterKeyword("Mecánico")).toBe("mecanico");
  });

  it("baja a minúsculas", () => {
    expect(normalizeAndFilterKeyword("PAN")).toBe("pan");
    expect(normalizeAndFilterKeyword("Gasfiter")).toBe("gasfiter");
  });

  it("elimina palabras de ruido", () => {
    expect(normalizeAndFilterKeyword("somos")).toBeNull();
    expect(normalizeAndFilterKeyword("empresa")).toBeNull();
    expect(normalizeAndFilterKeyword("servicio")).toBeNull();
    expect(normalizeAndFilterKeyword("calidad")).toBeNull();
    expect(normalizeAndFilterKeyword("experiencia")).toBeNull();
    expect(normalizeAndFilterKeyword("lider")).toBeNull();
    expect(normalizeAndFilterKeyword("mejor")).toBeNull();
    expect(normalizeAndFilterKeyword("solucion")).toBeNull();
    expect(normalizeAndFilterKeyword("profesional")).toBeNull();
  });

  it("rechaza longitud < 2", () => {
    expect(normalizeAndFilterKeyword("a")).toBeNull();
    expect(normalizeAndFilterKeyword("")).toBeNull();
    expect(normalizeAndFilterKeyword("  ")).toBeNull();
  });

  it("rechaza longitud > 40 (normalized)", () => {
    const long = "a".repeat(41);
    expect(normalizeAndFilterKeyword(long)).toBeNull();
    const exactly40 = "a".repeat(40);
    expect(normalizeAndFilterKeyword(exactly40)).toBe(exactly40);
  });

  it("colapsa espacios", () => {
    expect(normalizeAndFilterKeyword("pan   integral")).toBe("pan-integral");
    expect(normalizeAndFilterKeyword("  reparación  de   autos  ")).toBe("reparacion-de-autos");
  });

  it("acepta términos válidos", () => {
    expect(normalizeAndFilterKeyword("panaderia")).toBe("panaderia");
    expect(normalizeAndFilterKeyword("gasfiter")).toBe("gasfiter");
    expect(normalizeAndFilterKeyword("veterinaria")).toBe("veterinaria");
  });
});

describe("canOverwriteKeywordSource", () => {
  it("manual no puede ser sobrescrito por ai_feedback", () => {
    expect(canOverwriteKeywordSource("manual", "ai_feedback")).toBe(false);
  });

  it("manual no puede ser sobrescrito por seed", () => {
    expect(canOverwriteKeywordSource("manual", "seed")).toBe(false);
  });

  it("manual no puede ser sobrescrito por user_keyword", () => {
    expect(canOverwriteKeywordSource("manual", "user_keyword")).toBe(false);
  });

  it("ai_feedback sí puede ser reemplazado por manual", () => {
    expect(canOverwriteKeywordSource("ai_feedback", "manual")).toBe(true);
  });

  it("seed sí puede ser reemplazado por manual", () => {
    expect(canOverwriteKeywordSource("seed", "manual")).toBe(true);
  });

  it("user_keyword puede ser reemplazado por manual", () => {
    expect(canOverwriteKeywordSource("user_keyword", "manual")).toBe(true);
  });

  it("si no existe fila, se puede insertar cualquier source", () => {
    expect(canOverwriteKeywordSource(null, "manual")).toBe(true);
    expect(canOverwriteKeywordSource(undefined, "ai_feedback")).toBe(true);
  });
});

describe("constants", () => {
  it("NOISE_WORDS incluye la lista base de ruido", () => {
    expect(NOISE_WORDS.has("somos")).toBe(true);
    expect(NOISE_WORDS.has("lider")).toBe(true);
    expect(NOISE_WORDS.has("solucion")).toBe(true);
    expect(NOISE_WORDS.has("profesional")).toBe(true);
  });
  it("MAX_KEYWORD_LENGTH es 40", () => {
    expect(MAX_KEYWORD_LENGTH).toBe(40);
  });
  it("MIN_KEYWORD_LENGTH es 2", () => {
    expect(MIN_KEYWORD_LENGTH).toBe(2);
  });
});
