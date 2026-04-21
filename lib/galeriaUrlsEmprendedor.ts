import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { stringArrayFromUnknown } from "@/lib/s";

function urlFromGaleriaItem(item: unknown): string {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "object" && !Array.isArray(item)) {
    const o = item as Record<string, unknown>;
    const u = o.url ?? o.imagen_url ?? o.src;
    if (typeof u === "string") return u.trim();
  }
  return String(item).trim();
}

/**
 * Expande `galeria_urls` tal como puede venir de PostgREST/jsonb:
 * `string[]`, JSON string, u objetos `{ url }` (legacy).
 */
export function expandGaleriaUrlList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of raw) {
      const u = urlFromGaleriaItem(x);
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
      if (out.length >= 8) break;
    }
    return out;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const parsed = JSON.parse(t) as unknown;
        return expandGaleriaUrlList(parsed);
      } catch {
        return [];
      }
    }
    return [t];
  }
  return stringArrayFromUnknown(raw).slice(0, 8);
}

/**
 * URLs para `emprendedor_galeria` al aprobar: extras persistibles, sin duplicar la foto principal.
 * Misma idea que el preview en moderación/panel (galería ≠ portada).
 */
export function galeriaUrlsForEmprendedorPivotSync(
  raw: unknown,
  fotoPrincipalUrl?: string | null
): string[] {
  const fp = String(fotoPrincipalUrl ?? "").trim();
  const expanded = expandGaleriaUrlList(raw);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of expanded) {
    if (!isPersistibleFotoUrl(u)) continue;
    if (fp && u === fp) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 8) break;
  }
  return out;
}
