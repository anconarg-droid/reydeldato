/**
 * URLs que pueden guardarse en BD como foto principal.
 * Excluye blob:, placeholders conocidos y cadenas vacías.
 */
export function isPersistibleFotoUrl(value?: string | null): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return false;
  if (v.startsWith("blob:")) return false;
  if (v.includes("placehold.co")) return false;
  if (v.includes("placeholder")) return false;
  return true;
}
