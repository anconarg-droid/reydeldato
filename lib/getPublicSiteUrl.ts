/**
 * URL base absoluta del sitio (canonical, compartir, JSON-LD, fetch server→server).
 *
 * Orden:
 * 1. `NEXT_PUBLIC_SITE_URL` — en Vercel/prod y opcional en `.env.local` (p. ej. URL de producción
 *    mientras desarrollás) para que “Compartir” no use `localhost`.
 * 2. En el **navegador**, si no hay (1): `window.location.origin` (útil en preview local).
 * 3. En el **servidor**, si no hay (1): `VERCEL_URL` (deploy en Vercel).
 * 4. `http://localhost:3000` — desarrollo local sin las anteriores.
 */
export function getPublicSiteUrl(): string {
  const custom = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "").trim();
  if (custom) return custom;

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`.replace(/\/+$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
