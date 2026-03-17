function Building2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

type CountryStatsProps = {
  comunasActivas: number;
  totalComunas: number;
};

export function CountryStats({ comunasActivas, totalComunas }: CountryStatsProps) {
  const porAbrir = Math.max(0, totalComunas - comunasActivas);

  return (
    <section className="text-center mb-12">
      <div className="inline-flex flex-col sm:flex-row items-center gap-8 p-8 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Building2Icon className="w-6 h-6 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#6B7280] uppercase tracking-wide">
            Estado en Chile
          </span>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-4xl font-bold text-[#16A34A]">{comunasActivas}</p>
            <p className="text-sm text-[#6B7280]">comunas activas</p>
          </div>
          <div className="w-px h-12 bg-[#E5E7EB]" />
          <div className="text-center">
            <p className="text-4xl font-bold text-[#111827]">{porAbrir}</p>
            <p className="text-sm text-[#6B7280]">por abrir</p>
          </div>
        </div>
      </div>
    </section>
  );
}
