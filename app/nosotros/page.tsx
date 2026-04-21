import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

export default function NosotrosPage() {
  return (
    <LegalLayout title="Sobre nosotros">
      <LegalSection title="Qué hacemos">
        <p>
          Rey del Dato es una plataforma digital que conecta personas con servicios locales, facilitando una búsqueda
          clara, ordenada y confiable.
        </p>
        <p>
          Nuestro objetivo es reemplazar las recomendaciones informales por un sistema estructurado donde encontrar
          servicios sea rápido y transparente.
        </p>
      </LegalSection>

      <LegalSection title="Datos de la empresa">
        <ul className="list-disc pl-5 space-y-2">
          <li>Razón social: Rey del Dato SpA</li>
          <li>RUT: 78.403.835-1</li>
          <li>Domicilio: Padre Hurtado, Chile</li>
          <li>
            Email:{" "}
            <a className="underline underline-offset-2" href="mailto:contacto@reydeldato.cl">
              contacto@reydeldato.cl
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
