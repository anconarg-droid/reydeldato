import { IntegrationCommerceCodes } from "transbank-sdk";

/** Contexto seguro para depurar `Transaction.create` (sin API keys). */
export function getWebpayCreateDevContext(returnUrl: string): {
  dev_app_base_url: string;
  dev_environment: string;
  dev_return_url: string;
  dev_commerce_code: string;
  dev_api_key_source: "env" | "sdk_default_integration";
} {
  const env = (process.env.TRANSBANK_ENVIRONMENT || "integration")
    .toLowerCase()
    .trim();
  const rawBase = process.env.APP_BASE_URL?.trim() ?? "";
  const appBaseUrl = rawBase.replace(/\/+$/, "");
  const envCommerce = process.env.TRANSBANK_COMMERCE_CODE?.trim();
  const commerceCode =
    envCommerce ||
    (env === "production"
      ? "(falta TRANSBANK_COMMERCE_CODE en producción)"
      : String(IntegrationCommerceCodes.WEBPAY_PLUS));
  const keyFromEnv = Boolean(process.env.TRANSBANK_API_KEY?.trim());
  return {
    dev_app_base_url: appBaseUrl || "(vacío)",
    dev_environment: env,
    dev_return_url: returnUrl,
    dev_commerce_code: commerceCode,
    dev_api_key_source: keyFromEnv ? "env" : "sdk_default_integration",
  };
}

/**
 * Extrae nombre/mensaje HTTP/cuerpo de error axios-like (p. ej. dentro de TransbankError).
 * No incluye cabeceras ni secretos.
 */
export function describeTransbankCreateError(e: unknown): {
  name: string;
  message: string;
  httpStatus?: number;
  responseBodyPreview?: string;
} {
  const name = e instanceof Error ? e.name : typeof e;
  const message = e instanceof Error ? e.message : String(e);

  let httpStatus: number | undefined;
  let body: unknown;
  let cur: unknown = e;
  for (let depth = 0; depth < 4 && cur != null; depth++) {
    if (typeof cur === "object" && "response" in cur) {
      const resp = (cur as { response?: { status?: number; data?: unknown } })
        .response;
      if (resp) {
        httpStatus = resp.status;
        body = resp.data;
        break;
      }
    }
    const cause =
      typeof cur === "object" && cur !== null && "cause" in cur
        ? (cur as { cause: unknown }).cause
        : undefined;
    cur = cause ?? null;
  }

  let responseBodyPreview: string | undefined;
  if (body !== undefined) {
    try {
      const j = typeof body === "string" ? body : JSON.stringify(body);
      responseBodyPreview = j.length > 2000 ? `${j.slice(0, 2000)}…` : j;
    } catch {
      responseBodyPreview = String(body).slice(0, 2000);
    }
  }

  return { name, message, httpStatus, responseBodyPreview };
}

export function buildTransbankCreateDevDetail(
  d: ReturnType<typeof describeTransbankCreateError>
): string {
  const parts = [`${d.name}: ${d.message.replace(/\s+/g, " ").trim()}`];
  if (d.httpStatus != null) {
    parts.push(`http_status=${d.httpStatus}`);
  }
  if (d.responseBodyPreview) {
    parts.push(`response=${d.responseBodyPreview}`);
  }
  return parts.join(" | ");
}
