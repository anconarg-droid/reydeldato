import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";

/** Normaliza para comparar si la dirección ya menciona la comuna (sin acentos, minúsculas, espacios). */
function foldMapText(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True si la dirección ya contiene el nombre de la comuna (evita duplicar en el query).
 */
export function direccionIncluyeComuna(
  direccion: string,
  comuna: string
): boolean {
  const c = foldMapText(comuna);
  const d = foldMapText(direccion);
  if (!c || !d) return false;
  return d.includes(c);
}

/**
 * Texto plano del query para Maps/Waze: solo calle/dirección, comuna si falta en la calle, y Chile.
 * No usa referencia ni textos libres.
 */
export function buildMapsQueryPlainText(
  direccion: string | null | undefined,
  comuna: string | null | undefined
): string | null {
  const d = String(direccion ?? "").trim();
  if (!d) return null;

  const c = String(comuna ?? "").trim();
  let base: string;
  if (!c) {
    base = d;
  } else if (direccionIncluyeComuna(d, c)) {
    base = d;
  } else {
    base = `${d}, ${c}`;
  }
  return `${base}, Chile`;
}

/** Par lat/lng válido para enlaces de mapas (WGS84). */
export function parseMapsGeoPair(
  lat: unknown,
  lng: unknown
): { lat: number; lng: number } | null {
  const la =
    typeof lat === "number" && Number.isFinite(lat)
      ? lat
      : parseFloat(String(lat ?? "").replace(",", "."));
  const lo =
    typeof lng === "number" && Number.isFinite(lng)
      ? lng
      : parseFloat(String(lng ?? "").replace(",", "."));
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lng: lo };
}

/**
 * Enlaces para Google Maps y Waze.
 *
 * - **Google:** con `lat`/`lng` válidos → `dir/?api=1&destination=lat,lng`; si no → búsqueda
 *   con texto limpio (`buildMapsQueryPlainText`).
 * - **Waze:** con coords → `ul?ll=lat,lng&navigate=yes`; si no → `q` + texto limpio + `navigate=yes`.
 */
export function buildMapsLinks(
  direccion?: string | null,
  comuna?: string | null,
  lat?: number | string | null,
  lng?: number | string | null
): { google: string; waze: string } | null {
  const plain = buildMapsQueryPlainText(direccion, comuna);
  if (!plain) return null;

  const query = encodeURIComponent(plain);
  const geo = parseMapsGeoPair(lat, lng);

  const google = geo
    ? `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  const waze = geo
    ? `https://www.waze.com/ul?ll=${geo.lat},${geo.lng}&navigate=yes`
    : `https://www.waze.com/ul?q=${query}&navigate=yes`;

  return { google, waze };
}

/** True si el negocio declara atención con local físico (tabla `emprendedor_modalidades`). */
export function emprendedorTieneModalidadLocalFisico(
  modalidades?: string[] | null
): boolean {
  if (!modalidades?.length) return false;
  return modalidadesAtencionInputsToDbUnique(modalidades.map(String)).includes(
    "local_fisico"
  );
}
