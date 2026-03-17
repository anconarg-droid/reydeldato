import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ComunaHeroActivityButtons } from "@/components/coverage/ComunaHeroActivityButtons";

const SITE_URL = "https://reydeldato.cl";

type ComunaHeroV0Props = {
  cityName: string;
  region: string;
  comunaSlug: string;
  registrados: number;
  meta: number;
  /** Suma de contributors + invites + shares para "personas ayudando" */
  peopleHelping?: number;
  /** Si la comuna está activa (tabla comunas o meta alcanzada) */
  isActive?: boolean;
};

export function ComunaHeroV0({
  cityName,
  region,
  comunaSlug,
  registrados,
  meta,
  peopleHelping = 0,
  isActive: isActiveProp,
}: ComunaHeroV0Props) {
  const faltan = Math.max(0, meta - registrados);
  const porcentaje = meta > 0 ? Math.round((registrados / meta) * 100) : 0;
  const comunaDisplay = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
  const isActive = isActiveProp ?? (registrados >= meta && meta > 0);

  const publicarHref = `/publicar?comuna=${encodeURIComponent(comunaSlug)}`;
  const verEmprendimientosHref = `/buscar?comuna=${encodeURIComponent(comunaSlug)}`;
  const comunaUrl = `${SITE_URL}/cobertura?comuna=${encodeURIComponent(comunaSlug)}`;
  const whatsappText = `Estamos abriendo ${comunaDisplay} en Rey del Dato. Si tienes un emprendimiento regístralo aquí: ${comunaUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <section className="text-center mb-16 md:mb-20">
      <div className="mb-3">
        <span className="text-sm font-medium text-[#6B7280] tracking-wide uppercase">
          {region}
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-medium text-[#6B7280] mb-2">
        {isActive ? "Comuna activa" : "Ayuda a abrir"}
      </h1>
      <p className="text-5xl md:text-7xl font-bold text-[#111827] tracking-tight mb-6">
        {comunaDisplay}
      </p>

      {isActive ? (
        <p className="text-xl md:text-2xl text-[#16A34A] font-semibold mb-10">
          {comunaDisplay} ya está activa en Rey del Dato
        </p>
      ) : (
        <>
          <p className="text-xl md:text-2xl text-[#6B7280] mb-1">
            {registrados} emprendimientos registrados
          </p>
          <p className="text-lg text-[#6B7280] mb-2">
            {faltan} para abrir
          </p>
          <p className="text-base text-[#6B7280] mb-10">
            Cada registro acerca a {comunaDisplay} a activarse.
          </p>
        </>
      )}

      <Card className="max-w-xl mx-auto mb-12 bg-white border border-[#E5E7EB] shadow-sm p-6 rounded-2xl">
        <p className="text-sm font-medium text-[#6B7280] uppercase tracking-wide mb-4 text-center">
          Progreso hacia la meta
        </p>
        <div className="h-5 bg-[#F3F4F6] rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[#16A34A] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-[#F9FAFB]">
            <p className="text-2xl font-bold text-[#111827]">{registrados}</p>
            <p className="text-xs text-[#6B7280] font-medium">registrados</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-2xl font-bold text-amber-600">{faltan}</p>
            <p className="text-xs text-amber-700 font-medium">faltan</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#F9FAFB]">
            <p className="text-2xl font-bold text-[#111827]">{meta}</p>
            <p className="text-xs text-[#6B7280] font-medium">meta</p>
          </div>
        </div>
      </Card>

      <p className="text-base text-[#6B7280] mb-8">
        👥 {peopleHelping} personas ayudando a abrir {comunaDisplay}
      </p>

      <div className="flex flex-col items-center gap-4">
        {isActive ? (
          <Button href={verEmprendimientosHref} variant="primary" className="w-full sm:w-auto gap-2 text-base px-8 py-3 h-auto">
            Ver emprendimientos en {comunaDisplay}
          </Button>
        ) : (
          <Button href={publicarHref} variant="primary" className="w-full sm:w-auto gap-2 text-base px-8 py-3 h-auto">
            Publicar mi emprendimiento
          </Button>
        )}
        <ComunaHeroActivityButtons comunaSlug={comunaSlug} whatsappHref={whatsappHref} />
      </div>
    </section>
  );
}
