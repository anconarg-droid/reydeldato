/** “Perfil completo incluye”: lista vertical bajo el panel derecho (incl. dirección con ✔ si viene en `items`). */
export default function FichaDestacados({ items }: { items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
      <p className="m-0 mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        Perfil completo incluye
      </p>
      <ul className="m-0 flex flex-col gap-1.5 p-0 list-none text-[13px] font-medium text-slate-700">
        {items.map((texto, i) => (
          <li key={`${i}-${texto}`} className="flex items-start gap-2">
            <span
              className="mt-0.5 shrink-0 text-emerald-600 font-bold leading-none w-4 text-center"
              aria-hidden
            >
              ✔
            </span>
            <span className="leading-snug">{texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
