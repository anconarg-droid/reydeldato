/**
 * Completitud de ficha (0–100).
 * - `porcentaje`: suma total incl. categoría (+10 si aplica).
 * - `estado` (incompleta / visible / completa): se calcula **sin** contar categoría,
 *   para no penalizar fichas básicas usables que aún no eligieron rubro.
 *
 * Base mínima de producto (no bloquea score de categoría): nombre, WhatsApp,
 * descripción corta, comuna, cobertura, modalidades.
 */

export type EstadoFicha = "incompleta" | "visible" | "completa";

export type PerfilCompleto = {
  porcentaje: number;
  estado: EstadoFicha;
  /** Porcentaje 0–100 usado solo para umbrales de estado (excluye puntos de categoría). */
  porcentajeParaEstado: number;
  baseMinimaLista: boolean;
  checks: {
    nombre: boolean;
    whatsapp: boolean;
    fotoPrincipal: boolean;
    fraseNegocio: boolean;
    comuna: boolean;
    cobertura: boolean;
    modalidades: boolean;
    categoria: boolean;
    instagram: boolean;
    sitioWeb: boolean;
    descripcionLarga: boolean;
    galeria: boolean;
  };
  faltantes: Array<{
    label: string;
    bonusPuntos: number;
    bloque: "base" | "recomendado" | "mejora";
  }>;
  subtituloPagina: string;
  mensajeEstado: string;
  mensajeProgreso: string;
  faltanPiezasCriticas: boolean;
};

const W = {
  nombre: 15,
  whatsapp: 20,
  fotoPrincipal: 10,
  fraseNegocio: 15,
  comuna: 10,
  cobertura: 5,
  modalidades: 5,
  categoria: 10,
  instagram: 3,
  sitioWeb: 3,
  descripcionLarga: 2,
  galeria: 2,
} as const;

const MAX_SIN_CATEGORIA = 100 - W.categoria;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arrStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function hasUuid(v: unknown): boolean {
  return v != null && String(v).trim().length > 0;
}

function coberturaOk(input: CompletitudInput): boolean {
  const tipo = s(input.coberturaTipo).toLowerCase();
  const comunas = arrStrings(input.comunasCobertura);
  const regionesN = Number(input.regionesCoberturaCount) || 0;

  if (!hasUuid(input.comunaId)) return false;

  if (
    !tipo ||
    tipo === "solo_comuna" ||
    tipo === "comuna" ||
    tipo === "solo_mi_comuna"
  ) {
    return true;
  }
  if (tipo === "varias_comunas") {
    return comunas.length >= 1;
  }
  if (tipo === "regional") {
    return hasUuid(input.comunaId);
  }
  if (tipo === "varias_regiones") {
    return regionesN >= 1;
  }
  if (tipo === "nacional") {
    return true;
  }
  return true;
}

export type CompletitudInput = {
  nombreEmprendimiento: unknown;
  whatsappPrincipal: unknown;
  whatsappSecundario: unknown;
  fotoPrincipalUrl: unknown;
  fraseNegocio: unknown;
  comunaId: unknown;
  categoriaId: unknown;
  coberturaTipo: unknown;
  comunasCobertura: unknown;
  regionesCoberturaCount: number;
  modalidadesCount: number;
  instagram: unknown;
  sitioWeb: unknown;
  descripcionLibre: unknown;
  galeriaExtraCount: number;
};

export function calcularCompletitudEmprendedor(
  input: CompletitudInput
): PerfilCompleto {
  const checks = {
    nombre: Boolean(s(input.nombreEmprendimiento)),
    whatsapp: Boolean(
      s(input.whatsappPrincipal) || s(input.whatsappSecundario)
    ),
    fotoPrincipal: Boolean(s(input.fotoPrincipalUrl)),
    fraseNegocio: Boolean(s(input.fraseNegocio)),
    comuna: hasUuid(input.comunaId),
    cobertura: coberturaOk(input),
    modalidades: Number(input.modalidadesCount) >= 1,
    categoria: hasUuid(input.categoriaId),
    instagram: Boolean(s(input.instagram)),
    sitioWeb: Boolean(s(input.sitioWeb)),
    descripcionLarga: Boolean(s(input.descripcionLibre)),
    galeria: Number(input.galeriaExtraCount) >= 1,
  };

  let puntos = 0;
  if (checks.nombre) puntos += W.nombre;
  if (checks.whatsapp) puntos += W.whatsapp;
  if (checks.fotoPrincipal) puntos += W.fotoPrincipal;
  if (checks.fraseNegocio) puntos += W.fraseNegocio;
  if (checks.comuna) puntos += W.comuna;
  if (checks.cobertura) puntos += W.cobertura;
  if (checks.modalidades) puntos += W.modalidades;
  if (checks.categoria) puntos += W.categoria;
  if (checks.instagram) puntos += W.instagram;
  if (checks.sitioWeb) puntos += W.sitioWeb;
  if (checks.descripcionLarga) puntos += W.descripcionLarga;
  if (checks.galeria) puntos += W.galeria;

  const porcentaje = Math.min(100, Math.round(puntos));

  const puntosSinCategoria =
    puntos - (checks.categoria ? W.categoria : 0);
  const porcentajeParaEstado = Math.min(
    100,
    Math.round((puntosSinCategoria / MAX_SIN_CATEGORIA) * 100)
  );

  let estado: EstadoFicha;
  if (porcentajeParaEstado < 50) estado = "incompleta";
  else if (porcentajeParaEstado < 80) estado = "visible";
  else estado = "completa";

  const baseMinimaLista =
    checks.nombre &&
    checks.whatsapp &&
    checks.fraseNegocio &&
    checks.comuna &&
    checks.cobertura &&
    checks.modalidades;

  const mensajeEstado =
    estado === "incompleta"
      ? baseMinimaLista
        ? "Tu ficha ya cumple lo esencial; las mejoras opcionales te ayudan a destacar más."
        : "Tu ficha todavía está muy básica."
      : estado === "visible"
        ? "Tu ficha ya está visible, pero todavía puede convertir mejor."
        : "Tu ficha está bien preparada para generar más confianza y contactos.";

  const subtituloPagina =
    estado === "incompleta"
      ? baseMinimaLista
        ? "Puedes seguir sumando fotos, redes y rubro para ganar confianza, sin apuros."
        : "Completa lo esencial para que tu negocio se vea confiable y fácil de contactar."
      : estado === "visible"
        ? "Tu ficha ya está visible. Agrega más información para aumentar la confianza y los contactos."
        : "Tu ficha ya está bien armada. Puedes seguir mejorándola para destacar aún más.";

  const faltanPiezasCriticas = !baseMinimaLista;

  let mensajeProgreso: string;
  if (estado === "incompleta") {
    mensajeProgreso = faltanPiezasCriticas
      ? "Tu ficha todavía no está lista para convertir bien."
      : baseMinimaLista
        ? "Lo principal ya está: suma mejoras recomendadas cuando tengas un minuto."
        : mensajeEstado;
  } else if (estado === "visible") {
    mensajeProgreso =
      "Ya está visible, pero todavía puedes mejorarla para recibir más contactos.";
  } else {
    mensajeProgreso =
      "Puedes seguir mejorándola para destacar aún más.";
  }

  const faltantes: PerfilCompleto["faltantes"] = [];

  if (!checks.nombre) {
    faltantes.push({
      label: "Completar nombre del negocio",
      bonusPuntos: W.nombre,
      bloque: "base",
    });
  }
  if (!checks.whatsapp) {
    faltantes.push({
      label: "Agregar WhatsApp",
      bonusPuntos: W.whatsapp,
      bloque: "base",
    });
  }
  if (!checks.fraseNegocio) {
    faltantes.push({
      label: "Agregar frase o descripción corta",
      bonusPuntos: W.fraseNegocio,
      bloque: "base",
    });
  }
  if (!checks.comuna) {
    faltantes.push({
      label: "Definir comuna base",
      bonusPuntos: W.comuna,
      bloque: "base",
    });
  }
  if (!checks.cobertura) {
    faltantes.push({
      label: "Completar cobertura (tipo y zonas)",
      bonusPuntos: W.cobertura,
      bloque: "base",
    });
  }
  if (!checks.modalidades) {
    faltantes.push({
      label: "Indicar cómo atiendes (local, domicilio u online)",
      bonusPuntos: W.modalidades,
      bloque: "base",
    });
  }

  if (!checks.categoria) {
    faltantes.push({
      label: "Elegir categoría (mejora tu visibilidad)",
      bonusPuntos: W.categoria,
      bloque: "recomendado",
    });
  }
  if (!checks.fotoPrincipal) {
    faltantes.push({
      label: "Agregar foto principal",
      bonusPuntos: W.fotoPrincipal,
      bloque: "mejora",
    });
  }
  if (!checks.instagram) {
    faltantes.push({
      label: "Agregar Instagram",
      bonusPuntos: W.instagram,
      bloque: "mejora",
    });
  }
  if (!checks.sitioWeb) {
    faltantes.push({
      label: "Agregar sitio web",
      bonusPuntos: W.sitioWeb,
      bloque: "mejora",
    });
  }
  if (!checks.descripcionLarga) {
    faltantes.push({
      label: "Completar descripción detallada",
      bloque: "mejora",
      bonusPuntos: W.descripcionLarga,
    });
  }
  if (!checks.galeria) {
    faltantes.push({
      label: "Subir más fotos en galería",
      bonusPuntos: W.galeria,
      bloque: "mejora",
    });
  }

  return {
    porcentaje,
    estado,
    porcentajeParaEstado,
    baseMinimaLista,
    checks,
    faltantes,
    subtituloPagina,
    mensajeEstado,
    mensajeProgreso,
    faltanPiezasCriticas,
  };
}

/** Recalcula en el cliente desde el estado del formulario del panel. */
export function calcularCompletitudDesdeFormulario(form: {
  nombre: string;
  whatsapp: string;
  fotoPrincipalUrl: string;
  descripcionCorta: string;
  comunaBaseSlug: string;
  categoriaSlug: string;
  coberturaTipo: string;
  comunasCoberturaSlugs: string[];
  regionesCoberturaSlugs: string[];
  modalidadesAtencion: string[];
  instagram: string;
  web: string;
  descripcionLarga: string;
  galeriaUrls: string[];
}): PerfilCompleto {
  const galeriaExtraCount = form.galeriaUrls.filter((x) => s(x)).length;
  return calcularCompletitudEmprendedor({
    nombreEmprendimiento: form.nombre,
    whatsappPrincipal: form.whatsapp,
    whatsappSecundario: "",
    fotoPrincipalUrl: form.fotoPrincipalUrl,
    fraseNegocio: form.descripcionCorta,
    comunaId: form.comunaBaseSlug || null,
    categoriaId: form.categoriaSlug || null,
    coberturaTipo: form.coberturaTipo,
    comunasCobertura: form.comunasCoberturaSlugs,
    regionesCoberturaCount: form.regionesCoberturaSlugs.filter(Boolean).length,
    modalidadesCount: form.modalidadesAtencion.length,
    instagram: form.instagram,
    sitioWeb: form.web,
    descripcionLibre: form.descripcionLarga,
    galeriaExtraCount,
  });
}
