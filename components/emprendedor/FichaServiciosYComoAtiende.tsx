import type { ComoAtiendeFlags } from "@/lib/emprendedorFichaUi";
import { comoAtiendeBadgeItems } from "@/lib/emprendedorFichaUi";

export default function FichaServiciosYComoAtiende({
  servicios,
  comoAtiende,
  mostrarListaServicios,
}: {
  servicios: string[];
  comoAtiende: ComoAtiendeFlags;
  /** Si false, no se muestran chips de rubros (solo “Cómo atiende” si aplica). */
  mostrarListaServicios: boolean;
}) {
  const lista = servicios.filter((x) => String(x).trim());
  const badges = comoAtiendeBadgeItems(comoAtiende);
  const hayServicios = mostrarListaServicios && lista.length > 0;

  if (!hayServicios && !badges.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 md:p-5 mb-5 shadow-sm ring-1 ring-slate-100">
      {hayServicios ? (
        <>
          <h2 className="m-0 mb-2 text-base font-black text-slate-900 tracking-tight">
            Servicios
          </h2>
          <div className="m-0 mb-3 flex flex-wrap gap-1.5">
            {lista.map((label, i) => (
              <span
                key={`${i}-${label}`}
                className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-[12px] font-semibold text-emerald-950"
              >
                {label}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {badges.length ? (
        <>
          {hayServicios ? (
            <div className="mb-2 border-t border-slate-100 pt-3">
              <h3 className="m-0 mb-2 text-sm font-black text-slate-800">Cómo atiende</h3>
              <ul className="m-0 flex flex-wrap gap-1.5 p-0 list-none">
                {badges.map((x) => (
                  <li
                    key={x.label}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-800"
                  >
                    <span className="text-[11px]" aria-hidden>
                      {x.emoji}
                    </span>
                    {x.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <h2 className="m-0 mb-2 text-base font-black text-slate-900 tracking-tight">
                Cómo atiende
              </h2>
              <ul className="m-0 flex flex-wrap gap-1.5 p-0 list-none">
                {badges.map((x) => (
                  <li
                    key={x.label}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-800"
                  >
                    <span className="text-[11px]" aria-hidden>
                      {x.emoji}
                    </span>
                    {x.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
