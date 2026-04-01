import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalGallery from "./PortalGallery";
import TrackedActionButton from "./TrackedActionButton";
import ShareFichaButton from "./ShareFichaButton";
import TrackView from "@/components/TrackView";
import BackLink from "@/components/BackLink";
import SimilaresFichaSection from "@/components/cards/SimilaresFichaSection";
import {
  buildWhatsappUrl,
  buildInstagramUrl,
  buildWebsiteUrl,
  formatWhatsappDisplay,
  formatInstagramDisplay,
  formatWebsiteDisplay,
} from "@/lib/formatPublicLinks";
import {
  coberturaTexto,
  coberturaBadge,
  normalizeCoberturaTipoDb,
} from "@/lib/cobertura";
import { calcularEstadoFicha } from "@/lib/estadoFicha";
import { getEmprendedorPublicoBySlug } from "@/lib/getEmprendedorPublicoBySlug";
import { getSimilaresFicha } from "@/lib/getSimilaresFicha";
import {
  buildDescripcionFallback,
  buildEstadoVacioFicha,
  buildSubtituloFicha,
  limpiarTexto,
} from "@/lib/emprendedorProfileCopy";

type Emprendedor = {
  id?: string | number | null;
  slug: string;
  nombre: string;
  /** Alias BD / panel (mismo valor que `nombre` en muchas filas). */
  nombre_emprendimiento?: string | null;
  descripcion_corta?: string;
  descripcion_larga?: string;

  categoria_id?: string | number | null;
  categoria_nombre?: string;
  categoria_slug?: string;
  subcategorias_nombres_arr?: string[];
  subcategorias_slugs_arr?: string[];

  comuna_id?: string | number | null;
  comuna_base_id?: string | number | null;
  comuna_nombre?: string;
  comuna_slug?: string;
  region_id?: string | number | null;
  region_nombre?: string;
  region_slug?: string;

  cobertura_tipo?: string;
  cobertura_comunas_arr?: string[];
  cobertura_comunas_slugs_arr?: string[];
  cobertura_regiones_arr?: string[];
  cobertura_regiones_slugs_arr?: string[];
  regiones_cobertura_nombres_arr?: string[];
  regiones_cobertura_slugs_arr?: string[];

  modalidades_atencion_arr?: string[];

  foto_principal_url?: string;
  galeria_urls_arr?: string[];

  whatsapp?: string;
  whatsapp_principal?: string | null;
  instagram?: string;
  sitio_web?: string;
  email?: string;

  responsable_nombre?: string;
  mostrar_responsable?: boolean;

  direccion?: string;

  estado_publicacion?: string;
  destacado?: boolean;
  updated_at?: string | null;

  web?: string;
  nivel_cobertura?: string;
  comunas_cobertura_nombres_arr?: string[];
  modalidades_atencion?: string[];
  galeria_urls?: string[];
  comuna_base_nombre?: string;
  comuna_base_slug?: string;

  plan?: string;
  trial_expira?: string | null;
  trial_inicia_at?: string | null;
  trial_expira_at?: string | null;
  created_at?: string | null;
  plan_tipo?: string | null;
  plan_periodicidad?: string | null;
  plan_activo?: boolean | null;
  plan_inicia_at?: string | null;
  plan_expira_at?: string | null;

  tipo_actividad?: string | null;
  sector_slug?: string | null;
  tags_slugs?: string[] | null;
  clasificacion_confianza?: number | null;

  subcategoria_principal_id?: string | number | null;
  subcategoria_principal_nombre?: string;
  subcategoria_principal_slug?: string;
  subcategorias_slugs?: string[];
  categoria_slug_final?: string;
  subcategoria_slug_final?: string;
  keywords_finales?: string[];
  keywords?: string[];
  modalidad_atencion?: string[];
  comunas_cobertura?: string[];

  /** Alias BD (descripción larga / frase corta comercial) */
  descripcion_libre?: string;
  frase_negocio?: string;
  cobertura_label?: string;
  cobertura_tipo_label?: string;
};

type SimilarFichaItem = import("@/lib/getSimilaresFicha").SimilarFichaItem;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (x == null ? "" : String(x).trim())).filter(Boolean);
}

function subtituloClave(subtitulo: string): string {
  const t = s(subtitulo).replace(/\.$/, "").trim();
  if (!t) return "";
  // Preferimos "·" sobre "y" para lectura rápida.
  return t.replace(/\s+y\s+atenci[oó]n\s+/i, " · Atención ");
}

function normalizeSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

function activarFichaWhatsappHref(slug: string) {
  const rawNumber = s(process.env.NEXT_PUBLIC_ACTIVAR_FICHA_WHATSAPP);
  const number = rawNumber.replace(/\D/g, "");
  if (!number) return "/publicar";
  const text = `Hola quiero activar mi ficha en Rey del Dato (${slug})`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

async function getEmprendedor(slug: string): Promise<Emprendedor | null> {
  const item = await getEmprendedorPublicoBySlug(slug);
  return item as Emprendedor | null;
}

async function getSimilaresFichaUI(current: Emprendedor): Promise<SimilarFichaItem[]> {
  return await getSimilaresFicha({ current, limit: 8 });
}

function buildMailUrl(email: string) {
  const value = s(email);
  return value ? `mailto:${value}` : "";
}

function buildPhoneUrl(phone: string) {
  const clean = s(phone).replace(/\D/g, "");
  return clean ? `tel:${clean}` : "";
}

function isInformado(val: unknown): boolean {
  const t = s(val);
  if (!t) return false;
  const low = t.toLowerCase();
  if (low === "no informado") return false;
  if (low === "no informada") return false;
  if (low === "sin descripción") return false;
  if (low === "-") return false;
  return true;
}

type DescCheckCtx = { categoriaNombre: string; comunaNombre: string };
type DescMode = "larga" | "corta";

/** Texto de descripción que no aporta al visitante (plantillas, interno, muy corto). */
function descripcionEsPocoUtilParaPublico(
  text: unknown,
  ctx: DescCheckCtx,
  mode: DescMode
): boolean {
  const t = s(text);
  if (!t) return true;
  if (
    /\b(interno|borrador|pendiente|no publicar|uso interno|privado|test|ranking|placeholder|lorem|ipsum)\b/i.test(
      t
    )
  )
    return true;
  if (/\bpruebas?\b/i.test(t)) return true;
  if (/test\s+score/i.test(t)) return true;
  const min = mode === "larga" ? 40 : 22;
  if (t.length < min) return true;
  const low = t.toLowerCase().trim();
  const cat = s(ctx.categoriaNombre).toLowerCase();
  const com = s(ctx.comunaNombre).toLowerCase();
  if (cat && com) {
    const plantilla = `${cat} en ${com}`;
    if (low === plantilla || low === `${plantilla}.`) return true;
  }
  if (/^servicios\s+para\s+hogares/i.test(t) && t.length < 120) return true;
  return false;
}

function capitalizaOracion(q: string): string {
  const t = s(q);
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function limpiaDondeEtiqueta(raw: string): string {
  let t = s(raw).replace(/\.$/, "").trim();
  t = t.replace(/^atiende\s+en\s+/i, "").trim();
  return t;
}

/**
 * Frase principal autogenerada: servicio (subcategoría o categoría) + comuna base + cobertura.
 * Ej.: "Servicios para el hogar en Padre Hurtado y atención en varias regiones"
 */
function buildFraseAutoFichaCompleta(opts: {
  subcategoriaNombre: string;
  categoriaNombre: string;
  comunaBaseNombre: string;
  coberturaTipo: string;
}): string {
  const servicioRaw = isInformado(opts.subcategoriaNombre)
    ? opts.subcategoriaNombre
    : isInformado(opts.categoriaNombre)
      ? opts.categoriaNombre
      : "Servicio";
  const servicio = capitalizaOracion(servicioRaw);
  const base = s(opts.comunaBaseNombre);
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);

  if (tipo === "nacional") {
    if (base) {
      return `${servicio} en ${base} con cobertura en todo Chile`;
    }
    return `${servicio} con cobertura en todo Chile`;
  }

  let sufijo = "";
  if (tipo === "solo_comuna") sufijo = "";
  else if (tipo === "varias_comunas") sufijo = " y alrededores";
  else if (tipo === "varias_regiones") sufijo = " y atención en varias regiones";

  if (!base) {
    if (tipo === "varias_regiones") {
      return `${servicio} con atención en varias regiones`;
    }
    if (tipo === "varias_comunas") {
      return `${servicio} en la zona y alrededores`;
    }
    return servicio;
  }

  return `${servicio} en ${base}${sufijo}`;
}

/** Texto breve de cobertura para "Atiende en …" en la descripción automática. */
function coberturaFragmentoLectura(opts: {
  coberturaTipo: string;
  coberturaDisplay: string;
  comunaNombre: string;
}): string {
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);
  if (tipo === "nacional") return "todo Chile";
  if (tipo === "solo_comuna") return s(opts.comunaNombre) || "su comuna base";
  if (tipo === "varias_comunas") {
    if (isInformado(opts.coberturaDisplay)) {
      const d = limpiaDondeEtiqueta(opts.coberturaDisplay);
      if (!/^solo en su comuna$/i.test(d)) return d;
    }
    return "varias comunas y alrededores";
  }
  if (tipo === "varias_regiones") return "varias regiones";
  if (isInformado(opts.coberturaDisplay)) return limpiaDondeEtiqueta(opts.coberturaDisplay);
  return "su zona de cobertura";
}

const CIERRE_WHATSAPP_FICHA = "Contáctalo por WhatsApp para coordinar.";
const CIERRE_WHATSAPP_FICHA_LEGACY =
  "Escríbele directamente por WhatsApp para coordinar.";

/**
 * Descripción automática cuando la del usuario no sirve (vacía, corta o interna).
 * El cierre de acción se añade en `buildDescripcionParaUsuario` vía `appendCierreWhatsapp`.
 */
function buildDescripcionAutoFichaCompleta(opts: {
  rubro: string;
  categoriaNombre: string;
  comunaNombre: string;
  coberturaTipo: string;
  coberturaDisplay: string;
}): string {
  const servicioRaw = isInformado(opts.rubro)
    ? opts.rubro
    : isInformado(opts.categoriaNombre)
      ? opts.categoriaNombre
      : "Servicio";
  const servicio = capitalizaOracion(servicioRaw);
  const comuna = s(opts.comunaNombre);
  const cob = coberturaFragmentoLectura({
    coberturaTipo: opts.coberturaTipo,
    coberturaDisplay: opts.coberturaDisplay,
    comunaNombre: opts.comunaNombre,
  });

  const parte1 = comuna
    ? `${servicio} con base en ${comuna}.`
    : `${servicio}.`;
  return `${parte1} Atiende en ${cob}.`;
}

function appendCierreWhatsapp(body: string): string {
  const t = s(body);
  if (!t) return CIERRE_WHATSAPP_FICHA;
  if (t.includes(CIERRE_WHATSAPP_FICHA)) return t;
  if (t.includes(CIERRE_WHATSAPP_FICHA_LEGACY)) return t;
  const base = t.endsWith(".") ? t.slice(0, -1).trim() : t.trim();
  return `${base}. ${CIERRE_WHATSAPP_FICHA}`;
}

/** Fragmento corto para "dónde" (sin repetir "Atiende en"). */
function dondeAtiendeFrase(opts: {
  coberturaTipo: string;
  coberturaDisplay: string;
  comunaNombre: string;
}): string {
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);
  if (tipo === "nacional") return "todo Chile";
  if (isInformado(opts.coberturaDisplay)) {
    const disp = limpiaDondeEtiqueta(opts.coberturaDisplay);
    if (
      tipo === "solo_comuna" &&
      s(opts.comunaNombre) &&
      /^solo en su comuna$/i.test(disp)
    ) {
      return s(opts.comunaNombre);
    }
    return disp;
  }
  if (s(opts.comunaNombre)) return s(opts.comunaNombre);
  if (tipo === "varias_comunas") return "varias comunas de la región";
  if (tipo === "varias_regiones") return "varias regiones";
  return "";
}

/** Frase bajo el nombre (ficha completa): qué hace + dónde atiende. */
function buildFrasePrincipalCompleta(opts: {
  descripcionCorta: string;
  rubro: string;
  categoriaNombre: string;
  coberturaDisplay: string;
  comunaNombre: string;
  coberturaTipo: string;
}): string {
  const ctx: DescCheckCtx = {
    categoriaNombre: opts.categoriaNombre,
    comunaNombre: opts.comunaNombre,
  };
  const queRaw = isInformado(opts.rubro)
    ? opts.rubro
    : isInformado(opts.categoriaNombre)
      ? opts.categoriaNombre
      : "";
  const donde = dondeAtiendeFrase(opts);
  const corta = s(opts.descripcionCorta);
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);

  if (corta && !descripcionEsPocoUtilParaPublico(corta, ctx, "corta")) {
    const base = corta.endsWith(".") ? corta : `${corta}.`;
    if (!donde) return base;
    const menciona =
      donde.length > 2 &&
      corta.toLowerCase().includes(donde.toLowerCase().slice(0, Math.min(8, donde.length)));
    if (menciona) return base;
    const cola =
      tipo === "nacional" ? " Atiende en todo Chile." : ` Atiende en ${donde}.`;
    return `${base}${cola}`.replace(/\.\.+/g, ".").trim();
  }

  const fraseAuto = buildFraseAutoFichaCompleta({
    subcategoriaNombre: opts.rubro,
    categoriaNombre: opts.categoriaNombre,
    comunaBaseNombre: opts.comunaNombre,
    coberturaTipo: opts.coberturaTipo,
  });
  const auto = s(fraseAuto);
  if (auto) {
    return auto.endsWith(".") ? auto : `${auto}.`;
  }

  if (queRaw && donde) {
    return `${capitalizaOracion(queRaw)}. Atiende en ${donde}.`;
  }
  if (queRaw) {
    if (tipo === "nacional")
      return `${capitalizaOracion(queRaw)}. Atiende en todo Chile.`;
    return `${capitalizaOracion(queRaw)}.`;
  }
  if (donde) {
    return `Servicios en la zona. Atiende en ${donde}.`;
  }
  return "Escribe por WhatsApp para coordinar servicios y zona de atención.";
}

function buildDescripcionParaUsuario(opts: {
  descripcionLarga: string;
  descripcionCorta: string;
  rubro: string;
  categoriaNombre: string;
  coberturaDisplay: string;
  comunaNombre: string;
  coberturaTipo: string;
  frasePrincipalCompleta: string;
}): string {
  const ctx: DescCheckCtx = {
    categoriaNombre: opts.categoriaNombre,
    comunaNombre: opts.comunaNombre,
  };
  const larga = s(opts.descripcionLarga);
  let core: string;
  if (larga && !descripcionEsPocoUtilParaPublico(larga, ctx, "larga")) {
    core = larga;
  } else {
    const corta = s(opts.descripcionCorta);
    if (corta && !descripcionEsPocoUtilParaPublico(corta, ctx, "corta")) {
      core = corta;
    } else {
      const out = buildDescripcionAutoFichaCompleta({
        rubro: opts.rubro,
        categoriaNombre: opts.categoriaNombre,
        comunaNombre: opts.comunaNombre,
        coberturaTipo: opts.coberturaTipo,
        coberturaDisplay: opts.coberturaDisplay,
      });
      const fp = opts.frasePrincipalCompleta.replace(/\s+/g, " ").trim();
      const o = out.replace(/\s+/g, " ").trim();
      core =
        o === fp || o.replace(/\.$/, "") === fp.replace(/\.$/, "")
          ? `${out} Pregunta por disponibilidad y valores por el mismo canal.`
          : out;
    }
  }
  return appendCierreWhatsapp(core);
}

function mencionadoEnFrase(frase: string, fragment: string): boolean {
  const f = s(frase).toLowerCase();
  const frag = s(fragment).toLowerCase().replace(/\.$/, "").trim();
  return frag.length >= 4 && f.includes(frag);
}

function senalContactoFicha(opts: {
  tieneWhatsapp: boolean;
  updatedAt: string | null | undefined;
}): { titulo: string; subtitulo?: string } | null {
  if (opts.tieneWhatsapp) {
    return { titulo: "Respuesta rápida por WhatsApp" };
  }
  const raw = s(opts.updatedAt);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days <= 45) return { titulo: "Activo recientemente" };
  return null;
}

function modalidadesTexto(list?: string[]) {
  if (!list?.length) return "";

  const map: Record<string, string> = {
    local: "Local físico",
    local_fisico: "Local físico",
    domicilio: "A domicilio",
    online: "Online",
    presencial: "Presencial",
    fisico: "Físico",
    presencial_terreno: "Presencial en terreno",
  };

  return list.map((v) => map[v] || v).join(" • ");
}

function prettySubcategoriaPath(list?: string[]) {
  if (!list?.length) return "";
  return s(list[0]);
}

function prettyFromSlug(slug: string): string {
  const base = s(slug).replace(/[-_]+/g, " ").trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 14,
        fontSize: 15,
        lineHeight: 1.55,
      }}
    >
      <div style={{ fontWeight: 800, color: "#111827" }}>{label}</div>
      <div style={{ color: "#374151" }}>{value || "-"}</div>
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getEmprendedor(slug);

  if (!item) {
    return {
      title: "Ficha no encontrada | Rey del Dato",
      description: "No encontramos la ficha solicitada.",
    };
  }

  const comuna = s(item.comuna_nombre || item.comuna_base_nombre) || "tu comuna";
  const categoria = s(item.categoria_nombre) || "servicios";
  const title = `${item.nombre} en ${comuna} | Rey del Dato`;
  const description =
    s(item.descripcion_corta) ||
    `${item.nombre}. ${categoria} en ${comuna}. Contacta directo por WhatsApp y revisa su ficha.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.foto_principal_url ? [item.foto_principal_url] : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getEmprendedor(slug);

  if (!item) notFound();

  const comunaNombre = item.comuna_nombre || item.comuna_base_nombre || "";
  const comunaSlug = item.comuna_slug || item.comuna_base_slug || "";
  const coberturaTipo = item.cobertura_tipo || item.nivel_cobertura || "";
  const coberturaComunas =
    item.cobertura_comunas_arr || item.comunas_cobertura_nombres_arr || [];
  const modalidades =
    item.modalidad_atencion ||
    item.modalidades_atencion_arr ||
    item.modalidades_atencion ||
    [];
  const galeria = item.galeria_urls_arr || item.galeria_urls || [];
  const sitioWeb = item.sitio_web || item.web || "";

  const whatsappUrl = buildWhatsappUrl(item.whatsapp || "");
  const instagramUrl = buildInstagramUrl(item.instagram || "");
  const webUrl = buildWebsiteUrl(sitioWeb);
  const phoneUrl = buildPhoneUrl(item.whatsapp || "");

  const senalContacto = senalContactoFicha({
    tieneWhatsapp: Boolean(whatsappUrl),
    updatedAt: item.updated_at,
  });

  const whatsappText = formatWhatsappDisplay(item.whatsapp || "");
  const instagramText = formatInstagramDisplay(item.instagram || "");
  const webText = formatWebsiteDisplay(sitioWeb);

  const cobertura = coberturaTexto(coberturaTipo, coberturaComunas);
  const modalidadesTextoFinal = modalidadesTexto(modalidades);
  const tieneLocalFisico = modalidades.includes("local_fisico");

  const frase =
    item.descripcion_corta ||
    `${item.categoria_nombre || "Servicio"} en ${
      comunaNombre || "tu comuna"
    }`;

  const siteUrl = normalizeSiteUrl();
  const shareUrl = `${siteUrl}/emprendedor/${item.slug}`;

  const subcategorias = arr(item.subcategorias_nombres_arr);
  const subcategoriaSlugs = arr(item.subcategorias_slugs_arr);
  const subcategoriasSlugsFinal = arr(item.subcategorias_slugs).length
    ? arr(item.subcategorias_slugs)
    : subcategoriaSlugs;
  const subcategoriaSlugFinal = s(item.subcategoria_slug_final);
  const subcategoriaSlugPrincipal =
    s(item.subcategoria_principal_slug) ||
    subcategoriaSlugFinal ||
    prettySubcategoriaPath(subcategoriasSlugsFinal);

  const subcategoriaPrincipalTitulo =
    s(item.subcategoria_principal_nombre) ||
    s(subcategorias[0]) ||
    (subcategoriaSlugPrincipal ? prettyFromSlug(subcategoriaSlugPrincipal) : "") ||
    "";

  const etiquetaCategoriaVisible =
    isInformado(item.categoria_nombre)
      ? s(item.categoria_nombre)
      : isInformado(subcategoriaPrincipalTitulo)
        ? subcategoriaPrincipalTitulo
        : "";

  const subcatsForList = (() => {
    const all = subcategorias.length
      ? subcategorias
      : subcategoriasSlugsFinal.map(prettyFromSlug).filter(Boolean);

    const uniq: string[] = [];
    const seen = new Set<string>();

    const push = (x: string) => {
      const k = s(x).toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k);
      uniq.push(s(x));
    };

    if (isInformado(subcategoriaPrincipalTitulo)) {
      push(subcategoriaPrincipalTitulo);
    }
    all.forEach(push);
    return uniq.filter((x) => isInformado(x));
  })();

  const comunasCoberturaFinal = arr(item.comunas_cobertura);
  const coberturaDisplay =
    comunasCoberturaFinal.length > 0
      ? comunasCoberturaFinal.join(", ")
      : coberturaComunas.length > 0
      ? coberturaComunas.join(", ")
      : coberturaTipo
      ? cobertura
      : "";

  const categoriaVisible =
    subcategoriaPrincipalTitulo ||
    s(item.categoria_nombre) ||
    "Servicios";

  const comunaVisible = comunaNombre;

  const coberturaVisible =
    s(item.cobertura_label) ||
    s(item.cobertura_tipo_label) ||
    coberturaDisplay ||
    coberturaTipo ||
    "";

  const subtituloVisible = buildSubtituloFicha({
    categoria: categoriaVisible,
    comuna: comunaVisible,
    cobertura: coberturaVisible,
  });
  const lineaClave = subtituloClave(subtituloVisible);

  const descripcionRaw =
    limpiarTexto(item.descripcion_libre || null) ||
    limpiarTexto(item.descripcion_larga || null) ||
    limpiarTexto(item.frase_negocio || null) ||
    null;

  const descripcionLimpiaTecnica =
    descripcionRaw && /\b(ranking|score|rpc|algolia)\b/i.test(descripcionRaw)
      ? null
      : descripcionRaw;

  const descripcionFinal =
    descripcionLimpiaTecnica ||
    buildDescripcionFallback({
      categoria: categoriaVisible,
      comuna: comunaVisible,
      cobertura: coberturaVisible,
      whatsapp: item.whatsapp,
    });

  const estadoVacioVisible = buildEstadoVacioFicha();

  const subtituloHero = (() => {
    const ctx = {
      categoriaNombre: s(item.categoria_nombre),
      comunaNombre,
    };
    const corta = s(item.descripcion_corta);
    if (
      corta &&
      !descripcionEsPocoUtilParaPublico(corta, ctx, "corta")
    ) {
      return corta;
    }
    return subtituloVisible;
  })();

  // Auditoría similares (consola): [similares-page] current → slug, categoria_id, comuna_id, cobertura_tipo;
  // luego [similares-page] similares → count; en helper → [getSimilaresFicha] event="resumen".
  const logSimilaresPage =
    process.env.NODE_ENV === "development" ||
    process.env.LOG_SIMILARES_FICHA === "1";
  if (logSimilaresPage) {
    console.log("ITEM REAL", item);
    console.log("[similares-page] current", {
      slug: item?.slug,
      categoria_id: item?.categoria_id,
      comuna_id: item?.comuna_id,
      cobertura_tipo: item?.cobertura_tipo,
      region_id: item?.region_id,
      comuna_base_id: item?.comuna_base_id,
    });
  }

  const similares = await getSimilaresFichaUI(item);

  if (logSimilaresPage) {
    console.log("[similares-page] similares", { count: similares.length });
  }

  const estadoFicha = calcularEstadoFicha({
    nombre_emprendimiento: (item.nombre_emprendimiento ?? item.nombre ?? "") as string,
    whatsapp_principal: (item.whatsapp_principal ?? item.whatsapp ?? "") as string,
    frase_negocio: (item.frase_negocio ?? item.descripcion_corta ?? "") as string,
    comuna_id: Number(item.comuna_id || item.comuna_base_id || 0) || 0,
    cobertura_tipo: (item.cobertura_tipo ?? item.nivel_cobertura ?? "") as string,
    descripcion_libre: (item.descripcion_libre ??
      item.descripcion_larga ??
      item.descripcion_libre ??
      "") as string,
    foto_principal_url: (item.foto_principal_url ?? "") as string,
    galeria_count: Array.isArray(galeria) ? galeria.length : 0,
    instagram: (item.instagram ?? "") as string,
    sitio_web: (item.sitio_web ?? item.web ?? "") as string,
  });
  const isMejoradaProfile = estadoFicha === "mejorada";
  const isBasicProfile = !isMejoradaProfile;
  const activarFichaHref = activarFichaWhatsappHref(item.slug);
  const activarFichaIsWhatsapp = activarFichaHref.startsWith("https://wa.me/");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: item.nombre,
    description: isMejoradaProfile
      ? descripcionFinal
      : s(item.descripcion_corta) || frase,
    image: (
      isMejoradaProfile
        ? [item.foto_principal_url, ...galeria]
        : [item.foto_principal_url]
    ).filter(Boolean),
    url: shareUrl,
    email: undefined,
    telephone: s(item.whatsapp) || undefined,
    areaServed: comunaNombre || undefined,
    address:
      isMejoradaProfile && tieneLocalFisico && item.direccion
        ? {
            "@type": "PostalAddress",
            streetAddress: item.direccion,
            addressLocality: comunaNombre,
            addressRegion: item.region_nombre || undefined,
            addressCountry: "CL",
          }
        : comunaNombre
        ? {
            "@type": "PostalAddress",
            addressLocality: comunaNombre,
            addressRegion: item.region_nombre || undefined,
            addressCountry: "CL",
          }
        : undefined,
    sameAs: isMejoradaProfile ? [instagramUrl, webUrl].filter(Boolean) : [],
    knowsAbout: subcategorias.length ? subcategorias : undefined,
  };

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 80px" }}>
      <TrackView slug={item.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <BackLink
          style={{
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            color: "#2563eb",
          }}
        >
          ← Volver
        </BackLink>
        <ShareFichaButton
          slug={item.slug}
          shareUrl={shareUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            borderRadius: 10,
            border: "2px solid #e2e8f0",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            color: "#334155",
            background: "#fff",
          }}
        />
      </div>

      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
          Inicio
        </a>
        {comunaSlug ? (
          <>
            {" / "}
            <a
              href={`/${comunaSlug}`}
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              {comunaNombre || "Comuna"}
            </a>
          </>
        ) : comunaNombre ? (
          <>
            {" / "}
            <span>{comunaNombre}</span>
          </>
        ) : null}
        {(subcategoriaSlugPrincipal && comunaSlug) || s(item.categoria_nombre) ? (
          <>
            {" / "}
            {subcategoriaSlugPrincipal && comunaSlug ? (
              <a
                href={`/${comunaSlug}/${subcategoriaSlugPrincipal}`}
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                {subcategorias[0] || item.categoria_nombre}
              </a>
            ) : (
              <span>{item.categoria_nombre}</span>
            )}
          </>
        ) : null}
        {" / "}
        {item.nombre}
      </div>

      {isBasicProfile ? (
        <section
          style={{
            maxWidth: 720,
            margin: "0 auto 40px",
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            {item.foto_principal_url ? (
              <div style={{ aspectRatio: "16/9", background: "#f1f5f9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.foto_principal_url}
                  alt={item.nombre}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  color: "#94a3b8",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                🏪
                <div style={{ marginTop: 16, fontSize: 14, color: "#475569" }}>
                  Este emprendimiento aún no ha subido fotos
                </div>
              </div>
            )}

            <div style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#475569",
                  }}
                >
                  Ficha básica
                </div>
                {(() => {
                  const badge = coberturaBadge(coberturaTipo);
                  return (
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 10,
                        background: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      {badge.emoji} {badge.label}
                    </div>
                  );
                })()}
              </div>

              <h1
                style={{
                  fontSize: 32,
                  lineHeight: 1.1,
                  margin: "0 0 10px 0",
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                {item.nombre}
              </h1>

              {lineaClave ? (
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: "#0f172a" }}>
                  {lineaClave}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #bbf7d0",
                    background: "#ecfdf5",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#166534",
                  }}
                >
                  🟢 Disponible hoy
                </span>
                {comunaVisible ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    📍 {comunaVisible}
                  </span>
                ) : null}
                {categoriaVisible ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    🔧 {categoriaVisible}
                  </span>
                ) : null}
              </div>

              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "#0f172a",
                  marginTop: 10,
                  fontWeight: 600,
                }}
              >
                {subtituloHero}
              </p>

              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 16,
                  background: "#f8fafc",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 6,
                  }}
                >
                  Más información
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#475569",
                    margin: 0,
                  }}
                >
                  {estadoVacioVisible}
                </p>
              </div>

              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                {comunaNombre ? (
                  <InfoRow label="Comuna base" value={comunaNombre} />
                ) : null}
                {isInformado(coberturaDisplay) ? (
                  <InfoRow label="Cobertura" value={coberturaDisplay} />
                ) : null}
                {isInformado(modalidadesTextoFinal) ? (
                  <InfoRow label="Atención" value={modalidadesTextoFinal} />
                ) : null}
                {isInformado(subcategoriaPrincipalTitulo) ? (
                  <InfoRow label="Categoría" value={subcategoriaPrincipalTitulo} />
                ) : null}
              </div>

              <div
                style={{
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                }}
                aria-label="Estado de ficha"
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
                  Tu ficha básica ya está publicada
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#64748b",
                    lineHeight: 1.4,
                  }}
                >
                  Completar tu ficha aumenta contactos
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {whatsappUrl ? (
                  <div>
                    <TrackedActionButton
                      slug={item.slug}
                      type="whatsapp"
                      href={whatsappUrl}
                      label="Cotizar por WhatsApp"
                      bg="#16a34a"
                    />
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#64748b",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Sin intermediarios
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#16a34a",
                        marginTop: 6,
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      Respuesta rápida
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 380px",
              gap: 20,
              marginBottom: 30,
              alignItems: "start",
            }}
          >
            <PortalGallery
              fotoPrincipal={item.foto_principal_url || ""}
              galeria={galeria}
              nombreNegocio={item.nombre}
              subcategoriaLabel={subcategoriaPrincipalTitulo}
              categoriaLabel={s(item.categoria_nombre)}
              comunaLabel={comunaNombre}
            />

            <aside
              style={{
                border: "1px solid #bbf7d0",
                borderRadius: 24,
                padding: 24,
                background: "#fff",
                boxShadow: "0 0 0 3px rgba(220,252,231,0.65)",
              }}
            >
              <ShareFichaButton
                slug={item.slug}
                shareUrl={shareUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "2px solid #e2e8f0",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  color: "#334155",
                  background: "#fff",
                }}
              />
              {(() => {
                const loc = [comunaNombre, s(item.region_nombre)]
                  .filter(Boolean)
                  .join(" • ");
                return loc ? (
                  <div
                    style={{
                      fontWeight: 900,
                      color: "#2563eb",
                      marginBottom: 8,
                    }}
                  >
                    📍 {loc}
                  </div>
                ) : null;
              })()}

              <div
                style={{
                  display: "inline-flex",
                  marginBottom: 14,
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#166534",
                }}
              >
                Ficha completa
              </div>

              {(() => {
                const badge = coberturaBadge(coberturaTipo);
                return (
                  <div
                    style={{
                      display: "inline-flex",
                      marginBottom: 14,
                      marginLeft: 8,
                      padding: "6px 12px",
                      borderRadius: 10,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#1e40af",
                    }}
                  >
                    {badge.emoji} {badge.label}
                  </div>
                );
              })()}

              <h1
                style={{
                  fontSize: 42,
                  lineHeight: 1,
                  margin: "0 0 10px 0",
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                {item.nombre}
              </h1>

              {lineaClave ? (
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: "#0f172a" }}>
                  {lineaClave}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #bbf7d0",
                    background: "#ecfdf5",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#166534",
                  }}
                >
                  🟢 Disponible hoy
                </span>
                {comunaVisible ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    📍 {comunaVisible}
                  </span>
                ) : null}
                {categoriaVisible ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    🔧 {categoriaVisible}
                  </span>
                ) : null}
              </div>

              {isInformado(etiquetaCategoriaVisible) ? (
                <div
                  style={{
                    display: "inline-block",
                    marginBottom: 12,
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#334155",
                    letterSpacing: "0.01em",
                  }}
                >
                  {etiquetaCategoriaVisible}
                </div>
              ) : null}

              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "#0f172a",
                  marginTop: 10,
                  fontWeight: 600,
                }}
              >
                {subtituloHero}
              </p>

              {isInformado(comunaNombre) ? (
                <p
                  style={{
                    margin: "0 0 14px 0",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0369a1",
                    lineHeight: 1.45,
                  }}
                >
                  Disponible en {comunaNombre}
                </p>
              ) : null}

              {subcatsForList.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  {subcatsForList.map((sub, i) => {
                    const slugSub = subcategoriasSlugsFinal[i] || "";
                    return (
                      <a
                        key={`${sub}-${i}`}
                        href={
                          slugSub
                            ? `/buscar?subcategoria=${encodeURIComponent(slugSub)}`
                            : "#"
                        }
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          padding: "6px 10px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        {sub}
                      </a>
                    );
                  })}
                </div>
              ) : null}

              {item.mostrar_responsable && isInformado(item.responsable_nombre) ? (
                <p
                  style={{
                    fontSize: 14,
                    margin: "0 0 12px 0",
                    color: "#374151",
                  }}
                >
                  <strong>Responsable:</strong> {s(item.responsable_nombre)}
                </p>
              ) : null}

              {isInformado(modalidadesTextoFinal) ? (
                <p
                  style={{
                    fontSize: 14,
                    margin: "0 0 8px 0",
                    color: "#374151",
                  }}
                >
                  <strong>Forma de atención:</strong> {modalidadesTextoFinal}
                </p>
              ) : null}

              {isInformado(coberturaDisplay) &&
              !mencionadoEnFrase(subtituloHero, coberturaDisplay) ? (
                <p
                  style={{
                    fontSize: 14,
                    margin: "0 0 8px 0",
                    color: "#374151",
                  }}
                >
                  <strong>Cobertura:</strong> {coberturaDisplay}
                </p>
              ) : null}

              {isInformado(subcategoriaPrincipalTitulo) &&
              !mencionadoEnFrase(
                subtituloHero,
                subcategoriaPrincipalTitulo
              ) ? (
                <p
                  style={{
                    fontSize: 14,
                    margin: "0 0 8px 0",
                    color: "#374151",
                  }}
                >
                  <strong>Categoría:</strong> {subcategoriaPrincipalTitulo}
                </p>
              ) : null}

              {tieneLocalFisico && item.direccion ? (
                <p
                  style={{
                    fontSize: 14,
                    margin: "0 0 8px 0",
                    color: "#374151",
                  }}
                >
                  <strong>Dirección:</strong> {item.direccion}
                </p>
              ) : null}
            </aside>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 20,
                  padding: 22,
                  marginBottom: 20,
                  background: "#fff",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  Descripción
                </h2>

                <p
                  style={{
                    marginTop: 10,
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "#334155",
                  }}
                >
                  {descripcionFinal}
                </p>
              </div>

              {tieneLocalFisico && item.direccion ? (
                <section
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 20,
                    padding: 22,
                    marginBottom: 20,
                    background: "#fff",
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#111827",
                    }}
                  >
                    Ubicación
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      margin: "0 0 12px 0",
                    }}
                  >
                    {item.direccion}
                    {comunaNombre ? `, ${comunaNombre}` : ""}
                    {item.region_nombre ? `, ${item.region_nombre}` : ""}
                  </p>
                  <iframe
                    title="Mapa de ubicación"
                    width="100%"
                    height={280}
                    style={{
                      border: 0,
                      borderRadius: 16,
                      display: "block",
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${item.direccion},${comunaNombre || ""},Chile`
                    )}&output=embed`}
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      item.direccion
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 12,
                      padding: "10px 16px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: "none",
                      color: "#fff",
                      background: "#2563eb",
                    }}
                  >
                    Ver en Google Maps
                  </a>
                </section>
              ) : null}
            </div>

            <aside
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                background: "#f8fafc",
                padding: 20,
                height: "fit-content",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                Contacto
              </h3>

              {whatsappUrl ? (
                <>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#15803d",
                      marginBottom: 6,
                    }}
                  >
                    Consulta directo por WhatsApp ahora
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#475569",
                      marginBottom: 14,
                    }}
                  >
                    Coordinación rápida según disponibilidad del emprendimiento.
                  </p>
                </>
              ) : (
                <>
                  {senalContacto ? (
                    <div style={{ margin: "0 0 10px 0" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#15803d",
                          lineHeight: 1.45,
                        }}
                      >
                        {senalContacto.titulo}
                      </p>
                      {senalContacto.subtitulo ? (
                        <p
                          style={{
                            margin: "5px 0 0 0",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#16a34a",
                            lineHeight: 1.4,
                          }}
                        >
                          {senalContacto.subtitulo}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p
                    style={{
                      margin: "0 0 14px 0",
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "#475569",
                    }}
                  >
                    Contacta directamente a este emprendimiento usando sus
                    canales disponibles.
                  </p>
                </>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {whatsappUrl ? (
                  <TrackedActionButton
                    slug={item.slug}
                    type="whatsapp"
                    href={whatsappUrl}
                    label="Cotizar por WhatsApp"
                    bg="#16a34a"
                    emphasis="primary"
                  />
                ) : null}
                {item.whatsapp && phoneUrl ? (
                  <a
                    href={phoneUrl}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 40,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#fafafa",
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: 12,
                      textDecoration: "none",
                    }}
                  >
                    Llamar
                  </a>
                ) : null}
                {item.instagram && instagramUrl ? (
                  <TrackedActionButton
                    slug={item.slug}
                    type="instagram"
                    href={instagramUrl}
                    label="Ver Instagram"
                    bg="#B84D7A"
                    emphasis="muted"
                  />
                ) : null}
                {webUrl ? (
                  <TrackedActionButton
                    slug={item.slug}
                    type="web"
                    href={webUrl}
                    label="Visitar sitio web"
                    bg="#64748b"
                    emphasis="secondary"
                  />
                ) : null}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  paddingTop: 14,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {whatsappText ? (
                  <div style={contactTextStyle}>
                    <strong>WhatsApp:</strong> {whatsappText}
                  </div>
                ) : null}

                {instagramUrl && instagramText ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={contactLinkStyle}
                  >
                    {instagramText}
                  </a>
                ) : null}

                {webUrl && webText ? (
                  <a
                    href={webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={contactLinkStyle}
                  >
                    {webText}
                  </a>
                ) : null}

              </div>
            </aside>
          </section>

          {similares.length > 0 ? (
            <SimilaresFichaSection items={similares} fromSlug={item.slug} />
          ) : null}
        </>
      )}
    </main>
  );
}

const contactTextStyle: CSSProperties = {
  fontSize: 14,
  color: "#475569",
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const contactLinkStyle: CSSProperties = {
  fontSize: 14,
  color: "#334155",
  fontWeight: 700,
  textDecoration: "none",
  wordBreak: "break-word",
};
