import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

type CityHeroProps = {
  cityName: string;
  region: string;
  businessCount: number;
  businessGoal: number;
  missingCategories: string[];
  rubrosVacios?: number;
  rubrosIncompletos?: number;
};

export function CityHero({
  cityName,
  region,
  businessCount,
  businessGoal,
  missingCategories,
  rubrosVacios = 0,
  rubrosIncompletos = 0,
}: CityHeroProps) {
  const percentage = businessGoal > 0 ? Math.round((businessCount / businessGoal) * 100) : 0;
  const missing = Math.max(0, businessGoal - businessCount);

  return (
    <Card className="rounded-2xl p-6 sm:p-10">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{region}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {cityName}
      </h1>
      <p className="mt-2 text-base text-gray-600">
        {businessCount} de {businessGoal} emprendimientos necesarios
      </p>
      {missing > 0 && (
        <p className="mt-1 text-sm font-medium text-gray-700">
          Faltan {missing} para abrir
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <ProgressBar percentage={Math.min(percentage, 100)} className="h-6" />
        </div>
        <span className="text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
          {percentage}%
        </span>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button href="/publicar" variant="primary">
          Publicar emprendimiento
        </Button>
        <Button href="/comunas-por-abrir" variant="secondary">
          Recomendar negocio
        </Button>
        <Button href="/comunas-por-abrir" variant="ghost">
          Ayudar a abrir
        </Button>
      </div>
    </Card>
  );
}
