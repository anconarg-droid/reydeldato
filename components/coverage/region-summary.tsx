import { MetricCard } from "@/components/ui/metric-card";

type RegionSummaryProps = {
  regionName: string;
  /** Comunas con emprendimientos (desde vw_resumen_regiones_apertura.comunas_con_emprendimientos) */
  activeCities: number;
  totalCities: number;
  openingCount?: number;
  /** Comunas sin cobertura (desde vista comunas_sin_cobertura) */
  noCoverageCount?: number;
  /** Porcentaje cobertura regional (desde vista porcentaje_cobertura_region). Si no se pasa, se calcula. */
  regionalPercentage?: number;
};

export function RegionSummary({
  regionName,
  activeCities,
  totalCities,
  openingCount = 0,
  noCoverageCount,
  regionalPercentage,
}: RegionSummaryProps) {
  const percentage =
    regionalPercentage != null && regionalPercentage >= 0
      ? Math.round(regionalPercentage)
      : totalCities > 0
        ? Math.round((activeCities / totalCities) * 100)
        : 0;
  const sinCobertura =
    noCoverageCount ?? Math.max(0, totalCities - activeCities - openingCount);

  const lines = [
    `${activeCities} de ${totalCities} comunas activas`,
    `${openingCount} comunas en apertura`,
    `${sinCobertura} comunas sin cobertura`,
    `${percentage}% cobertura regional`,
  ];

  return (
    <MetricCard
      title={regionName}
      lines={lines}
      percentage={percentage}
      progressVariant="progress"
    />
  );
}
