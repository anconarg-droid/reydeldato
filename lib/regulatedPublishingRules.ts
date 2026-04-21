/**
 * Reglas de publicación con verificación obligatoria para rubros regulados o sensibles.
 * Base: sector_slug, tags_slugs, keywords_clasificacion, tipo_actividad.
 *
 * Preparado para ampliar con verificación documental: se puede agregar en cada regla
 * campos como document_required: true o verification_steps: ["titulo", "patente"]
 * y en el flujo de aprobación admin solicitar subida de certificado/patente/título.
 */

export type MatchInput = {
  sector_slug?: string | null;
  tags_slugs?: string[] | null;
  keywords_clasificacion?: string[] | null;
  tipo_actividad?: string | null;
};

export type RegulatedRule = {
  id: string;
  match: {
    sector_slug?: string;
    tags_slugs?: string[];
    keywords_clasificacion?: string[];
    tipo_actividad?: string;
  };
  requires_verification: boolean;
  reason:
    | "titulo_profesional"
    | "patente_alcohol"
    | "autorizacion_sanitaria"
    | "verificacion_manual";
};

export const REGULATED_PUBLISHING_RULES: RegulatedRule[] = [
  // --- Título profesional obligatorio ---
  {
    id: "abogados",
    match: {
      sector_slug: "profesionales_asesorias",
      tags_slugs: ["abogado", "abogados"],
    },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "notarios",
    match: { tags_slugs: ["notario", "notarios"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "dentistas",
    match: { tags_slugs: ["dentista", "dentistas", "odontologo", "odontología"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "medicos",
    match: { tags_slugs: ["medico", "médicos", "doctor", "medicina"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "psicologos",
    match: { tags_slugs: ["psicologo", "psicólogo", "psicologos", "psicología"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "veterinarios",
    match: { tags_slugs: ["veterinario", "veterinaria", "veterinarios"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "kinesiologos",
    match: { tags_slugs: ["kinesiologo", "kinesiólogo", "kinesiologia"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "nutricionistas",
    match: { tags_slugs: ["nutricionista", "nutricion"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "fonoaudiologos",
    match: { tags_slugs: ["fonoaudiologo", "fonoaudiólogo", "fonoaudiologia"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "terapeuta_ocupacional",
    match: { tags_slugs: ["terapeuta_ocupacional", "terapia_ocupacional"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },
  {
    id: "matronas",
    match: { tags_slugs: ["matrona", "matronas", "obstetricia"] },
    requires_verification: true,
    reason: "titulo_profesional",
  },

  // --- Patente / permiso especial ---
  {
    id: "venta_alcohol",
    match: {
      tags_slugs: [
        "botilleria",
        "botillería",
        "venta_alcohol",
        "licores",
        "alcohol",
      ],
    },
    requires_verification: true,
    reason: "patente_alcohol",
  },
  {
    id: "farmacias",
    match: { tags_slugs: ["farmacia", "farmacias", "quimica", "química"] },
    requires_verification: true,
    reason: "autorizacion_sanitaria",
  },
  {
    id: "opticas",
    match: { tags_slugs: ["optica", "óptica", "opticas", "ópticas", "lentes"] },
    requires_verification: true,
    reason: "autorizacion_sanitaria",
  },

  // --- Autorización sanitaria / salud regulada ---
  {
    id: "centro_medico",
    match: {
      tags_slugs: ["centro_medico", "clinica", "clinicas", "centro_medico"],
    },
    requires_verification: true,
    reason: "autorizacion_sanitaria",
  },
  {
    id: "laboratorio",
    match: { tags_slugs: ["laboratorio", "laboratorios", "analisis_clinicos"] },
    requires_verification: true,
    reason: "autorizacion_sanitaria",
  },
  {
    id: "procedimientos_esteticos",
    match: {
      tags_slugs: [
        "procedimientos_esteticos",
        "procedimientos estéticos",
        "estetica_invasiva",
        "medicina_estetica",
      ],
    },
    requires_verification: true,
    reason: "autorizacion_sanitaria",
  },
  {
    id: "servicios_salud",
    match: {
      keywords_clasificacion: [
        "servicios salud",
        "salud regulada",
        "atención médica",
        "consulta médica",
      ],
    },
    requires_verification: true,
    reason: "autorizacion_sanitaria",
  },
];

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function setHas(arr: string[] | null | undefined): Set<string> {
  if (!Array.isArray(arr)) return new Set();
  return new Set(arr.map((x) => norm(x)).filter(Boolean));
}

export type PublishingDecision = {
  /** Tras moderación obligatoria, la publicación en sitio solo vía admin; siempre queda en revisión. */
  estado_publicacion: "en_revision";
  motivo_verificacion: string | null;
  requiere_verificacion: boolean;
};

/**
 * Decide si la publicación puede ser automática o debe quedar pendiente de verificación.
 * Usa sector_slug, tags_slugs, keywords_clasificacion, tipo_actividad.
 */
export function getPublishingDecision(input: MatchInput): PublishingDecision {
  const sectorNorm = norm(input.sector_slug ?? "");
  const tagsSet = setHas(input.tags_slugs);
  const keywordsSet = setHas(input.keywords_clasificacion);
  const tipoNorm = norm(input.tipo_actividad ?? "");

  for (const rule of REGULATED_PUBLISHING_RULES) {
    if (!rule.requires_verification) continue;

    const m = rule.match;

    if (m.sector_slug && norm(m.sector_slug) !== sectorNorm) continue;

    if (m.tipo_actividad && norm(m.tipo_actividad) !== tipoNorm) continue;

    if (m.tags_slugs?.length) {
      const matchTag = m.tags_slugs.some((t) => tagsSet.has(norm(t)));
      if (!matchTag) continue;
    }

    if (m.keywords_clasificacion?.length) {
      const matchKw = m.keywords_clasificacion.some((k) => keywordsSet.has(norm(k)));
      if (!matchKw) continue;
    }

    return {
      estado_publicacion: "en_revision",
      motivo_verificacion: rule.reason,
      requiere_verificacion: true,
    };
  }

  return {
    estado_publicacion: "en_revision",
    motivo_verificacion: null,
    requiere_verificacion: false,
  };
}

/** Local físico + dirección según plan comercial: {@link requiereDireccionSiModalidadLocalFisico}. */
export { requiereDireccionSiModalidadLocalFisico } from "./requiereDireccionLocalFisico";

/** Validación admin “Publicar en sitio”: prioriza `emprendedor_locales`, fallback legacy en `emprendedores`. */
export {
  comunaIdTieneValor,
  fetchComercialInputParaValidarLocalFisico,
  normalizarUuidEmprendedorId,
  validarLocalFisicoDireccionAntesDePublicarAdmin,
  esLocalFisicoFilaValida,
} from "./localFisicoPublicacionAdmin";

export type {
  AdminPublishFailureReason,
  AdminPublishEmprendedorResult,
} from "./adminPublishEmprendedorFicha";
