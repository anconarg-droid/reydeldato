import { Card } from "./Card";
import { Button } from "./Button";
import { ProgressBar } from "./ProgressBar";

export type ComunaCardItem = {
  name: string;
  slug: string;
  status: "opening" | "no-coverage" | "active";
  businessCount: number;
  businessGoal: number;
};

type ComunaCardProps = {
  city: ComunaCardItem;
};

export function ComunaCard({ city }: ComunaCardProps) {
  const pct =
    city.businessGoal > 0
      ? Math.round((city.businessCount / city.businessGoal) * 100)
      : 0;
  const missing = Math.max(0, city.businessGoal - city.businessCount);
  const isActive = city.status === "active" || missing <= 0;
  const isOpening = city.status === "opening";

  const publicarHref = `/publicar?comuna=${encodeURIComponent(city.slug)}`;
  const verHref = `/buscar?comuna=${encodeURIComponent(city.slug)}`;

  return (
    <Card
      className={`flex flex-col transition-shadow hover:shadow-md ${
        isActive ? "border-[#16A34A]/30 bg-emerald-50/50" : isOpening ? "border-amber-200 bg-amber-50/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">{city.name}</h3>
        {isActive && (
          <span className="shrink-0 rounded-full bg-[#16A34A] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            ACTIVA
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <ProgressBar percentage={pct} />
        </div>
        <span className="w-12 shrink-0 text-right text-xl font-bold tabular-nums text-gray-900">
          {pct}%
        </span>
      </div>

      <p className="mt-2 text-sm tabular-nums text-gray-600">
        {city.businessCount} de {city.businessGoal} emprendimientos
      </p>
      <p className="mt-0.5 text-sm font-medium text-gray-700">
        {isActive ? "Comuna activa" : `Faltan ${missing} para abrir`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {isActive ? (
          <Button href={verHref} variant="primary">
            Ver emprendimientos
          </Button>
        ) : (
          <Button href={publicarHref} variant="primary">
            Publicar emprendimiento
          </Button>
        )}
        {!isActive && city.businessCount > 0 && (
          <Button href={verHref} variant="secondary">
            Ver emprendimientos
          </Button>
        )}
        <Button href="/cobertura" variant="ghost">
          Recomendar
        </Button>
      </div>
    </Card>
  );
}
