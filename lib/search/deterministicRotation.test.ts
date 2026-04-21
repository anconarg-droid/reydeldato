import { afterEach, describe, expect, it, vi } from "vitest";
import {
  rotateDeterministic,
  rotateDeterministicPhotoBuckets,
  rotationSeed,
  SEARCH_ROTATION_WINDOW_MS,
} from "./deterministicRotation";

describe("rotateDeterministic", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("dentro del mismo bucket de 5 min el orden es idéntico", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T12:03:00.000Z"));
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const key = (x: { id: string }) => x.id;
    const first = rotateDeterministic(items, key, SEARCH_ROTATION_WINDOW_MS, "ns");
    vi.setSystemTime(new Date("2026-04-03T12:04:59.000Z"));
    const second = rotateDeterministic(items, key, SEARCH_ROTATION_WINDOW_MS, "ns");
    expect(first.map((x) => x.id)).toEqual(second.map((x) => x.id));
  });

  it("al avanzar un bucket el seed incrementa y el orden suele cambiar", () => {
    vi.useFakeTimers();
    const t0 = new Date("2026-04-03T12:00:00.000Z").getTime();
    vi.setSystemTime(t0);
    const s0 = rotationSeed(SEARCH_ROTATION_WINDOW_MS);
    vi.setSystemTime(t0 + SEARCH_ROTATION_WINDOW_MS);
    const s1 = rotationSeed(SEARCH_ROTATION_WINDOW_MS);
    expect(s1).toBe(s0 + 1);

    vi.setSystemTime(t0);
    const o0 = rotateDeterministic(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      (x) => x.id,
      SEARCH_ROTATION_WINDOW_MS,
      "x",
    )
      .map((x) => x.id)
      .join(",");
    vi.setSystemTime(t0 + SEARCH_ROTATION_WINDOW_MS);
    const o1 = rotateDeterministic(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      (x) => x.id,
      SEARCH_ROTATION_WINDOW_MS,
      "x",
    )
      .map((x) => x.id)
      .join(",");
    expect(o0).not.toBe(o1);
  });

  it("namespace distinto produce orden distinto con mismos items y tiempo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    const items = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const key = (x: { id: string }) => x.id;
    const o1 = rotateDeterministic(items, key, SEARCH_ROTATION_WINDOW_MS, "A").map(
      (x) => x.id,
    );
    const o2 = rotateDeterministic(items, key, SEARCH_ROTATION_WINDOW_MS, "B").map(
      (x) => x.id,
    );
    expect(o1.join()).not.toBe(o2.join());
  });

  it("photo buckets: con foto siempre antes que sin foto; rotación separada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    const items = [
      { id: "a", foto: true },
      { id: "b", foto: false },
      { id: "c", foto: true },
      { id: "d", foto: false },
    ];
    const out = rotateDeterministicPhotoBuckets(
      items,
      (x) => x.id,
      (x) => x.foto,
      SEARCH_ROTATION_WINDOW_MS,
      "test:block",
    );
    const idx = (id: string) => out.findIndex((x) => x.id === id);
    expect(idx("a")).toBeLessThan(idx("b"));
    expect(idx("c")).toBeLessThan(idx("b"));
    expect(idx("a")).toBeLessThan(idx("d"));
    expect(idx("c")).toBeLessThan(idx("d"));
  });
});
