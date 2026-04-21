/**
 * POST a Webpay Plus: el comercio debe enviar `token_ws` por POST a la `url` devuelta por create.
 */
export function enviarFormularioWebpayPlus(url: string, token: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.style.display = "none";
  form.setAttribute("accept-charset", "UTF-8");
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token_ws";
  input.value = token;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

/** Si es "true", `/panel/planes` no llama a `/api/pagos/crear` y usa solo contacto/manual (legacy). */
export function planesWebpayDeshabilitadoCliente(): boolean {
  return process.env.NEXT_PUBLIC_PLANES_WEBPAY_DESHABILITADO === "true";
}
