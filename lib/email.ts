import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function defaultFrom(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
}

function createResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Envío vía SDK Resend. No lanza: errores solo a consola (no rompe flujos de negocio).
 * @returns true si Resend aceptó el envío sin error; false si se omitió, falló la API o hubo excepción.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const dest = String(to ?? "").trim().toLowerCase();
  if (!dest || !subject.trim() || !html.trim()) return false;

  const resend = createResend();
  if (!resend) {
    // eslint-disable-next-line no-console
    console.warn("[email] RESEND_API_KEY no configurada; correo NO enviado:", {
      to: dest,
      subject,
    });
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: defaultFrom(),
      to: dest,
      subject,
      html,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[email] Resend devolvió error:", { to: dest, subject, error });
      return false;
    }
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] Excepción al enviar con Resend:", {
      to: dest,
      subject,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Correo de prueba (usar con GET /api/test-email en local o con RESEND_ENABLE_TEST_EMAIL=1).
 * Destino: `RESEND_TEST_TO` (ej. tu Gmail).
 */
export async function enviarCorreoTest(): Promise<void> {
  const to = process.env.RESEND_TEST_TO?.trim();
  if (!to) {
    // eslint-disable-next-line no-console
    console.warn("[email] enviarCorreoTest: falta RESEND_TEST_TO en .env");
    return;
  }

  await sendEmail({
    to,
    subject: "Test Rey del Dato",
    html: "<p>Si estás leyendo esto, ya funciona el sistema de correos 🚀</p>",
  });
}
