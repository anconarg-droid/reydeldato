import { type ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  /** Fondo suave (panel) en lugar de blanco */
  variant?: "default" | "panel";
  className?: string;
};

const base =
  "rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
const panel = "rounded-xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm sm:p-8";

export function SectionCard({
  children,
  variant = "default",
  className = "",
}: SectionCardProps) {
  return (
    <section className={`${variant === "panel" ? panel : base} ${className}`.trim()}>
      {children}
    </section>
  );
}
