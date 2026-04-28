import LegalSection from "@/components/LegalSection";
import ScrollSpySidebarNav from "@/components/legal/ScrollSpySidebarNav";

const SECCIONES = [
  { id: "p1", label: "Responsable" },
  { id: "p2", label: "Base legal" },
  { id: "p3", label: "Datos recopilados" },
  { id: "p4", label: "Uso" },
  { id: "p5", label: "Datos públicos" },
  { id: "p6", label: "Derechos" },
  { id: "p7", label: "Seguridad" },
  { id: "p8", label: "Cookies" },
  { id: "p9", label: "Contacto" },
] as const;

export default function PrivacidadPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", lineHeight: "2.25rem", fontWeight: 600, color: "var(--color-foreground)" }}>
          Política de Privacidad
        </h1>
        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
          Última actualización: Abril 2026
        </p>
      </div>

      <div
        className="legal-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "0 2.5rem",
          alignItems: "start",
        }}
      >
        <ScrollSpySidebarNav
          ariaLabel="Índice de privacidad"
          sections={SECCIONES}
          defaultActiveId="p1"
        />

        <div style={{ minWidth: 0, display: "grid", gap: "2.5rem" }}>
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

      <style>{`
        @media (min-width: 640px) {
          .legal-grid { grid-template-columns: 160px 1fr !important; }
          .legal-nav { display: block !important; }
        }
      `}</style>
    </div>
  );
}
