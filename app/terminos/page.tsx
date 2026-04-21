import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

export default function TerminosPage() {
  return (
    <LegalLayout title="Términos y Condiciones" lastUpdated="Abril 2026">
      <LegalSection title="1. Identificación del prestador">
        <p>
          Este sitio web es operado por <strong>Rey del Dato SpA</strong>, RUT 78.403.835-1, con domicilio en Padre
          Hurtado, Región Metropolitana, Chile.
        </p>
      </LegalSection>

      <LegalSection title="2. Naturaleza del servicio">
        <p>
          Rey del Dato es una plataforma digital que facilita la conexión entre usuarios y emprendimientos o prestadores
          de servicios.
        </p>
        <p>La empresa no presta directamente los servicios publicados ni participa en transacciones entre las partes.</p>
      </LegalSection>

      <LegalSection title="3. Responsabilidad">
        <p>Rey del Dato no es responsable por:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Incumplimientos de servicios por parte de los emprendedores</li>
          <li>Daños derivados de acuerdos entre usuarios y prestadores</li>
          <li>Información incorrecta proporcionada por terceros</li>
        </ul>
        <p>
          Rey del Dato no garantiza la calidad, disponibilidad ni veracidad de los servicios publicados. El usuario es
          responsable de validar la información antes de contratar.
        </p>
      </LegalSection>

      <LegalSection title="4. Publicación de emprendimientos">
        <p>Al publicar, el emprendedor declara que:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>La información entregada es verídica</li>
          <li>Autoriza su publicación en la plataforma</li>
          <li>Acepta procesos de revisión o eliminación de contenido</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Uso de la plataforma">
        <p>El usuario se compromete a:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>No utilizar el sitio con fines ilegales</li>
          <li>No publicar contenido falso o engañoso</li>
          <li>No vulnerar la seguridad del sistema</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Propiedad intelectual">
        <p>Todo el contenido del sitio pertenece a Rey del Dato SpA y no puede ser reproducido sin autorización.</p>
      </LegalSection>

      <LegalSection title="7. Modificaciones">
        <p>
          Rey del Dato puede modificar estos términos en cualquier momento, publicando una versión actualizada.
        </p>
      </LegalSection>

      <LegalSection title="8. Legislación aplicable">
        <p>Estos términos se rigen por las leyes de la República de Chile.</p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          <a className="underline underline-offset-2" href="mailto:contacto@reydeldato.cl">
            contacto@reydeldato.cl
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
