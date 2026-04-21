import {
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  WebpayPlus,
} from "transbank-sdk";

export class TransbankConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransbankConfigError";
  }
}

/**
 * Cliente Webpay Plus (integración o producción) según `TRANSBANK_ENVIRONMENT`.
 */
export function getWebpayPlusTransaction(): InstanceType<
  typeof WebpayPlus.Transaction
> {
  const env = (process.env.TRANSBANK_ENVIRONMENT || "integration")
    .toLowerCase()
    .trim();

  if (env === "production") {
    const code = process.env.TRANSBANK_COMMERCE_CODE?.trim();
    const key = process.env.TRANSBANK_API_KEY?.trim();
    if (!code || !key) {
      throw new TransbankConfigError("missing_transbank_production_config");
    }
    return WebpayPlus.Transaction.buildForProduction(code, key);
  }

  const code =
    process.env.TRANSBANK_COMMERCE_CODE?.trim() ||
    IntegrationCommerceCodes.WEBPAY_PLUS;
  const key =
    process.env.TRANSBANK_API_KEY?.trim() || IntegrationApiKeys.WEBPAY;

  return WebpayPlus.Transaction.buildForIntegration(code, key);
}

/** URL base pública (sin barra final). */
export function getAppBaseUrlOrThrow(): string {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) {
    throw new TransbankConfigError("missing_app_base_url");
  }
  return raw.replace(/\/+$/, "");
}

export function urlRetornoWebpayPlus(): string {
  return `${getAppBaseUrlOrThrow()}/api/pagos/retorno`;
}
