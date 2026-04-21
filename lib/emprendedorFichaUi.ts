import {
  DESCRIPCION_CORTA_MAX,
  DESCRIPCION_CORTA_MIN,
} from "@/lib/descripcionProductoForm";
import { etiquetaModalidadAtencion } from "@/lib/modalidadesAtencion";

/**
 * Copy y etiquetas humanas para la ficha pública `/emprendedor/[slug]`.
 */

export const DESCRIPCION_CORTA_FICHA_MAX = DESCRIPCION_CORTA_MAX;
export const DESCRIPCION_CORTA_FICHA_MIN = DESCRIPCION_CORTA_MIN;

export function modalidadesEtiquetaHumana(list?: string[] | null): string {
  if (!list?.length) return "";
  return list
    .map((v) => etiquetaModalidadAtencion(String(v).trim()))
    .filter(Boolean)
    .join(" · ");
}

/** Flags para el bloque fijo "Cómo atiende" (ficha completa). */
export type ComoAtiendeFlags = {
  localFisico: boolean;
  delivery: boolean;
  domicilio: boolean;
  online: boolean;
  /** Antes no se diferenciaba delivery de servicio a domicilio (`presencial_terreno`). */
  presencialTerrenoLegacy: boolean;
};

const MOD_KEYS = (v: string) => String(v || "").trim().toLowerCase();

/**
 * Agrupa modalidades: local, delivery, domicilio, online + legacy `presencial_terreno` aparte.
 */
export function comoAtiendeFlags(list?: string[] | null): ComoAtiendeFlags {
  const raw = (list || []).map(MOD_KEYS).filter(Boolean);
  const has = (...keys: string[]) => keys.some((k) => raw.includes(k));
  return {
    localFisico: has("local", "local_fisico", "fisico"),
    delivery: has("delivery"),
    domicilio: has("domicilio"),
    online: has("online"),
    presencialTerrenoLegacy: has("presencial_terreno"),
  };
}

/** Badges UI para panel y sección "Cómo atiende". */
export function comoAtiendeBadgeItems(
  flags: ComoAtiendeFlags,
): { emoji: string; label: string }[] {
  const rest: { emoji: string; label: string }[] = [];
  const explicitFuera = flags.delivery || flags.domicilio;
  if (flags.presencialTerrenoLegacy && !explicitFuera) {
    rest.push({ emoji: "🚚", label: "A domicilio / Delivery" });
  }
  if (flags.delivery) rest.push({ emoji: "🚚", label: "Delivery" });
  if (flags.domicilio) rest.push({ emoji: "🏠", label: "A domicilio" });
  if (flags.online) rest.push({ emoji: "💻", label: "Online" });

  const localPrimero = flags.localFisico
    ? [{ emoji: "🏪", label: "Local físico" }]
    : [];

  return [...localPrimero, ...rest];
}

function normRubro(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Sugerencias típicas cuando la BD no trae subcategorías (heurística por nombre/slug de categoría). */
export function serviciosSugeridosPorRubro(
  rubroNombre: string,
  categoriaSlug?: string,
): string[] {
  const t = `${normRubro(rubroNombre)} ${normRubro(categoriaSlug || "")}`;

  const bloques: { re: RegExp; items: string[] }[] = [
    {
      re: /gasfiter|gasfiteria|plomer|plumb|grifer|fuga|destape|calefont/i,
      items: ["Destapes", "Calefont", "Filtraciones", "Llaves de agua"],
    },
    {
      re: /electric|lumin|ilumin/i,
      items: ["Instalaciones", "Tableros", "Iluminación", "Reparaciones eléctricas"],
    },
    {
      re: /pintur|brocha|terminacion/i,
      items: ["Pintura interior", "Pintura exterior", "Terminaciones", "Preparación de superficies"],
    },
    {
      re: /limpiez|aseo|sanitiz/i,
      items: ["Limpieza profunda", "Aseo general", "Espacios comunes", "Post-obra"],
    },
    {
      re: /jardin|paisaj|riego|planta/i,
      items: ["Mantenimiento de jardín", "Riego", "Poda", "Asesoría de plantas"],
    },
    {
      re: /carpinter|muebl|ebanist/i,
      items: ["Muebles a medida", "Reparaciones", "Instalaciones", "Melamina y madera"],
    },
    {
      re: /construc|albanil|maestro|obra|yeso/i,
      items: ["Reparaciones", "Ampliaciones", "Terminaciones", "Pequeñas obras"],
    },
    {
      re: /cerraj|seguridad|llave/i,
      items: ["Aperturas", "Cambio de combinación", "Cerraduras", "Copias de llave"],
    },
    {
      re: /bellez|peluqu|barber|estetic|uñas|spa/i,
      items: ["Atención personalizada", "Reserva por mensaje", "Servicios de rutina"],
    },
    {
      re: /mascot|veterin|pet/i,
      items: ["Consulta", "Vacunas", "Urgencias leves", "Productos"],
    },
    {
      re: /transport|mudanz|flete|courier/i,
      items: ["Traslados", "Cargas", "Embalaje", "Zona local y cercana"],
    },
    {
      re: /tecno|comput|informatic|software|web/i,
      items: ["Soporte", "Configuración", "Desarrollo web", "Consultoría"],
    },
    {
      re: /autom|mecan|neumatic|lubric/i,
      items: ["Mantenimiento", "Diagnóstico", "Neumáticos", "Fluidos"],
    },
    {
      re: /salud|fisio|kinesio|nutri|medic/i,
      items: ["Consultas", "Sesiones", "Seguimiento", "Coordinación por WhatsApp"],
    },
  ];

  for (const { re, items } of bloques) {
    if (re.test(t)) return items;
  }

  const r = String(rubroNombre || "").trim();
  if (r) {
    return [
      `Servicios de ${r}`,
      "Cotización sin compromiso",
      "Atención en tu zona",
      "Respuesta por WhatsApp",
    ];
  }
  return [
    "Servicios profesionales",
    "Cotización sin compromiso",
    "Atención en tu zona",
    "Respuesta por WhatsApp",
  ];
}

/**
 * Lista de servicios: subcategorías de BD o, si faltan, sugerencias por rubro.
 */
export function serviciosFichaLista(args: {
  subcategorias: string[];
  rubroPrincipal: string;
  categoriaSlug?: string;
}): string[] {
  const subs = (args.subcategorias || []).map((x) => String(x).trim()).filter(Boolean);
  if (subs.length) return subs;
  return serviciosSugeridosPorRubro(args.rubroPrincipal, args.categoriaSlug);
}

/** Evita “Especialista en X” cuando el copy dice oferta general / todo tipo. */
function textoSuenaOfertaGeneral(...parts: string[]): boolean {
  const blob = parts
    .map((x) => String(x || "").toLowerCase())
    .join(" ");
  return /\b(en general|gasfiter[ií]a general|servicios generales|todo tipo|todos los tipos|amplia gama|variedad de|trabajos de)\b/.test(
    blob,
  );
}

/**
 * Línea de valor bajo el nombre (subcategoría, frase de negocio o fragmento de descripción).
 */
export function lineaValorBajoNombre(opts: {
  fraseCorta: string;
  fraseNegocio?: string | null;
  subcategoriaPrincipal?: string;
  descripcionAmplia?: string | null;
}): string {
  const fc = String(opts.fraseCorta || "").trim().toLowerCase();
  const descFull = String(opts.descripcionAmplia || "")
    .trim()
    .replace(/\s+/g, " ");
  const evitarEspecialista =
    textoSuenaOfertaGeneral(fc, descFull, String(opts.fraseNegocio || "")) ||
    textoSuenaOfertaGeneral(String(opts.subcategoriaPrincipal || ""));

  const uniq = (raw: string, prefixEspecialista?: boolean) => {
    const t = String(raw || "").trim();
    if (!t || t.toLowerCase() === fc) return "";
    if (/^especialista\b/i.test(t)) return t;
    const usePrefix = prefixEspecialista && !evitarEspecialista && !textoSuenaOfertaGeneral(t);
    if (usePrefix && t.length <= 72) {
      const rest = t.charAt(0).toLowerCase() + t.slice(1);
      return `Especialista en ${rest}`;
    }
    return t.length <= 100 ? t : "";
  };

  const fromNeg = uniq(String(opts.fraseNegocio || ""), true);
  if (fromNeg) return fromNeg;

  const sub = String(opts.subcategoriaPrincipal || "").trim();
  const fromSub = uniq(sub, true);
  if (fromSub) return fromSub;

  const desc = descFull;
  if (desc.length >= 24) {
    const first = desc.split(/[.!?]\s+/)[0]?.trim() || desc.slice(0, 120);
    const line = first.length > 120 ? `${first.slice(0, 117)}…` : first;
    if (line.length >= 20 && line.toLowerCase() !== fc) return line;
  }

  return "";
}

/**
 * Segunda línea de valor bajo la frase corta (evita duplicar la misma frase).
 */
export function lineaValorExtraFicha(opts: {
  fraseCorta: string;
  fraseNegocio?: string | null;
  lineaClave?: string;
  especialidadSubcategoria?: string;
}): string {
  const short = String(opts.fraseCorta || "").trim().toLowerCase();
  const uniq = (raw: string) => {
    const t = String(raw || "").trim();
    if (!t || t.toLowerCase() === short) return "";
    return t;
  };
  return (
    uniq(String(opts.fraseNegocio || "")) ||
    uniq(String(opts.lineaClave || "")) ||
    uniq(String(opts.especialidadSubcategoria || ""))
  );
}

/**
 * 3–4 beneficios honestos para ficha completa (sin ratings ni claims falsos).
 */
export function destacadosPerfilCompleto(opts: {
  tieneWhatsapp: boolean;
  flags: ComoAtiendeFlags;
  tieneUbicacionComuna: boolean;
}): string[] {
  const acc: string[] = [];
  if (opts.tieneWhatsapp) acc.push("Respuesta rápida");
  if (
    opts.flags.presencialTerrenoLegacy &&
    !opts.flags.delivery &&
    !opts.flags.domicilio
  ) {
    acc.push("A domicilio / Delivery");
  }
  if (opts.flags.delivery) acc.push("Delivery");
  if (opts.flags.domicilio) acc.push("Atención a domicilio");
  if (opts.flags.localFisico) acc.push("Local físico");
  if (opts.flags.online) acc.push("Atención online");
  if (opts.tieneUbicacionComuna) acc.push("Disponible en tu comuna");
  acc.push("Presupuesto sin compromiso");
  const seen = new Set<string>();
  const uniq = acc.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return uniq.slice(0, 4);
}

/**
 * Destacados dinámicos (máx 3) para ficha completa.
 * Reglas producto: se derivan solo de datos reales (cobertura, modalidad, whatsapp).
 */
export function destacadosDinamicosFichaCompleta(opts: {
  disponibleEnComuna: boolean;
  atencionDomicilio: boolean;
  tieneWhatsapp: boolean;
}): string[] {
  const out: string[] = [];
  if (opts.disponibleEnComuna) out.push("Disponible en tu comuna");
  if (opts.atencionDomicilio) out.push("Atención a domicilio");
  if (opts.tieneWhatsapp) out.push("Respuesta rápida por WhatsApp");
  return out.slice(0, 3);
}

/**
 * Primera letra alfabética en mayúscula (es-CL); respeta símbolos previos (¿, ", etc.).
 */
export function capitalizaPrimeraLetraVisible(text: string): string {
  const t = String(text || "");
  const m = /\p{L}/u.exec(t);
  if (!m || m.index === undefined) return t;
  const i = m.index;
  const ch = t[i];
  return t.slice(0, i) + ch.toLocaleUpperCase("es-CL") + t.slice(i + 1);
}

export function clampDescripcionCortaFichaDisplay(raw: string, max = DESCRIPCION_CORTA_FICHA_MAX): string {
  const t = String(raw || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  let out: string;
  if (t.length <= max) out = t;
  else {
    const cut = t.slice(0, max - 1).trimEnd();
    const lastSpace = cut.lastIndexOf(" ");
    const base = lastSpace > 32 ? cut.slice(0, lastSpace) : cut;
    out = `${base}…`;
  }
  return capitalizaPrimeraLetraVisible(out);
}

/**
 * Texto corto para cards (búsqueda, similares): `descripcion_corta` si cumple mínimo público,
 * si no `frase_negocio` si cumple mínimo, si no línea de rubro (fallback) — siempre acotado a 120.
 * No usa descripción larga (evita duplicar cuerpo de ficha en listados).
 */
export function textoResumenListadoEmprendedor(opts: {
  descripcionCorta: string;
  fraseNegocio: string;
  fallbackLine: string;
}): string {
  const c = String(opts.descripcionCorta || "").trim().replace(/\s+/g, " ");
  if (c.length >= DESCRIPCION_CORTA_FICHA_MIN) {
    return clampDescripcionCortaFichaDisplay(c);
  }
  const f = String(opts.fraseNegocio || "").trim().replace(/\s+/g, " ");
  if (f.length >= DESCRIPCION_CORTA_FICHA_MIN) {
    return clampDescripcionCortaFichaDisplay(f);
  }
  const fb = String(opts.fallbackLine || "").trim().replace(/\s+/g, " ");
  if (!fb) return "";
  return clampDescripcionCortaFichaDisplay(fb);
}

/**
 * Bloque "Servicios": ocultar sugeridos genéricos; con 1–2 etiquetas débiles, no mostrar lista.
 */
export function debeMostrarListaServiciosFicha(opts: {
  /** Lista que se pintaría (subcategorías reales o sugeridos). */
  etiquetas: string[];
  /** True si no hay subcategorías en BD / taxonomía y se usarían solo sugeridos por rubro. */
  soloSugeridosGenericos: boolean;
}): boolean {
  if (opts.soloSugeridosGenericos) return false;
  const t = (opts.etiquetas || []).map((x) => String(x).trim()).filter(Boolean);
  if (t.length >= 3) return true;
  if (t.length === 0) return false;
  const poor = (x: string) => x.length < 4 || /^servicios?$/i.test(x);
  const good = t.filter((x) => !poor(x));
  if (t.length <= 2) return good.length >= 2 && t.every((x) => x.length >= 5);
  return good.length >= 2;
}

/**
 * Lista “Perfil completo incluye” (columna derecha): cobertura + modalidades + WhatsApp.
 * La dirección del local se muestra aparte en el pie del bloque (solo local físico).
 */
export function perfilCompletoIncluyeLineas(opts: {
  disponibleEnComuna: boolean;
  flags: ComoAtiendeFlags;
  tieneWhatsapp: boolean;
}): string[] {
  const out: string[] = [];
  if (opts.disponibleEnComuna) out.push("Disponible en tu comuna");
  if (opts.flags.localFisico) out.push("Atención en local físico");
  if (
    opts.flags.presencialTerrenoLegacy &&
    !opts.flags.delivery &&
    !opts.flags.domicilio
  ) {
    out.push("A domicilio / Delivery");
  }
  if (opts.flags.delivery) out.push("Delivery");
  if (opts.flags.domicilio) out.push("Atención a domicilio");
  if (opts.flags.online) out.push("Atención online");
  if (opts.tieneWhatsapp) out.push("Respuesta rápida por WhatsApp");
  out.push("Más información");
  return out;
}

export const TEXTO_FICHA_BASICA_AVISO =
  "Esta ficha muestra información básica. Para más detalles, contacta directo por WhatsApp.";
