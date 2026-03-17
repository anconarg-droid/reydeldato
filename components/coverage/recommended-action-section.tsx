import { SectionCard } from "@/components/ui/section-card";

type RecommendedActionSectionProps = {
  rubrosVacios: number;
  rubrosIncompletos: number;
  rubrosCompletos: number;
  missingToGoal: number;
};

/**
 * Devuelve el mensaje de prioridad según el estado de la comuna (datos reales).
 */
function getRecommendedMessage({
  rubrosVacios,
  rubrosIncompletos,
  rubrosCompletos,
  missingToGoal,
}: RecommendedActionSectionProps): string {
  const muchosVacios = rubrosVacios >= 4 || (rubrosVacios > 0 && rubrosVacios >= rubrosIncompletos);
  const cercaDeMeta = missingToGoal > 0 && missingToGoal <= 15;
  const variosEnAvance = rubrosIncompletos >= 3 && rubrosVacios < rubrosIncompletos;

  if (muchosVacios) {
    return "Prioridad: captar negocios en rubros vacíos";
  }
  if (cercaDeMeta) {
    return "Prioridad: acelerar captación final para activar la comuna";
  }
  if (variosEnAvance) {
    return "Prioridad: cerrar rubros incompletos para destrabar la apertura";
  }
  return "Prioridad: construir base mínima de emprendimientos";
}

export function RecommendedActionSection(props: RecommendedActionSectionProps) {
  const message = getRecommendedMessage(props);

  return (
    <SectionCard className="p-5 sm:p-6">
      <h3 className="text-lg font-bold text-slate-900">
        Acción recomendada para abrir esta comuna
      </h3>
      <p className="mt-2 font-medium text-slate-700">
        {message}
      </p>
    </SectionCard>
  );
}
