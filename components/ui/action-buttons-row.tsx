import Link from "next/link";
import { type ReactNode } from "react";

type ButtonConfig = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "accent";
};

type ActionButtonsRowProps = {
  buttons: ButtonConfig[];
  /** Para renderizar elementos custom (ej. otro Link) */
  children?: ReactNode;
  className?: string;
};

const variantClasses = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base",
  secondary:
    "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base",
  accent:
    "inline-flex items-center justify-center rounded-lg border-2 border-sky-500 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base",
};

export function ActionButtonsRow({
  buttons,
  children,
  className = "",
}: ActionButtonsRowProps) {
  return (
    <div className={`flex flex-wrap gap-2 sm:gap-4 ${className}`.trim()}>
      {buttons.map((b) => (
        <Link key={b.href + b.label} href={b.href} className={variantClasses[b.variant]}>
          {b.label}
        </Link>
      ))}
      {children}
    </div>
  );
}
