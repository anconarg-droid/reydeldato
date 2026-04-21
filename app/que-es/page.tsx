import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

export default function QueEsPage() {
  return (
    <LegalLayout title="Qué es Rey del Dato" lastUpdated="Abril 2026">
      <div className="space-y-3 text-sm sm:text-[0.95rem] leading-relaxed text-slate-700">
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

      <LegalSection title="Cómo funciona">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Buscas lo que necesitas</li>
          <li>Ves servicios en tu comuna</li>
          <li>Contactas directo por WhatsApp</li>
        </ol>
      </LegalSection>
    </LegalLayout>
  );
}
