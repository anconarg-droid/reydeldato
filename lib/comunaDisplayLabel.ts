import { getRegionShort } from "@/utils/regionShort";

/** Etiqueta única: "Valdivia — Los Ríos" (o nombre corto de región cuando aplica). */
export function comunaLabelNombreYRegion(
  nombreComuna: string,
  regionNombreCompleto?: string | null
): string {
  const n = String(nombreComuna ?? "").trim();
  const regFull = String(regionNombreCompleto ?? "").trim();
  if (!n) return regFull;
  if (!regFull) return n;
  const short = getRegionShort(regFull);
  const regionBit = (short || regFull).trim();
  return `${n} — ${regionBit}`;
}
