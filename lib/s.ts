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