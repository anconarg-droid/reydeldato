export type EditarFocus = "fotos" | "descripcion" | "redes" | "categoria";

export const FOCUS_KEYS: EditarFocus[] = [
  "fotos",
  "descripcion",
  "redes",
  "categoria",
];

export function parseFocus(raw: string): EditarFocus | null {
  const v = raw.trim().toLowerCase();
  return FOCUS_KEYS.includes(v as EditarFocus) ? (v as EditarFocus) : null;
}
