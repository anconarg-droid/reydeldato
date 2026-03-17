import { type ReactNode } from "react";

type SectionHeaderProps = {
  label?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function SectionHeader({
  label,
  title,
  subtitle,
  children,
}: SectionHeaderProps) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
      )}
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-2xl text-slate-600 sm:max-w-3xl">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
