import { direccionIncluyeComuna } from "@/lib/maps";

function trimStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Texto único para geocodificar un local: **solo** calle, comuna, región y Chile.
 * No incluye referencia ni textos libres (“cerca de…”). Evita repetir la comuna si ya
 * va en la dirección (misma heurística que enlaces de mapa).
 */
export function buildGeocodingLineaDireccionLocal(input: {
  direccion: string;
  comuna: string;
  region: string;
}): string | null {
  const d = trimStr(input.direccion);
  if (!d) return null;

  const parts: string[] = [d];
  const c = trimStr(input.comuna);
  if (c && !direccionIncluyeComuna(d, c)) {
    parts.push(c);
  }
  const r = trimStr(input.region);
  if (r) {
    parts.push(r);
  }
  parts.push("Chile");
  return parts.join(", ");
}

export type GeocodeDireccionLocalInput = {
  direccion: string;
  comuna: string;
  region: string;
};

/**
 * Resuelve `lat`/`lng` para un local. Hoy devuelve `null` (sin proveedor).
 *
 * **Pendiente para producción:** llamar a un proveedor (p. ej. Google Geocoding API,
 * Mapbox Geocoding, Nominatim con política de uso) usando `buildGeocodingLineaDireccionLocal`,
 * manejar cuotas/errores, y opcionalmente cachear por hash de la línea.
 */
export async function geocodeDireccionLocal(
  input: GeocodeDireccionLocalInput
): Promise<{ lat: number; lng: number } | null> {
  const _linea = buildGeocodingLineaDireccionLocal(input);
  // TODO: si !_linea return null; si _linea, POST/GET al proveedor con API key en env.
  void _linea;
  return null;
}
