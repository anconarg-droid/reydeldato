import { type ReactNode } from "react";
import { ProgressBar } from "./progress-bar";

type MetricCardProps = {
  title: string;
  /** Líneas de métrica: ej. "X de Y comunas activas" */
  lines?: string[];
  /** Porcentaje 0-100 para la barra (opcional) */
  percentage?: number;
  /** Color de la barra: progress (verde), warning (ámbar), muted (gris) */
  progressVariant?: "progress" | "warning" | "muted";
  className?: string;
  children?: ReactNode;
};

export function MetricCard({
  title,
  lines = [],
  percentage,
  progressVariant = "progress",
  className = "",
  children,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`.trim()}
    >
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {lines.map((line, i) => (
        <p
          key={i}
          className={
            i === 0
              ? "mt-1 text-2xl font-extrabold tabular-nums text-slate-900"
              : "mt-0.5 text-sm font-medium text-slate-600"
          }
        >
          {line}
        </p>
      ))}
      {percentage != null && (
        <div className="mt-4">
          <ProgressBar
            percentage={percentage}
            variant={progressVariant}
            height="h-3"
          />
        </div>
      )}
      {children}
    </div>
  );
}
