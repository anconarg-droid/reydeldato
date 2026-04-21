import type { ComoAtiendeFlags } from "@/lib/emprendedorFichaUi";
import { comoAtiendeBadgeItems } from "@/lib/emprendedorFichaUi";

export default function FichaComoAtiende({
  flags,
  variant = "section",
}: {
  flags: ComoAtiendeFlags;
  variant?: "section" | "panel";
}) {
  const items = comoAtiendeBadgeItems(flags);

  if (variant === "panel") {
    if (!items.length) {
      return (
        <p className="m-0 text-[13px] text-slate-500 leading-snug">
          Modalidad de atención no indicada en la ficha.
        </p>
      );
    }
    return (
      <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
        {items.map((x) => (
          <li
            key={x.label}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-50/80 px-2.5 py-1.5 text-[13px] font-semibold text-amber-950"
          >
            <span aria-hidden>{x.emoji}</span>
            {x.label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 mb-6">
      <h2 className="m-0 mb-4 text-xl font-black text-slate-900">Cómo atiende</h2>
      {items.length ? (
        <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
          {items.map((x) => (
            <li
              key={x.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <span aria-hidden>{x.emoji}</span>
              {x.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-slate-500">
          Este negocio no ha indicado modalidades de atención en su ficha.
        </p>
      )}
    </div>
  );
}
