"use client";

type Props = {
  enabled: boolean;
  emprendedorId: string;
  slug: string;
  comunaSlug: string | null;
  localIndex: number | null;
  wazeHref: string;
  mapsHref: string;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function trackFichaPublicaMapaClick(payload: {
  event_type: "waze_click" | "maps_click";
  emprendedor_id: string;
  slug: string;
  comuna_slug: string | null;
  local_index: number | null;
}) {
  if (!payload.emprendedor_id.trim() || !payload.slug.trim()) return;
  try {
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_type: payload.event_type,
        emprendedor_id: payload.emprendedor_id,
        slug: payload.slug,
        comuna_slug: payload.comuna_slug,
        metadata: {
          source: "ficha_publica",
          local_index: payload.local_index,
        },
      }),
    }).catch(() => {});
  } catch {
    // best-effort only
  }
}

export default function MapasLocalesLinksTracked({
  enabled,
  emprendedorId,
  slug,
  comunaSlug,
  localIndex,
  wazeHref,
  mapsHref,
}: Props) {
  if (!enabled) return null;
  const empId = s(emprendedorId);
  const slugNorm = s(slug);
  const comuna = comunaSlug ? s(comunaSlug) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <a
        href={wazeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        onClick={() =>
          trackFichaPublicaMapaClick({
            event_type: "waze_click",
            emprendedor_id: empId,
            slug: slugNorm,
            comuna_slug: comuna,
            local_index: localIndex,
          })
        }
      >
        Abrir en Waze
      </a>
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        onClick={() =>
          trackFichaPublicaMapaClick({
            event_type: "maps_click",
            emprendedor_id: empId,
            slug: slugNorm,
            comuna_slug: comuna,
            local_index: localIndex,
          })
        }
      >
        Ver en Maps
      </a>
    </div>
  );
}

