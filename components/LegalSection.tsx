import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  id?: string;
  /** Si el título comienza con "N. ", muestra el N separado (muted). */
  splitLeadingNumber?: boolean;
};

function splitTitulo(title: string): { n: string | null; t: string } {
  const raw = String(title ?? "").trim();
  const m = raw.match(/^(\d+)\.\s+(.*)$/);
  if (!m) return { n: null, t: raw };
  return { n: m[1], t: m[2] ?? "" };
}

export default function LegalSection({ title, children, id, splitLeadingNumber = false }: Props) {
  const parts = splitLeadingNumber ? splitTitulo(title) : { n: null, t: title };
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
        {parts.n ? (
          <span className="font-normal text-slate-500">{parts.n}. </span>
        ) : null}
        {parts.t}
      </h2>
      <div className="space-y-3 text-sm sm:text-[0.95rem] leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

