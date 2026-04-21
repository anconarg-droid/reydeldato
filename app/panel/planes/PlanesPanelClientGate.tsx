"use client";

import dynamic from "next/dynamic";

/**
 * `ssr: false` solo es válido dentro de Client Components.
 * Aísla la carga de PlanesPanelClient para evitar fallos de Turbopack al prefetchear /panel/planes.
 */
const PlanesPanelClient = dynamic(() => import("./PlanesPanelClient"), {
  ssr: false,
  loading: () => (
    <div className="px-4 py-8">
      <p className="text-sm text-gray-600">Cargando planes…</p>
    </div>
  ),
});

export default function PlanesPanelClientGate({
  id,
  slug,
  pagoFlash,
}: {
  id: string;
  slug: string;
  pagoFlash?: "fallo" | null;
}) {
  return (
    <PlanesPanelClient
      key={`${id}:${slug}:${pagoFlash ?? ""}`}
      id={id}
      slug={slug}
      pagoFlash={pagoFlash ?? null}
    />
  );
}
