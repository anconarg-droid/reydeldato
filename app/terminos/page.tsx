import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";
import TerminosSidebarNav from "./TerminosSidebarNav";

export default function TerminosPage() {
  return (
    <LegalLayout title="Términos y Condiciones" lastUpdated="Abril 2026" wide>
      <div className="grid grid-cols-1 gap-10 min-[480px]:grid-cols-[160px_minmax(0,1fr)]">
        <aside className="hidden min-[480px]:block">
          <div className="sticky top-24">
            <TerminosSidebarNav />
          </div>
        </aside>

        <div className="space-y-10">
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
    </LegalLayout>
  );
}
