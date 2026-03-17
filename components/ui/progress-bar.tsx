type ProgressBarProps = {
  percentage: number;
  variant?: "progress" | "warning" | "muted";
  height?: string;
  className?: string;
};

const variantBg = {
  progress: "bg-emerald-500",
  warning: "bg-amber-500",
  muted: "bg-slate-300",
};

export function ProgressBar({
  percentage,
  variant = "progress",
  height = "h-4",
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, percentage));
  const barClass = variantBg[variant];
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${height} ${className}`.trim()}
    >
      <div
        className={`h-full rounded-full transition-all ${barClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
