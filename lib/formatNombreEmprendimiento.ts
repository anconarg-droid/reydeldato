function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Capitaliza de forma simple (Title Case) para elevar el tono del copy.
 * Ej: "carniceria el novillo" -> "Carniceria El Novillo"
 */
export function formatNombreEmprendimiento(nombre: string): string {
  const t = s(nombre);
  if (!t) return "";
  return t
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

