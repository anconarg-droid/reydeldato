import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function LegalSection({ title, children }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm sm:text-[0.95rem] leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

