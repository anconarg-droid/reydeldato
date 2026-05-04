import { normalizeText } from "@/lib/search/normalizeText";

function prettySubcategoriaSlugForDisplay(slug: string): string {
  const v = String(slug ?? "").trim();
  if (!v) return "";
  return v
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export type ActivacionDirectorioCtasInput = {
  comunaSlug: string;
  /** Nombre visible de la comuna (con tildes). */
  comunaNombreTitulo: string;
  qDisplayRaw: string;
  subcategoriaSlug?: string;
  subcategoriaId?: string;
  categoriaSlug?: string;
};

export function buildActivacionDirectorioCtas({
  comunaSlug,
  comunaNombreTitulo,
  qDisplayRaw,
  subcategoriaSlug = "",
  subcategoriaId = "",
  categoriaSlug = "",
}: ActivacionDirectorioCtasInput) {
  const comuna = comunaSlug.trim();
  const tituloComunaDisplay = comunaNombreTitulo.trim();
  const qParaTodoChile = qDisplayRaw.trim();
  const qNormTodoChile = qParaTodoChile ? normalizeText(qParaTodoChile) : "";

  const servicioHintParaCta =
    qParaTodoChile ||
    (subcategoriaSlug ? prettySubcategoriaSlugForDisplay(subcategoriaSlug) : "") ||
    (categoriaSlug ? prettySubcategoriaSlugForDisplay(categoriaSlug) : "") ||
    "";

  let servicioEtiqueta =
    qParaTodoChile ||
    (subcategoriaSlug ? prettySubcategoriaSlugForDisplay(subcategoriaSlug) : "") ||
    (categoriaSlug ? prettySubcategoriaSlugForDisplay(categoriaSlug) : "");
  if (!servicioEtiqueta && subcategoriaId) servicioEtiqueta = "este rubro";
  if (!servicioEtiqueta) servicioEtiqueta = "servicios";

  const paramsPublicar = new URLSearchParams();
  paramsPublicar.set("comuna", comuna);
  if (servicioHintParaCta) paramsPublicar.set("servicio", servicioHintParaCta);

  const paramsRecomendar = new URLSearchParams();
  paramsRecomendar.set("comuna", comuna);
  if (tituloComunaDisplay) paramsRecomendar.set("comuna_nombre", tituloComunaDisplay);
  if (servicioHintParaCta) paramsRecomendar.set("servicio", servicioHintParaCta);

  const qSnippetActivacion =
    qParaTodoChile.length > 48 ? `${qParaTodoChile.slice(0, 48)}…` : qParaTodoChile;

  return {
    paramsPublicar,
    paramsRecomendar,
    servicioEtiqueta,
    qParaTodoChile,
    qNormTodoChile,
    qSnippetActivacion,
    servicioHintParaCta,
  };
}
