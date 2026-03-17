import { SectionCard } from "@/components/ui/section-card";
import { ProgressBar } from "@/components/ui/progress-bar";

type Category = {
  name: string;
  registered: number;
  goal: number;
};

type CategoriesNeededProps = {
  cityName: string;
  categories: Category[];
};


type RubroEstado = "vacío" | "en_avance" | "completo";

function getEstado(registered: number, missing: number): RubroEstado {
  if (registered === 0) return "vacío";
  if (missing <= 0) return "completo";
  return "en_avance";
}

function progressVariant(pct: number): "progress" | "warning" | "muted" {
  if (pct >= 100) return "progress";
  if (pct > 0) return "warning";
  return "muted";
}

function estadoBadgeClass(estado: RubroEstado): string {
  if (estado === "completo") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "en_avance") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function CategoriesNeeded({ cityName, categories }: CategoriesNeededProps) {
  const completos = categories.filter((c) => c.registered >= c.goal).length;
  const vacios = categories.filter((c) => c.registered === 0).length;
  const incompletos = categories.filter((c) => c.registered > 0 && c.registered < c.goal).length;

  return (
    <SectionCard className="sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
        Rubros necesarios para abrir {cityName}
      </h2>
      <p className="mt-2 text-slate-600">
        Registrados vs meta. Faltan negocios en los rubros incompletos.
      </p>
      {categories.length > 0 && (
        <p className="mt-2 text-sm font-medium text-slate-700">
          {completos} rubros completos · {incompletos} incompletos · {vacios} vacíos
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {categories.map((cat) => {
          const pct = cat.goal > 0 ? Math.round((cat.registered / cat.goal) * 100) : 0;
          const missing = Math.max(0, cat.goal - cat.registered);
          const estado = getEstado(cat.registered, missing);
          return (
            <li
              key={cat.name}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadgeClass(estado)}`}
                  >
                    {estado === "vacío" ? "Vacío" : estado === "en_avance" ? "En avance" : "Completo"}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-slate-600">
                    {cat.registered} / {cat.goal}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <ProgressBar percentage={pct} variant={progressVariant(pct)} height="h-3" />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-slate-700">
                  {pct}%
                </span>
              </div>
              {missing > 0 && (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  Faltan {missing} negocio{missing !== 1 ? "s" : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
