type ProgressBarProps = {
  percentage: number;
  className?: string;
};

/** Barra de progreso del design system. Color success #10B981, radius redondeado. */
export function ProgressBar({ percentage, className = "" }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <div
      className={`h-4 w-full overflow-hidden rounded-full bg-gray-100 ${className}`.trim()}
    >
      <div
        className="h-full rounded-full bg-[#10B981] transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
