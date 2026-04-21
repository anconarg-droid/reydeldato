import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import {
  normalizeKeywordsUsuarioFromDbValue,
  parseKeywordsUsuarioInputToTextArray,
  readKeywordsUsuarioPreferJson,
} from "@/lib/keywordsUsuarioPostulacion";
import {
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { chileWhatsappStorageToDisplay } from "@/utils/phone";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Subset alineado con `SimpleForm` en PublicarSimpleClient. */
function keywordsUsuarioTextFromPanelItem(item: Record<string, unknown>): string {
  const fromRow = readKeywordsUsuarioPreferJson(item);
  if (fromRow.length) return fromRow.join(", ");
  const v = item.palabras_clave;
  if (Array.isArray(v)) return normalizeKeywordsUsuarioFromDbValue(v).join(", ");
  if (typeof v === "string") return v.trim();
  return "";
}

export type BasicsFormFromPanel = {
  nombre: string;
  email: string;
  whatsapp: string;
  descripcionNegocio: string;
  descripcionLarga: string;
  keywordsUsuario: string;
  comunaBase: string;
  coberturaTipo: string;
  comunasCobertura: string[];
  regionesCobertura: string[];
  modalidades: string[];
  aceptaTerminosPrivacidad: boolean;
};

/**
 * Mapea `item` de GET `/api/panel/negocio` al formulario simple de /publicar.
 */
export function basicsFormFromPanelNegocioItem(
  item: Record<string, unknown>
): BasicsFormFromPanel {
  const cobRaw = s(item.coberturaTipo).toLowerCase();
  let coberturaTipo = "";
  if (cobRaw === "solo_comuna") coberturaTipo = "solo_mi_comuna";
  else if (cobRaw === "varias_comunas") coberturaTipo = "varias_comunas";
  else if (cobRaw === "regional") coberturaTipo = "varias_regiones";
  else if (cobRaw === "nacional") coberturaTipo = "nacional";

  const modsRaw = Array.isArray(item.modalidadesAtencion)
    ? (item.modalidadesAtencion as unknown[]).map((x) => s(x))
    : [];

  return {
    nombre: s(item.nombre ?? item.nombre_emprendimiento),
    email: s(item.email).toLowerCase(),
    whatsapp: chileWhatsappStorageToDisplay(s(item.whatsapp)),
    descripcionNegocio: s(item.descripcionCorta ?? item.frase_negocio),
    descripcionLarga: s(item.descripcionLarga),
    keywordsUsuario: keywordsUsuarioTextFromPanelItem(item),
    comunaBase: s(item.comunaBaseSlug),
    coberturaTipo,
    comunasCobertura: Array.isArray(item.comunasCoberturaSlugs)
      ? (item.comunasCoberturaSlugs as unknown[]).map((x) => s(x)).filter(Boolean)
      : [],
    regionesCobertura: Array.isArray(item.regionesCoberturaSlugs)
      ? (item.regionesCoberturaSlugs as unknown[]).map((x) => s(x)).filter(Boolean)
      : [],
    modalidades: modalidadesAtencionInputsToDbUnique(modsRaw),
    aceptaTerminosPrivacidad: true,
  };
}

/**
 * Cuerpo PUT `/api/panel/negocio` para persistir solo campos del formulario básico,
 * manteniendo taxonomía / media / secundarios desde el snapshot `item`.
 */
export function panelNegocioPutBodyBasics(
  form: BasicsFormFromPanel,
  item: Record<string, unknown>
): Record<string, unknown> {
  const comuna_base_slug = form.comunaBase.trim();
  const cobertura_tipo = form.coberturaTipo.trim() || "solo_mi_comuna";

  let comunas_cobertura_slugs: string[] = [];
  let regiones_cobertura_slugs: string[] = [];

  if (cobertura_tipo === "varias_regiones") {
    regiones_cobertura_slugs = [...form.regionesCobertura];
  } else if (cobertura_tipo === "varias_comunas") {
    comunas_cobertura_slugs = [...form.comunasCobertura];
  }

  /**
   * No enviar foto/galería: el snapshot del primer GET puede quedar desactualizado si el usuario
   * subió imágenes en `/mejorar-ficha`; mandarlas aquí pisaba el servidor con datos viejos.
   * (NegocioForm sigue enviando `galeria_urls` / `foto_principal_url` cuando edita ahí.)
   */
  return {
    nombre: form.nombre.trim(),
    email: form.email.trim().toLowerCase(),
    whatsapp: form.whatsapp.trim(),
    comuna_base_slug,
    cobertura_tipo,
    comunas_cobertura_slugs,
    regiones_cobertura_slugs,
    descripcion_corta: normalizeDescripcionCorta(form.descripcionNegocio),
    descripcion_larga: normalizeDescripcionLarga(form.descripcionLarga),
    instagram: s(item.instagram),
    web: s(item.web ?? item.sitio_web),
    whatsapp_secundario: s(item.whatsappSecundario),
    responsable_nombre: s(item.responsable),
    mostrar_responsable: item.mostrarResponsable === true,
    categoria_slug: s(item.categoriaSlug),
    subcategorias_slugs: Array.isArray(item.subcategoriasSlugs)
      ? (item.subcategoriasSlugs as unknown[]).map((x) => s(x)).filter(Boolean)
      : [],
    modalidades_atencion: modalidadesAtencionInputsToDbUnique(form.modalidades),
    keywords_usuario: parseKeywordsUsuarioInputToTextArray(form.keywordsUsuario),
  };
}
