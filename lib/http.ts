// lib/http.ts
export function ok(data: unknown, init?: ResponseInit) {
  return Response.json(data, { status: 200, ...init });
}

export function created(data: unknown, init?: ResponseInit) {
  return Response.json(data, { status: 201, ...init });
}

/** Metadatos opcionales para errores API (Postgrest, validación, etc.). */
export type HttpErrorMeta = {
  /** Mensaje técnico o de causa raíz (prioridad en cliente: error || message || details). */
  error?: string;
  code?: string;
  hint?: string;
};

function errorPayload(
  message: string,
  details?: unknown,
  meta?: HttpErrorMeta
): Record<string, unknown> {
  const detailsStr = typeof details === "string" ? details.trim() : "";
  const error =
    (meta?.error && String(meta.error).trim()) ||
    detailsStr ||
    message;
  return {
    ok: false,
    message,
    error,
    details: details ?? null,
    code: meta?.code ?? null,
    hint: meta?.hint ?? null,
  };
}

export function badRequest(
  message: string,
  details?: unknown,
  meta?: HttpErrorMeta
) {
  return Response.json(errorPayload(message, details, meta), { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return Response.json(
    {
      ok: false,
      message,
      error: message,
      details: null,
      code: "UNAUTHORIZED",
      hint: null,
    },
    { status: 401 }
  );
}

export function notFound(
  message = "Not found",
  details?: unknown,
  meta?: HttpErrorMeta
) {
  return Response.json(errorPayload(message, details, meta), { status: 404 });
}

export function serverError(
  message = "Internal server error",
  details?: unknown,
  meta?: HttpErrorMeta
) {
  return Response.json(errorPayload(message, details, meta), { status: 500 });
}