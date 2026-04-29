import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

export default function LegalPage() {
  return (
    <LegalLayout title="Información legal" lastUpdated="Abril 2026">
      <LegalSection title="1. Titular del sitio">
        <p>Rey del Dato es una plataforma de directorio de emprendimientos y negocios locales.</p>
        <p>
          Para contacto general, escríbenos a{" "}
          <a className="underline underline-offset-2" href="mailto:contacto@reydeldato.cl">
            contacto@reydeldato.cl
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Propiedad intelectual">
        <p>
          El diseño, textos y componentes propios del sitio están protegidos por las leyes aplicables. Las marcas y
          contenidos de terceros pertenecen a sus respectivos titulares.
        </p>
      </LegalSection>

      <LegalSection title="3. Enlaces a terceros">
        <p>
          El sitio puede incluir enlaces a sitios externos (por ejemplo, redes sociales o WhatsApp). No controlamos
          esos sitios y no nos responsabilizamos por su contenido o políticas.
        </p>
      </LegalSection>

      <LegalSection title="4. Cambios">
        <p>
          Podemos actualizar estas páginas para reflejar cambios del servicio o de requisitos legales. La fecha de
          “Última actualización” indica el último ajuste publicado.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

