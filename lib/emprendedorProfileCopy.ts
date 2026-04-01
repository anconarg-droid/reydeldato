function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function limpiarTexto(txt?: string | null): string | null {
  if (!txt) return null;
  const limpio = String(txt).trim();
  if (!limpio) return null;
  // muy corto
  if (limpio.length < 20) return null;
  // texto repetido tipo ddddddd / xxxxxxx
  if (/(.)\1{5,}/.test(limpio)) return null;
  return limpio;
}

export function buildSubtituloFicha(params: {
  categoria?: unknown;
  comuna?: unknown;
  cobertura?: unknown;
}): string {
  const categoria = s(params.categoria) || "Servicios";
  const comuna = s(params.comuna);
  const cobertura = s(params.cobertura).toLowerCase();

  if (comuna && cobertura.includes("todo chile")) {
    return `${categoria} en ${comuna} y atención en todo Chile.`;
  }
  if (comuna && cobertura.includes("varias comunas")) {
    return `${categoria} en ${comuna} y alrededores.`;
  }
  if (comuna && cobertura.includes("varias regiones")) {
    return `${categoria} en ${comuna} y atención en varias regiones.`;
  }
  if (comuna) {
    return `${categoria} en ${comuna}.`;
  }
  return `${categoria}.`;
}

export function buildDescripcionFallback(params: {
  categoria?: unknown;
  comuna?: unknown;
  cobertura?: unknown;
  whatsapp?: unknown;
}): string {
  const categoria = s(params.categoria) || "servicios";
  const comuna = s(params.comuna);
  const cobertura = s(params.cobertura).toLowerCase();
  const whatsapp = s(params.whatsapp);

  const base = comuna ? `${categoria} en ${comuna}.` : `${categoria}.`;

  const atencion =
    cobertura.includes("todo chile") || cobertura.includes("nacional")
      ? "Atención en todo Chile."
      : cobertura.includes("varias regiones")
        ? "Atención en varias regiones."
        : cobertura.includes("varias comunas")
          ? "Atención en varias comunas."
          : cobertura
            ? `Atención en ${cobertura}.`
            : comuna
              ? `Atención en ${comuna}.`
              : "";

  const contactoTxt = whatsapp
    ? " Contáctalo directo por WhatsApp."
    : " Contáctalo directo para más información.";

  return `${base}${atencion ? ` ${atencion}` : ""}${contactoTxt}`.trim();
}

export function buildEstadoVacioFicha(): string {
  return "Este emprendimiento aún no ha agregado más detalles. Puedes contactarlo directamente para más información.";
}