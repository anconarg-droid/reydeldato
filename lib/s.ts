export function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x !== null && x !== undefined)
    .map((x) => String(x).trim())
    .filter(Boolean);
}

/**
 * text[] / jsonb / JSON string desde PostgREST u otras capas (p. ej. `galeria_urls`).
 */
export function stringArrayFromUnknown(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => (x == null ? "" : String(x).trim()))
      .filter(Boolean);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .map((x) => (x == null ? "" : String(x).trim()))
            .filter(Boolean);
        }
      } catch {
        return [];
      }
      return [];
    }
    return [t];
  }
  return [];
}