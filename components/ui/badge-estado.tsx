type Estado = "activa" | "en_apertura" | "sin_cobertura";

type BadgeEstadoProps = {
  estado: Estado;
  className?: string;
};

const labels: Record<Estado, string> = {
  activa: "Activa",
  en_apertura: "En apertura",
  sin_cobertura: "Sin cobertura",
};

const classes: Record<Estado, string> = {
  activa: "bg-emerald-100 text-emerald-800 border-emerald-200",
  en_apertura: "bg-amber-100 text-amber-800 border-amber-200",
  sin_cobertura: "bg-slate-100 text-slate-600 border-slate-200",
};

export function BadgeEstado({ estado, className = "" }: BadgeEstadoProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes[estado]} ${className}`.trim()}
    >
      {labels[estado]}
    </span>
  );
}
