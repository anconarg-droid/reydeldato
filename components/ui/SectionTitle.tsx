type SectionTitleProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

/** Título de sección H2 + opcional subtítulo. Design system tipografía. */
export function SectionTitle({
  title,
  subtitle,
  className = "",
}: SectionTitleProps) {
  return (
    <div className={className.trim()}>
      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}
