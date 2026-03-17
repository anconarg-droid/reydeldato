import Link from "next/link";

export type RubroApertura = {
  comuna_slug: string;
  comuna_nombre: string | null;
  region_nombre: string | null;
  subcategoria_slug: string;
  subcategoria_nombre: string | null;
  prioridad: string | null;
  objetivo: number | null;
  registrados: number | null;
  faltan: number | null;
  porcentaje: number | null;
};

type Props = {
  rubros: RubroApertura[];
  comunaSlug: string;
  comunaNombre: string;
};

function progressPct(registrados: number, objetivo: number): number {
  if (objetivo <= 0) return 0;
  return Math.min(100, Math.round((Number(registrados) / Number(objetivo)) * 100));
}

export default function DetalleRubrosComuna({ rubros, comunaSlug, comunaNombre }: Props) {
  if (!rubros.length) {
    return (
      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
        <p className="text-xs text-slate-600">
          No hay rubros de apertura definidos para esta comuna.
        </p>
      </div>
    );
  }

  const principales = rubros.filter((r) => (r.prioridad || "").toLowerCase() === "principal");
  const otros = rubros.filter((r) => (r.prioridad || "").toLowerCase() !== "principal");

  const renderRow = (r: RubroApertura) => {
    const obj = Number(r.objetivo ?? 0);
    const reg = Number(r.registrados ?? 0);
    const falt = Number(r.faltan ?? 0);
    const pct = r.porcentaje != null ? Number(r.porcentaje) : progressPct(reg, obj);
    const nombre = r.subcategoria_nombre || r.subcategoria_slug || "Rubro";
    const faltanText = falt === 1 ? "falta 1" : `faltan ${falt}`;
    return (
      <li
        key={r.subcategoria_slug}
        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold text-slate-900">{nombre}</span>
          <span className="text-2xl font-extrabold tabular-nums text-slate-900">
            {pct}%
          </span>
        </div>
        <p className="text-sm text-slate-600 tabular-nums">
          {reg} de {obj} registrados
          {falt > 0 && (
            <span className="ml-1.5 text-slate-500">· {faltanText}</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <div className="h-4 flex-1 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(pct, 100))}%`,
                backgroundColor: "#22c55e",
              }}
            />
          </div>
        </div>
        {falt > 0 && (
          <p className="text-xs text-slate-500">
            ¿Conoces un negocio de este rubro?{" "}
            <Link
              href={`/abrir-comuna/${encodeURIComponent(comunaSlug)}`}
              className="font-semibold underline"
              style={{ color: "#2563eb" }}
            >
              Recomiéndalo.
            </Link>
          </p>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">
        Rubros necesarios para abrir {comunaNombre}
      </h3>
      <p className="text-sm text-slate-600">
        Estos rubros todavía necesitan más emprendimientos registrados. Si conoces uno, recomiéndalo.
      </p>
      {principales.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-800">Rubros principales</h4>
          <ul className="space-y-2">{principales.map(renderRow)}</ul>
        </div>
      )}
      {otros.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-800">Otros rubros</h4>
          <ul className="space-y-2">{otros.map(renderRow)}</ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
        <Link
          href={`/publicar?comuna=${encodeURIComponent(comunaSlug)}`}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: "#2563eb" }}
        >
          Publicar mi emprendimiento
        </Link>
        <Link
          href={`/abrir-comuna/${encodeURIComponent(comunaSlug)}`}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Recomendar un negocio de esta comuna
        </Link>
      </div>
    </div>
  );
}
