import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";
import PrivacidadSidebarNav from "./PrivacidadSidebarNav";

export default function PrivacidadPage() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated="Abril 2026" wide>
      <div className="grid grid-cols-1 gap-10 min-[480px]:grid-cols-[160px_minmax(0,1fr)]">
        <aside className="hidden min-[480px]:block">
          <div className="sticky top-24">
            <PrivacidadSidebarNav />
          </div>
        </aside>

        <div className="space-y-10">
          <LegalSection id="p1" splitLeadingNumber title="1. Responsable del tratamiento">
            <p>Rey del Dato SpA, RUT 78.403.835-1, es responsable del tratamiento de datos.</p>
          </LegalSection>

          <LegalSection id="p2" splitLeadingNumber title="2. Base legal">
            <p>
              El tratamiento de datos se realiza conforme a la Ley N° 19.628 sobre Protección de la Vida Privada en Chile.
            </p>
          </LegalSection>

          <LegalSection id="p3" splitLeadingNumber title="3. Datos recopilados">
            <ul className="space-y-2">
              {[
                "Nombre",
                "Email",
                "Teléfono (WhatsApp)",
                "Datos del emprendimiento",
                "Datos de uso y navegación",
                "Dirección IP (para seguridad y métricas básicas)",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full bg-[#0d7a5f]" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection id="p4" splitLeadingNumber title="4. Uso de la información">
            <p>Los datos se utilizan para:</p>
            <ul className="space-y-2">
              {["Mostrar emprendimientos", "Permitir contacto directo", "Mejorar la plataforma"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full bg-[#0d7a5f]" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection id="p5" splitLeadingNumber title="5. Datos públicos">
            <p>
              Los datos publicados (como WhatsApp o nombre del negocio) son proporcionados voluntariamente por los
              emprendedores para ser contactados.
            </p>
          </LegalSection>

          <LegalSection id="p6" splitLeadingNumber title="6. Derechos del titular">
            <p>El usuario puede:</p>
            <ul className="space-y-2">
              {["Acceder a sus datos", "Modificar información", "Solicitar eliminación", "Revocar consentimiento"].map(
                (t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full bg-[#0d7a5f]" aria-hidden />
                    <span>{t}</span>
                  </li>
                )
              )}
            </ul>
          </LegalSection>

          <LegalSection id="p7" splitLeadingNumber title="7. Seguridad">
            <p>Se aplican medidas razonables de seguridad, sin garantizar invulnerabilidad total.</p>
          </LegalSection>

          <LegalSection id="p8" splitLeadingNumber title="8. Cookies">
            <p>Se pueden utilizar cookies para mejorar la experiencia del usuario.</p>
          </LegalSection>

          <LegalSection id="p9" splitLeadingNumber title="9. Contacto">
            <p>
              <a className="underline underline-offset-2" href="mailto:contacto@reydeldato.cl">
                contacto@reydeldato.cl
              </a>
            </p>
          </LegalSection>
        </div>
      </div>
    </LegalLayout>
  );
}
