import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

export default function DatosPage() {
  return (
    <LegalLayout title="Tratamiento de datos" lastUpdated="Abril 2026">
      <LegalSection title="1. Datos personales y datos de emprendimientos">
        <p>
          En el sitio puedes ingresar datos de un emprendimiento (por ejemplo, nombre, descripción, rubro, cobertura,
          imágenes) y, cuando corresponda, datos de contacto para que los vecinos puedan comunicarse.
        </p>
        <p>
          Si ingresas datos de terceros, declaras contar con autorización para hacerlo.
        </p>
      </LegalSection>

      <LegalSection title="2. Base y finalidad del tratamiento">
        <p>
          Tratamos los datos para operar el directorio, gestionar publicaciones, mantener la calidad de la información
          y mejorar la experiencia de búsqueda.
        </p>
        <p>
          Algunos datos se usan de forma agregada (por ejemplo, conteos de apoyo o interés por comuna) sin mostrar
          información personal en la UI.
        </p>
      </LegalSection>

      <LegalSection title="3. Cómo solicitar cambios o eliminación">
        <p>
          Puedes solicitar correcciones o eliminación de datos escribiendo a{" "}
          <a className="underline underline-offset-2" href="mailto:contacto@reydeldato.cl">
            contacto@reydeldato.cl
          </a>
          .
        </p>
        <p>
          Para proteger a los usuarios, podemos pedir información mínima para verificar la solicitud.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies y medición">
        <p>
          Podemos usar cookies o tecnologías similares para mantener sesiones, recordar preferencias y medir de forma
          básica el uso del sitio.
        </p>
        <p>
          Puedes controlar cookies desde tu navegador. Algunas funciones podrían verse afectadas si las deshabilitas.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

