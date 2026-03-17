import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

const META_NEGOCIOS = 50;

type ComunaHeroProps = {
  cityName: string;
  region: string;
  comunaSlug: string;
  businessCount: number;
  businessGoal: number;
  regionSlug: string | null;
  /** Mini línea: X de Y comunas activas en región */
  regionActive?: number;
  regionTotal?: number;
  regionEnApertura?: number;
};

export function ComunaHero({
  cityName,
  region,
  comunaSlug,
  businessCount,
  businessGoal,
  regionSlug,
  regionActive = 0,
  regionTotal = 0,
  regionEnApertura = 0,
}: ComunaHeroProps) {
  const percentage = businessGoal > 0 ? Math.round((businessCount / businessGoal) * 100) : 0;
  const missing = Math.max(0, businessGoal - businessCount);
  const isActive = missing <= 0;

  const publicarHref = `/publicar?comuna=${encodeURIComponent(comunaSlug)}`;
  const verRegionHref = regionSlug
    ? `/cobertura?region=${encodeURIComponent(regionSlug)}`
    : "/cobertura";

  return (
    <Card className="rounded-2xl border-[#E5E7EB] bg-[#FFFFFF] p-8 shadow-sm sm:p-10">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">{region}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
        {cityName}
      </h1>

      <p className="mt-3 text-lg font-semibold text-[#111827]">
        {businessCount} de {businessGoal} emprendimientos
      </p>
      <p className="mt-0.5 text-base text-[#6B7280]">
        {isActive
          ? "Esta comuna ya está activa en Rey del Dato"
          : `Faltan ${missing} para abrir esta comuna`}
      </p>

      <div className="mt-5 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <ProgressBar percentage={Math.min(percentage, 100)} className="h-5 sm:h-6" />
        </div>
        <span className="text-2xl font-bold tabular-nums text-[#111827] sm:text-3xl">
          {percentage}%
        </span>
      </div>
      <p className="mt-1.5 text-xs text-[#9CA3AF]">
        Meta: {META_NEGOCIOS} negocios locales para activar la comuna
      </p>

      {(regionTotal > 0 || regionEnApertura > 0) && (
        <p className="mt-3 text-xs text-[#9CA3AF]">
          {regionTotal > 0 && (
            <span>{regionActive} de {regionTotal} comunas activas en {region}</span>
          )}
          {regionTotal > 0 && regionEnApertura > 0 && " · "}
          {regionEnApertura > 0 && (
            <span>{regionEnApertura} en proceso de apertura</span>
          )}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={publicarHref} variant="primary">
          Publicar mi emprendimiento
        </Button>
        <a
          href="#ayuda-abrir"
          className="inline-flex items-center justify-center rounded-[10px] border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors"
        >
          Invitar emprendedores
        </a>
        <Button href={verRegionHref} variant="ghost">
          Ver comunas de esta región
        </Button>
      </div>
    </Card>
  );
}
