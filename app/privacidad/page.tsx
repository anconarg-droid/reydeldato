import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

export default function PrivacidadPage() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated="Abril 2026">
      <LegalSection title="1. Responsable del tratamiento">
        <p>Rey del Dato SpA, RUT 78.403.835-1, es responsable del tratamiento de datos.</p>
      </LegalSection>

      <LegalSection title="2. Base legal">
        <p>
          El tratamiento de datos se realiza conforme a la Ley N° 19.628 sobre Protección de la Vida Privada en Chile.
        </p>
      </LegalSection>

      <LegalSection title="3. Datos recopilados">
        <ul className="list-disc pl-5 space-y-2">
          <li>Nombre</li>
          <li>Email</li>
          <li>Teléfono (WhatsApp)</li>
          <li>Datos del emprendimiento</li>
          <li>Datos de uso y navegación</li>
          <li>Dirección IP (para seguridad y métricas básicas)</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso de la información">
        <p>Los datos se utilizan para:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Mostrar emprendimientos</li>
          <li>Permitir contacto directo</li>
          <li>Mejorar la plataforma</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Datos públicos">
        <p>
          Los datos publicados (como WhatsApp o nombre del negocio) son proporcionados voluntariamente por los
          emprendedores para ser contactados.
        </p>
      </LegalSection>

      <LegalSection title="6. Derechos del titular">
        <p>El usuario puede:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Acceder a sus datos</li>
          <li>Modificar información</li>
          <li>Solicitar eliminación</li>
          <li>Revocar consentimiento</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Seguridad">
        <p>Se aplican medidas razonables de seguridad, sin garantizar invulnerabilidad total.</p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>Se pueden utilizar cookies para mejorar la experiencia del usuario.</p>
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
