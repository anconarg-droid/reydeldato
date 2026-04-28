import LegalSection from "@/components/LegalSection";

const SECCIONES = [
  { id: "s1", label: "Identificación" },
  { id: "s2", label: "Naturaleza" },
  { id: "s3", label: "Responsabilidad" },
  { id: "s4", label: "Publicación" },
  { id: "s5", label: "Uso" },
  { id: "s6", label: "Propiedad" },
  { id: "s7", label: "Modificaciones" },
  { id: "s8", label: "Legislación" },
  { id: "s9", label: "Contacto" },
] as const;

export default function TerminosPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", lineHeight: "2.25rem", fontWeight: 600, color: "var(--color-foreground)" }}>
          Términos y Condiciones
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
        <nav className="legal-nav" style={{ position: "sticky", top: "1.5rem", display: "none" }} aria-label="Índice de términos">
          <div style={{ display: "grid", gap: "0.25rem" }}>
            {SECCIONES.map((s, idx) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  display: "block",
                  padding: "0.25rem 0",
                  borderLeft: "2px solid transparent",
                  paddingLeft: "0.75rem",
                  color: "var(--color-muted-foreground)",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ color: "var(--color-muted-foreground)" }}>{idx + 1}.</span> {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div style={{ minWidth: 0, display: "grid", gap: "2.5rem" }}>
          <LegalSection id="s1" splitLeadingNumber title="1. Identificación del prestador">
            <p>
              Este sitio web es operado por <strong>Rey del Dato SpA</strong>, RUT 78.403.835-1, con domicilio en Padre
              Hurtado, Región Metropolitana, Chile.
            </p>
          </LegalSection>

          <LegalSection id="s2" splitLeadingNumber title="2. Naturaleza del servicio">
            <p>
              Rey del Dato es una plataforma digital que facilita la conexión entre usuarios y emprendimientos o prestadores
              de servicios.
            </p>
            <p>La empresa no presta directamente los servicios publicados ni participa en transacciones entre las partes.</p>
          </LegalSection>

          <LegalSection id="s3" splitLeadingNumber title="3. Responsabilidad">
            <p>Rey del Dato no es responsable por:</p>
            <ul className="space-y-2">
              {[
                "Incumplimientos de servicios por parte de los emprendedores",
                "Daños derivados de acuerdos entre usuarios y prestadores",
                "Información incorrecta proporcionada por terceros",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full bg-[#0d7a5f]" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p>
              Rey del Dato no garantiza la calidad, disponibilidad ni veracidad de los servicios publicados. El usuario es
              responsable de validar la información antes de contratar.
            </p>
          </LegalSection>

          <LegalSection id="s4" splitLeadingNumber title="4. Publicación de emprendimientos">
            <p>Al publicar, el emprendedor declara que:</p>
            <ul className="space-y-2">
              {[
                "La información entregada es verídica",
                "Autoriza su publicación en la plataforma",
                "Acepta procesos de revisión o eliminación de contenido",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full bg-[#0d7a5f]" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection id="s5" splitLeadingNumber title="5. Uso de la plataforma">
            <p>El usuario se compromete a:</p>
            <ul className="space-y-2">
              {[
                "No utilizar el sitio con fines ilegales",
                "No publicar contenido falso o engañoso",
                "No vulnerar la seguridad del sistema",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-2 h-[5px] w-[5px] shrink-0 rounded-full bg-[#0d7a5f]" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection id="s6" splitLeadingNumber title="6. Propiedad intelectual">
            <p>Todo el contenido del sitio pertenece a Rey del Dato SpA y no puede ser reproducido sin autorización.</p>
          </LegalSection>

          <LegalSection id="s7" splitLeadingNumber title="7. Modificaciones">
            <p>
              Rey del Dato puede modificar estos términos en cualquier momento, publicando una versión actualizada.
            </p>
          </LegalSection>

          <LegalSection id="s8" splitLeadingNumber title="8. Legislación aplicable">
            <p>Estos términos se rigen por las leyes de la República de Chile.</p>
          </LegalSection>

          <LegalSection id="s9" splitLeadingNumber title="9. Contacto">
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
