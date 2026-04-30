/**
 * HTML del correo de confirmación al enviar solicitud de publicación.
 * Estilos solo inline (compatibilidad con clientes de correo).
 */
const SITE = "https://reydeldato.cl";

export function recibimosTuSolicitudEmailHtml(): string {
  return `<div style="margin:0;padding:24px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background-color:#0d4a3a;padding:22px 24px;">
      <div style="color:#ffffff;font-size:20px;font-weight:700;line-height:1.25;letter-spacing:0.02em;">REY DEL DATO</div>
      <div style="color:#9fd4c4;font-size:14px;margin-top:8px;line-height:1.4;">El dato de tu comuna</div>
    </div>
    <div style="padding:28px 24px 8px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:50%;background:#d1fae5;color:#065f46;font-size:24px;text-align:center;">✅</span>
      </div>
      <h1 style="margin:0 0 14px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;text-align:center;">Recibimos tu solicitud</h1>
      <p style="margin:0 0 26px;color:#4b5563;font-size:15px;line-height:1.6;text-align:center;">Hola, gracias por publicar tu negocio en Rey del Dato. Ya tenemos tu información y estamos revisándola.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 14px;color:#111827;font-size:15px;font-weight:700;line-height:1.35;">¿Qué pasa ahora?</p>
        <ol style="margin:0;padding:0 0 0 22px;color:#374151;font-size:14px;line-height:1.55;">
          <li style="margin-bottom:12px;padding-left:4px;"><span style="font-weight:600;color:#1f2937;">Revisamos tu ficha</span> — nos aseguramos de que todo esté en orden antes de publicarla.</li>
          <li style="margin-bottom:12px;padding-left:4px;"><span style="font-weight:600;color:#1f2937;">Te avisamos por email</span> — recibirás un segundo correo cuando tu negocio esté aprobado y visible. Revisa también tu carpeta de spam.</li>
          <li style="margin-bottom:0;padding-left:4px;"><span style="font-weight:600;color:#1f2937;">Empiezas a aparecer</span> — cuando alguien busque en tu comuna, podrán encontrarte.</li>
        </ol>
      </div>
      <div style="background:#fff7e6;border:1px solid #f5cf7a;border-radius:8px;padding:16px 18px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#92400e;font-size:15px;font-weight:700;line-height:1.35;">📬 ¿No recibes el email de aprobación?</p>
        <p style="margin:0;color:#78350f;font-size:14px;line-height:1.55;">Revisa tu carpeta de spam o correo no deseado. Si no lo encuentras, escríbenos a <a href="mailto:contacto@reydeldato.cl" style="color:#0d4a3a;font-weight:600;">contacto@reydeldato.cl</a></p>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 22px;" />
      <p style="margin:0 0 28px;color:#4b5563;font-size:14px;line-height:1.6;text-align:center;">Si tienes dudas, escríbenos a <a href="mailto:contacto@reydeldato.cl" style="color:#0d4a3a;font-weight:600;">contacto@reydeldato.cl</a> o por WhatsApp al <a href="https://wa.me/56975949281" style="color:#0d4a3a;font-weight:600;text-decoration:none;">+56 9 7594 9281</a></p>
    </div>
    <div style="background:#e5e7eb;padding:20px 24px;text-align:center;">
      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;">
        <a href="${SITE}/que-es" style="color:#0d4a3a;text-decoration:underline;">Qué es Rey del Dato</a>
        <span style="color:#9ca3af;"> · </span>
        <a href="${SITE}/contacto" style="color:#0d4a3a;text-decoration:underline;">Contacto</a>
        <span style="color:#9ca3af;"> · </span>
        <a href="${SITE}/privacidad" style="color:#0d4a3a;text-decoration:underline;">Política de privacidad</a>
      </p>
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">© Rey del Dato SpA · RUT 78.403.835-1</p>
    </div>
  </div>
</div>`;
}
