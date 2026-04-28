import LegalLayout from "@/components/LegalLayout";

export default function QueEsPage() {
  return (
    <LegalLayout title="Qué es Rey del Dato" lastUpdated="Abril 2026">
      <div className="space-y-5 text-sm sm:text-[0.95rem] leading-[1.7] text-slate-700">
        <p>
          Rey del Dato es un directorio local donde puedes encontrar servicios reales en tu comuna y contactarlos
          directamente por WhatsApp.
        </p>
        <p>
          No hay intermediarios ni rankings pagados. Esto no es publicidad: es un directorio local
          basado en tu búsqueda y tu comuna.
        </p>
        <p>
          Hoy encontrar servicios suele ser desordenado: grupos de WhatsApp, publicaciones que se pierden, datos viejos
          o resultados dominados por publicidad. Rey del Dato busca ordenar esa información y hacerla útil.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] sm:text-base font-medium text-slate-900">Cómo funciona</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-[24px] leading-none text-muted-foreground">1</div>
            <div className="mt-2 font-medium text-slate-900">Buscas lo que necesitas</div>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-[24px] leading-none text-muted-foreground">2</div>
            <div className="mt-2 font-medium text-slate-900">Ves servicios en tu comuna</div>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-[24px] leading-none text-muted-foreground">3</div>
            <div className="mt-2 font-medium text-slate-900">Contactas directo por WhatsApp</div>
          </div>
        </div>
      </section>
    </LegalLayout>
  );
}
