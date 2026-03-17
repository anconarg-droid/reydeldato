import { SectionTitle } from "@/components/ui/SectionTitle";
import { ComunaCard, type ComunaCardItem } from "@/components/ui/comuna-card";

export type CityItem = ComunaCardItem;

type CitySectionProps = {
  label?: string;
  title: string;
  subtitle?: string;
  cities: CityItem[];
};

export function CitySection({ label, title, subtitle, cities }: CitySectionProps) {
  return (
    <section className="space-y-6">
      {label && <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>}
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cities.map((city) => (
          <ComunaCard key={city.slug || city.name} city={city} />
        ))}
      </div>
    </section>
  );
}
