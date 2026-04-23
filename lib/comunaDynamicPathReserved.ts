/**
 * Evita que `app/[comuna]/page.tsx` interprete como comuna rutas que son recursos estáticos
 * o favicons cuando el archivo no existe en `/public` y Next enruta al segmento dinámico.
 */
export function segmentoUrlPareceRecursoEstaticoOReservado(segmentRaw: string): boolean {
  const t = String(segmentRaw ?? "").trim().toLowerCase();
  if (!t) return true;
  if (t.startsWith(".")) return true;
  if (/\.(png|jpe?g|gif|svg|webp|ico|txt|xml|json|webmanifest|map|css|js|wasm|woff2?)$/i.test(t)) {
    return true;
  }
  const exact = new Set([
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "manifest.json",
    "manifest.webmanifest",
  ]);
  if (exact.has(t)) return true;
  if (t === "icon" || t.startsWith("icon-") || t.startsWith("apple-icon")) return true;
  return false;
}
