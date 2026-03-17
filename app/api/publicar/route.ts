import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeChilePhone, isValidChileMobile } from "@/utils/phone";
import { normalizeWebsite } from "@/utils/url";
import { syncEmprendedorToAlgolia } from "@/lib/algoliaSyncEmprendedor";
import { getPublishingDecision } from "@/lib/regulatedPublishingRules";
import { incrementCommuneActivity } from "@/lib/commune-activity";
import { mapKeywordsToSubcategorias } from "@/lib/mapKeywordsToSubcategorias";
import {
  classifyAndAssignBusiness,
  detectBusinessKeywords,
  hasEnoughInfoToClassify,
  mapKeywordsToSubcategories,
} from "@/lib/classifyBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ClasificacionPayload = {
  tipo_actividad?: string;
  sector_slug?: string;
  tags_slugs?: string[];
  keywords_clasificacion?: string[];
  clasificacion_confianza?: number;
  clasificacion_fuente?: string;
};

type Payload = {
  draft_id?: string;
  nombre: string;
  responsable_nombre: string;
  ocultar_responsable?: boolean;

  email: string;
  whatsapp: string;
  whatsapp_principal?: string;
  whatsapp_secundario?: string;
  instagram?: string;
  sitio_web?: string;

  /** Frase corta opcional: solo para tarjeta y ficha, no se usa en clasificación. */
  frase_negocio?: string;
  /** Descripción del producto/servicio (mín 40 caracteres). Usado para clasificación, tarjeta (si no hay frase) y ficha. */
  descripcion_negocio: string;

  /** Si tiene locales físicos (hasta 3); comuna_base_id se toma del local principal. */
  tiene_local_fisico?: boolean;
  /** Locales físicos: nombre_local opcional, direccion, comuna_slug, es_principal (solo uno). */
  locales?: { nombre_local?: string; direccion: string; comuna_slug: string; es_principal: boolean }[];

  comuna_base_slug: string;
  direccion?: string;

  nivel_cobertura:
    | "solo_mi_comuna"
    | "varias_comunas"
    | "varias_regiones"
    | "nacional";

  comunas_cobertura_slugs?: string[];
  regiones_cobertura_slugs?: string[];

  modalidades?: string[];

  categoria_slug?: string;
  subcategorias_slugs?: string[];

  /** Palabras clave que definen el negocio (entre 5 y 10). */
  keywords?: string[];

  /** Productos/servicios detectados o editados por el usuario (máx 8). Para aprendizaje. */
  productos_detectados?: string[];

  foto_principal_nombre_archivo?: string;
  galeria_nombres_archivos?: string[];

  foto_principal_base64?: string;
  galeria_base64?: string[];
  clasificacion?: ClasificacionPayload | null;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function unique(items: string[]) {
  return [...new Set(items)];
}

const MIN_DESCRIPCION_NEGOCIO = 40;
const KEYWORDS_MIN = 1;
const KEYWORDS_MAX = 10;

/** Frases promocionales que no queremos; si el texto las contiene, se rechaza. */
const PROMO_PHRASES = [
  "somos líderes",
  "somos los mejores",
  "los mejores",
  "número uno",
  "numero uno",
  "nº1",
  "no. 1",
  "líder en",
  "líderes en",
  "líder del mercado",
  "calidad garantizada",
  "la mejor opción",
  "los mejores precios",
  "precios insuperables",
];

function hasPromotionalText(text: string): boolean {
  const lower = text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return PROMO_PHRASES.some((phrase) => {
    const norm = phrase.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return lower.includes(norm);
  });
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeInstagram(input?: string) {
  let raw = s(input);
  if (!raw) return "";

  raw = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  raw = raw.replace(/^@/, "");
  raw = raw.replace(/\/+$/, "");
  raw = raw.split("?")[0];
  raw = raw.split("/")[0];

  return raw.trim();
}

function normalizeKeywords(input: unknown) {
  return unique(
    arr(input)
      .map((x) => x.toLowerCase())
      .filter(Boolean)
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeModalidades(input: unknown) {
  const raw = unique(arr(input).map((x) => x.toLowerCase()));
  return raw.map((m) => (m === "domicilio" ? "presencial" : m));
}

function parseBase64File(input: string) {
  const raw = input.trim();
  if (!raw) return null;

  let mime = "application/octet-stream";
  let base64 = raw;

  const match = /^data:(.+?);base64,(.+)$/.exec(raw);
  if (match) {
    mime = match[1];
    base64 = match[2];
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    return { buffer, contentType: mime };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    const nombre = s(body.nombre);
    const responsableNombre = s(body.responsable_nombre);
    const mostrarResponsable = body.ocultar_responsable ? false : true;

    const email = s(body.email).toLowerCase();
    const whatsappPrincipal = normalizeChilePhone(s(body.whatsapp_principal ?? body.whatsapp));
    const whatsappSecundario = body.whatsapp_secundario
      ? normalizeChilePhone(s(body.whatsapp_secundario))
      : "";
    const whatsapp = whatsappPrincipal;
    const instagram = normalizeInstagram(body.instagram);
    const sitioWeb = normalizeWebsite(s(body.sitio_web));

    const fraseNegocio = s(body.frase_negocio).slice(0, 120);
    const descripcionNegocio = s(body.descripcion_negocio);
    const tieneLocalFisico = !!body.tiene_local_fisico;
    const localesPayload = Array.isArray(body.locales) ? body.locales : [];
    const comunaBaseSlug = s(body.comuna_base_slug);
    const direccion = s(body.direccion);

    const nivelCobertura = s(body.nivel_cobertura);
    const modalidades = normalizeModalidades(body.modalidades);

    const categoriaSlug = s(body.categoria_slug);
    const subcategoriaSlugs = unique(arr(body.subcategorias_slugs));

    const comunasCoberturaSlugs = unique(
      arr(body.comunas_cobertura_slugs).filter((slug) => slug !== comunaBaseSlug)
    );
    const regionesCoberturaSlugs = unique(arr(body.regiones_cobertura_slugs));

    const keywordsUsuario = normalizeKeywords(body.keywords).slice(0, KEYWORDS_MAX);
    const keywords = keywordsUsuario;

    let categoria: { id: string; nombre: string; slug: string } | null = null;
    let subcats: Array<{ id: string; slug: string; categoria_id: string; nombre: string }> = [];

    // ============================
    // CLASIFICACIÓN AUTOMÁTICA: flujo unificado vía classifyAndAssignBusiness (creación)
    // Si hay descripcion_negocio suficiente, se inserta primero y luego se llama a classifyAndAssignBusiness.
    // ============================

    const useClassifyAndAssign = hasEnoughInfoToClassify(descripcionNegocio, keywordsUsuario);
    let autoClasificacionSinMatch = false;
    let keywordsIa: string[] = [];
    let aiRawForJson: Record<string, unknown> | null = null;

    if (!useClassifyAndAssign && descripcionNegocio.length >= MIN_DESCRIPCION_NEGOCIO) {
      const textForAI = [descripcionNegocio, ...keywordsUsuario].join(" ").trim();
      const detected = await detectBusinessKeywords({
        nombre,
        descripcion_corta: textForAI,
        descripcion_larga: undefined,
      });

      if (detected) {
        keywordsIa = [...(detected.raw?.keywords ?? []), ...(detected.raw?.tags_slugs ?? [])].filter(Boolean);
        const keywordsCombined = unique([...keywordsUsuario, ...keywordsIa]);
        const { candidatas } = await mapKeywordsToSubcategories(supabase, keywordsCombined);

        tipoActividadFinal =
          (detected.raw?.tipo_actividad as "venta" | "servicio" | "arriendo") || "servicio";
        sectorSlugFinal = detected.raw?.sector_slug || "otros";
        keywordsClasificacion = keywordsCombined;
        confianzaFinal = detected.confianza ?? 0.7;
        fuenteFinal = "openai_v1";
        hasAnyClasifTags = keywordsCombined.length > 0;
        aiRawForJson = detected.raw
          ? {
              tipo_actividad: detected.raw.tipo_actividad,
              sector_slug: detected.raw.sector_slug,
              tags_slugs: detected.raw.tags_slugs,
              keywords: detected.raw.keywords,
              confianza: detected.confianza,
            }
          : null;

        if (candidatas.length > 0) {
          const { data: subRows } = await supabase
            .from("subcategorias")
            .select("id, slug, categoria_id, nombre")
            .in("id", candidatas.map((c) => c.subcategoria_id));

          const subcatsFromAi = (subRows || []).map((r: any) => ({
            id: r.id,
            slug: r.slug,
            categoria_id: r.categoria_id,
            nombre: r.nombre,
          }));

          if (subcatsFromAi.length > 0) {
            subcats = subcatsFromAi;
            const primeraCategoriaId = subcatsFromAi[0].categoria_id;
            if (primeraCategoriaId) {
              const { data: catRow } = await supabase
                .from("categorias")
                .select("id,nombre,slug")
                .eq("id", primeraCategoriaId)
                .maybeSingle();
              if (catRow) categoria = catRow as { id: string; nombre: string; slug: string };
            }
          }
        } else {
          autoClasificacionSinMatch = true;
        }
      } else {
        autoClasificacionSinMatch = true;
      }
    }

    // ============================
    // CLASIFICACIÓN INTELIGENTE (OPCIONAL - desde front con clasificacion payload)
    // Tags y keywords se deduplican. Solo tags existentes en public.tags
    // se guardan en emprendedores.tags_slugs; el resto va a tags_sugeridos.
    // ============================

    const clasifRaw = body.clasificacion || null;

    let tipoActividadFinal: "venta" | "servicio" | "arriendo" | null = null;
    let sectorSlugFinal: string | null = null;
    let tagsOficiales: string[] = [];
    let tagsNoOficiales: string[] = [];
    let keywordsClasificacion: string[] = [];
    let confianzaFinal: number | null = null;
    let fuenteFinal: "openai_v1" | "manual" | "mixto" | null = null;
    // Marca si hay al menos un tag de clasificación (oficial o sugerido)
    let hasAnyClasifTags = false;

    if (clasifRaw) {
      const tipo = s(clasifRaw.tipo_actividad).toLowerCase();
      if (["venta", "servicio", "arriendo"].includes(tipo)) {
        tipoActividadFinal = tipo as typeof tipoActividadFinal;
      }

      const sector = s(clasifRaw.sector_slug);
      sectorSlugFinal = sector || null;

      const rawTags = Array.isArray(clasifRaw.tags_slugs) ? clasifRaw.tags_slugs : [];
      const normalizedTags = unique(
        rawTags.map((t) => s(t).toLowerCase()).filter(Boolean)
      );
      hasAnyClasifTags = normalizedTags.length > 0;

      const rawKw =
        Array.isArray(clasifRaw.keywords_clasificacion) &&
        clasifRaw.keywords_clasificacion.length
          ? clasifRaw.keywords_clasificacion
          : [];
      keywordsClasificacion = unique(
        rawKw.map((k) => s(k).toLowerCase()).filter(Boolean)
      );

      if (typeof clasifRaw.clasificacion_confianza === "number") {
        let c = clasifRaw.clasificacion_confianza;
        if (!Number.isFinite(c)) c = 0;
        if (c < 0) c = 0;
        if (c > 1) c = 1;
        confianzaFinal = c;
      }

      const fuente = s(clasifRaw.clasificacion_fuente).toLowerCase();
      if (["openai_v1", "manual", "mixto"].includes(fuente)) {
        fuenteFinal = fuente as typeof fuenteFinal;
      }

      if (normalizedTags.length) {
        const { data: tagsRows, error: tagsError } = await supabase
          .from("tags")
          .select("slug")
          .in("slug", normalizedTags);

        if (!tagsError && Array.isArray(tagsRows)) {
          const oficialesSet = new Set(
            tagsRows.map((row: any) => s(row.slug).toLowerCase())
          );
          tagsOficiales = normalizedTags.filter((t) => oficialesSet.has(t));
          tagsNoOficiales = normalizedTags.filter((t) => !oficialesSet.has(t));
        }
      }

      // Enviar tags desconocidos a tags_sugeridos (sin bloquear publicación si falla)
      if (tagsNoOficiales.length) {
        const sectorParaSugerencia = sectorSlugFinal || "otros";
        const tipoParaSugerencia = tipoActividadFinal || "servicio";

        const sugerenciasRows = tagsNoOficiales.map((tagSlug) => ({
          propuesto_nombre: tagSlug,
          propuesto_slug: tagSlug,
          sector_slug: sectorParaSugerencia,
          tipo_actividad: tipoParaSugerencia,
          emprendedor_id: null,
          descripcion_contexto: descripcionNegocio.slice(0, 160),
        }));

        try {
          await supabase.from("tags_sugeridos").insert(sugerenciasRows);
        } catch {
          // No bloquear publicación si no se pudo guardar sugerencias de tags
        }
      }
    }

    const fotoPrincipalNombreArchivo = s(body.foto_principal_nombre_archivo);
    const galeriaNombresArchivos = unique(arr(body.galeria_nombres_archivos));
    const fotoPrincipalBase64 = s(body.foto_principal_base64);
    const galeriaBase64 = arr(body.galeria_base64);

    // ============================
    // VALIDACIONES BÁSICAS
    // ============================

    if (!nombre || nombre.length < 3) {
      return NextResponse.json(
        { ok: false, error: "El nombre del emprendimiento debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (!responsableNombre || responsableNombre.length < 3) {
      return NextResponse.json(
        { ok: false, error: "El nombre del responsable debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    if (!isValidChileMobile(whatsapp)) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp principal inválido. Usa formato chileno: 912345678 o +56912345678." },
        { status: 400 }
      );
    }
    if (whatsappSecundario && !isValidChileMobile(whatsappSecundario)) {
      return NextResponse.json(
        { ok: false, error: "El WhatsApp secundario debe ser un número válido de Chile." },
        { status: 400 }
      );
    }
    if (whatsappSecundario && whatsappSecundario === whatsapp) {
      return NextResponse.json(
        { ok: false, error: "El WhatsApp secundario debe ser distinto al principal." },
        { status: 400 }
      );
    }

    if (descripcionNegocio.length < MIN_DESCRIPCION_NEGOCIO) {
      return NextResponse.json(
        {
          ok: false,
          error: `La descripción debe tener al menos ${MIN_DESCRIPCION_NEGOCIO} caracteres. Describe el producto o servicio que ofreces.`,
        },
        { status: 400 }
      );
    }

    if (hasPromotionalText(descripcionNegocio)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Evita frases promocionales (ej. «somos los mejores», «líderes»). Describe de forma clara qué producto o servicio ofreces.",
        },
        { status: 400 }
      );
    }

    if (keywordsUsuario.length < KEYWORDS_MIN || keywordsUsuario.length > KEYWORDS_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: `Ingresa entre ${KEYWORDS_MIN} y ${KEYWORDS_MAX} palabras clave que definan tu negocio.`,
        },
        { status: 400 }
      );
    }

    const effectiveDescripcionCorta = fraseNegocio || descripcionNegocio.slice(0, 160);
    const descripcionLargaForDb = fraseNegocio
      ? `${fraseNegocio}\n\n${descripcionNegocio}`
      : descripcionNegocio;

    if (!fotoPrincipalNombreArchivo) {
      return NextResponse.json(
        { ok: false, error: "Falta foto principal." },
        { status: 400 }
      );
    }

    if (galeriaNombresArchivos.length > 6) {
      return NextResponse.json(
        { ok: false, error: "Máximo 6 imágenes en galería." },
        { status: 400 }
      );
    }

    if (!comunaBaseSlug) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna base." },
        { status: 400 }
      );
    }

    if (
      !["solo_mi_comuna", "varias_comunas", "varias_regiones", "nacional"].includes(
        nivelCobertura
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Cobertura inválida." },
        { status: 400 }
      );
    }

    if (!modalidades.length) {
      return NextResponse.json(
        { ok: false, error: "Debes seleccionar al menos una modalidad de atención." },
        { status: 400 }
      );
    }

    const modalidadesValidas = ["local", "presencial", "online"];
    if (modalidades.some((m) => !modalidadesValidas.includes(m))) {
      return NextResponse.json(
        { ok: false, error: "Hay modalidades inválidas." },
        { status: 400 }
      );
    }

    if (tieneLocalFisico) {
      if (localesPayload.length === 0 || localesPayload.length > 3) {
        return NextResponse.json(
          { ok: false, error: "Debes agregar entre 1 y 3 locales físicos." },
          { status: 400 }
        );
      }
      const principal = localesPayload.find((l) => l.es_principal);
      if (!principal) {
        return NextResponse.json(
          { ok: false, error: "Uno de los locales debe marcarse como principal." },
          { status: 400 }
        );
      }
      for (let i = 0; i < localesPayload.length; i++) {
        const loc = localesPayload[i];
        if (!s(loc.direccion)) {
          return NextResponse.json(
            { ok: false, error: `Local ${i + 1}: la dirección es obligatoria.` },
            { status: 400 }
          );
        }
        if (!s(loc.comuna_slug)) {
          return NextResponse.json(
            { ok: false, error: `Local ${i + 1}: selecciona la comuna.` },
            { status: 400 }
          );
        }
      }
    } else if (modalidades.includes("local") && !direccion) {
      return NextResponse.json(
        { ok: false, error: "Debes ingresar la dirección si tienes local físico." },
        { status: 400 }
      );
    }

    const hasLegacyTaxonomy = !!categoriaSlug && subcategoriaSlugs.length > 0;
    const hasNewClassification =
      !!tipoActividadFinal &&
      !!sectorSlugFinal &&
      hasAnyClasifTags;

    if (
      !hasLegacyTaxonomy &&
      !hasNewClassification &&
      !autoClasificacionSinMatch &&
      !useClassifyAndAssign
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debes describir tu emprendimiento (al menos 25 caracteres) para que podamos clasificarlo automáticamente.",
        },
        { status: 400 }
      );
    }

    if (subcategoriaSlugs.length > 6) {
      return NextResponse.json(
        { ok: false, error: "Máximo 6 subcategorías." },
        { status: 400 }
      );
    }

    if (nivelCobertura === "varias_comunas" && !comunasCoberturaSlugs.length) {
      return NextResponse.json(
        { ok: false, error: "Debes seleccionar al menos una comuna de cobertura." },
        { status: 400 }
      );
    }

    if (nivelCobertura === "varias_regiones" && !regionesCoberturaSlugs.length) {
      return NextResponse.json(
        { ok: false, error: "Debes seleccionar al menos una región de cobertura." },
        { status: 400 }
      );
    }

    // ============================
    // CONTROL DUPLICADO RECIENTE
    // ============================

    const draftId = body.draft_id ? s(body.draft_id) : null;

    const { data: duplicado, error: duplicadoError } = await supabase
      .from("emprendedores")
      .select("id, created_at")
      .eq("nombre", nombre)
      .eq("email", email)
      .eq("whatsapp", whatsapp)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicadoError) {
      return NextResponse.json(
        { ok: false, error: `Error validando duplicado: ${duplicadoError.message}` },
        { status: 500 }
      );
    }

    if (duplicado?.created_at && duplicado.id !== draftId) {
      const createdAt = new Date(duplicado.created_at).getTime();
      const now = Date.now();
      const diffSeconds = (now - createdAt) / 1000;

      if (diffSeconds < 120) {
        return NextResponse.json(
          { ok: false, error: "Este emprendimiento ya fue enviado hace unos segundos." },
          { status: 409 }
        );
      }
    }

    if (draftId) {
      const { data: draft, error: draftErr } = await supabase
        .from("emprendedores")
        .select("id, estado")
        .eq("id", draftId)
        .single();
      if (draftErr || !draft || (draft as any).estado !== "borrador") {
        return NextResponse.json(
          { ok: false, error: "Borrador no encontrado o ya fue enviado." },
          { status: 400 }
        );
      }
    }

    // ============================
    // RESOLVER CATEGORÍA (solo si viene en el flujo legacy)
    // ============================

    if (hasLegacyTaxonomy) {
      const { data, error } = await supabase
        .from("categorias")
        .select("id,nombre,slug")
        .eq("slug", categoriaSlug)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json(
          { ok: false, error: "Categoría no encontrada." },
          { status: 400 }
        );
      }

      categoria = data;
    }

    // ============================
    // RESOLVER COMUNA BASE (siempre desde el payload; concepto separado de locales)
    // ============================

    const slugParaComunaBase = comunaBaseSlug;

    const { data: comunaBase, error: comunaBaseError } = await supabase
      .from("comunas")
      .select("id,nombre,slug,region_id")
      .eq("slug", slugParaComunaBase)
      .maybeSingle();

    if (comunaBaseError || !comunaBase) {
      return NextResponse.json(
        { ok: false, error: "Comuna base no encontrada." },
        { status: 400 }
      );
    }

    const direccionParaEmprendedor = tieneLocalFisico && localesPayload.length > 0
      ? s(localesPayload.find((l) => l.es_principal)?.direccion)
      : direccion;

    // ============================
    // RESOLVER SUBCATEGORÍAS (solo si viene en el flujo legacy)
    // ============================

    if (hasLegacyTaxonomy) {
      const { data, error } = await supabase
        .from("subcategorias")
        .select("id,slug,categoria_id,nombre")
        .in("slug", subcategoriaSlugs);

      if (error || !data || data.length !== subcategoriaSlugs.length) {
        return NextResponse.json(
          { ok: false, error: "Una o más subcategorías no existen." },
          { status: 400 }
        );
      }

      subcats = data;

      if (categoria) {
        const fueraDeCategoria = subcats.some(
          (x) => x.categoria_id !== (categoria as any).id
        );
        if (fueraDeCategoria) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Hay subcategorías que no pertenecen a la categoría seleccionada.",
            },
            { status: 400 }
          );
        }
      }
    }

    // ============================
    // MAPEAR CLASIFICACIÓN IA → SUBCATEGORÍAS (para apertura de comunas)
    // Si el usuario usó solo clasificación inteligente (sin categoría/subcategorías legacy),
    // mapeamos tags y keywords a subcategorías para insertar emprendedor_subcategorias.
    // ============================

    if (!hasLegacyTaxonomy && hasNewClassification && subcats.length === 0) {
      const rawTags = Array.isArray(clasifRaw?.tags_slugs) ? clasifRaw.tags_slugs : [];
      const terms = unique([
        ...rawTags.map((t) => s(t).toLowerCase()).filter(Boolean),
        ...keywordsClasificacion,
      ]);
      const { subcategorias: mapeadas, primeraCategoriaId } = await mapKeywordsToSubcategorias(
        supabase,
        terms
      );
      if (mapeadas.length > 0) {
        subcats = mapeadas.slice(0, 6);
        if (primeraCategoriaId && !categoria) {
          const { data: catRow } = await supabase
            .from("categorias")
            .select("id,nombre,slug")
            .eq("id", primeraCategoriaId)
            .maybeSingle();
          if (catRow) categoria = catRow as { id: string; nombre: string; slug: string };
        }
      }
    }

    // Regla de negocio: todo emprendimiento debe tener al menos una subcategoría, salvo cuando
    // la clasificación automática no encontró match o se usará classifyAndAssignBusiness tras el insert.
    if (subcats.length === 0 && !autoClasificacionSinMatch && !useClassifyAndAssign) {
      const suggestedKeywords =
        !hasLegacyTaxonomy && clasifRaw
          ? unique([
              ...(Array.isArray(clasifRaw.tags_slugs) ? clasifRaw.tags_slugs : []).map((t) => s(t).toLowerCase()).filter(Boolean),
              ...keywordsClasificacion,
            ])
          : [];
      return NextResponse.json(
        {
          ok: false,
          error:
            "No pudimos asignar un rubro con la información ingresada. Por favor elige categoría y subcategoría manualmente.",
          suggestions: suggestedKeywords,
        },
        { status: 400 }
      );
    }

    // ============================
    // RESOLVER COMUNAS COBERTURA
    // ============================

    let comunasCobertura: Array<{ id: string; slug: string; nombre: string }> = [];

    if (nivelCobertura === "varias_comunas") {
      const { data, error } = await supabase
        .from("comunas")
        .select("id,slug,nombre")
        .in("slug", comunasCoberturaSlugs);

      if (error) {
        return NextResponse.json(
          { ok: false, error: "Error consultando comunas de cobertura." },
          { status: 400 }
        );
      }

      comunasCobertura = data || [];

      if (comunasCobertura.length !== comunasCoberturaSlugs.length) {
        return NextResponse.json(
          { ok: false, error: "Una o más comunas de cobertura no existen." },
          { status: 400 }
        );
      }
    }

    // ============================
    // RESOLVER REGIONES COBERTURA
    // ============================

    let regionesCobertura: Array<{ id: string; slug: string; nombre: string }> = [];

    if (nivelCobertura === "varias_regiones") {
      const { data, error } = await supabase
        .from("regiones")
        .select("id,slug,nombre")
        .in("slug", regionesCoberturaSlugs);

      if (error) {
        return NextResponse.json(
          { ok: false, error: "Error consultando regiones de cobertura." },
          { status: 400 }
        );
      }

      regionesCobertura = data || [];

      if (regionesCobertura.length !== regionesCoberturaSlugs.length) {
        return NextResponse.json(
          { ok: false, error: "Una o más regiones de cobertura no existen." },
          { status: 400 }
        );
      }
    }

    // ============================
    // ARRAYS AUXILIARES
    // ============================

    let coverageKeys: string[] = [];
    let coverageLabels: string[] = [];
    let coberturaTexto = "";

    if (nivelCobertura === "solo_mi_comuna") {
      coverageKeys = [comunaBase.slug];
      coverageLabels = [comunaBase.nombre];
      coberturaTexto = "solo_mi_comuna";
    } else if (nivelCobertura === "varias_comunas") {
      coverageKeys = comunasCobertura.map((x) => x.slug);
      coverageLabels = comunasCobertura.map((x) => x.nombre);
      coberturaTexto = "varias_comunas";
    } else if (nivelCobertura === "varias_regiones") {
      coverageKeys = regionesCobertura.map((x) => x.slug);
      coverageLabels = regionesCobertura.map((x) => x.nombre);
      coberturaTexto = "varias_regiones";
    } else {
      coverageKeys = ["nacional"];
      coverageLabels = ["Nacional"];
      coberturaTexto = "nacional";
    }

    // ============================
    // CREAR SLUG
    // ============================

    const baseSlug = slugify(nombre);
    let slug = `${baseSlug}-${Date.now().toString().slice(-5)}`;

    const { data: existingSlug } = await supabase
      .from("emprendedores")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existingSlug?.slug) {
      slug = `${baseSlug}-${Date.now().toString().slice(-8)}`;
    }

    // ============================
    // SUBIDA A STORAGE
    // ============================

    let fotoPrincipalUrl = "";
    let galeriaUrls: string[] = [];

    if (fotoPrincipalBase64) {
      const parsed = parseBase64File(fotoPrincipalBase64);
      if (!parsed) {
        return NextResponse.json(
          { ok: false, error: "No se pudo procesar la imagen principal." },
          { status: 400 }
        );
      }

      const storage = supabase.storage.from("emprendedores");
      const principalPath = `emprendedores/${slug}/principal-${Date.now()}-${
        fotoPrincipalNombreArchivo || "foto-principal"
      }`;

      const { error: uploadError } = await storage.upload(
        principalPath,
        parsed.buffer,
        {
          contentType: parsed.contentType,
          upsert: true,
        }
      );

      if (uploadError) {
        return NextResponse.json(
          {
            ok: false,
            error: `No se pudo subir la foto principal: ${uploadError.message}`,
          },
          { status: 500 }
        );
      }

      const { data: publicData } = storage.getPublicUrl(principalPath);
      fotoPrincipalUrl = publicData.publicUrl;
    }

    if (galeriaBase64.length && galeriaNombresArchivos.length) {
      const storage = supabase.storage.from("emprendedores");

      for (let i = 0; i < galeriaBase64.length; i++) {
        const raw = galeriaBase64[i];
        const name =
          galeriaNombresArchivos[i] ||
          `galeria-${i + 1}-${Date.now().toString().slice(-5)}.jpg`;

        const parsed = parseBase64File(raw);
        if (!parsed) continue;

        const path = `emprendedores/${slug}/galeria-${i + 1}-${Date.now()
          .toString()
          .slice(-5)}-${name}`;

        const { error: uploadError } = await storage.upload(path, parsed.buffer, {
          contentType: parsed.contentType,
          upsert: true,
        });

        if (uploadError) {
          continue;
        }

        const { data: publicData } = storage.getPublicUrl(path);
        if (publicData.publicUrl) {
          galeriaUrls.push(publicData.publicUrl);
        }
      }
    }

    if (!fotoPrincipalUrl) {
      fotoPrincipalUrl = fotoPrincipalNombreArchivo;
    }
    if (!galeriaUrls.length) {
      galeriaUrls = galeriaNombresArchivos;
    }

    // ============================
    // DECISIÓN: publicado vs pendiente_aprobacion (rubros regulados o sin clasificación)
    // ============================

    let estadoPublicacion: string;
    let motivoVerificacion: string | null;

    if (useClassifyAndAssign) {
      estadoPublicacion = "pendiente_aprobacion";
      motivoVerificacion = "Clasificación en proceso.";
    } else if (autoClasificacionSinMatch) {
      estadoPublicacion = "pendiente_aprobacion";
      motivoVerificacion =
        "Clasificación automática sin match suficiente. Un equipo asignará tu rubro y revisará la ficha.";
    } else {
      const publishingDecision = getPublishingDecision({
        sector_slug: sectorSlugFinal,
        tags_slugs: tagsOficiales.length ? tagsOficiales : null,
        keywords_clasificacion: keywordsClasificacion.length ? keywordsClasificacion : null,
        tipo_actividad: tipoActividadFinal,
      });
      estadoPublicacion = publishingDecision.estado_publicacion;
      motivoVerificacion =
        estadoPublicacion === "pendiente_aprobacion"
          ? publishingDecision.motivo_verificacion
          : null;
    }

    // ============================
    // INSERT PRINCIPAL
    // ============================

    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const trialIniciaAt = now.toISOString();

    const baseInsert: Record<string, unknown> = {
      slug,
      nombre,
      descripcion: effectiveDescripcionCorta,
      descripcion_corta: effectiveDescripcionCorta,
      descripcion_larga: descripcionLargaForDb || null,
      descripcion_negocio: descripcionNegocio || null,
      keywords_usuario: keywordsUsuario,
      keywords_usuario_json: keywordsUsuario.length ? keywordsUsuario : null,
      keywords_ia: useClassifyAndAssign ? null : (keywordsIa.length ? keywordsIa : null),
      estado_clasificacion: useClassifyAndAssign
        ? "pendiente_revision"
        : autoClasificacionSinMatch
          ? "pendiente_revision"
          : "automatica",
      motivo_revision_manual: useClassifyAndAssign
        ? null
        : autoClasificacionSinMatch
          ? "Sin subcategoría asignada por clasificación automática. Requiere asignación manual."
          : null,
      categoria_id: useClassifyAndAssign ? null : (categoria ? categoria.id : null),
      subcategoria_principal_id: useClassifyAndAssign ? null : (subcats.length > 0 ? subcats[0].id : null),
      comuna_base_id: comunaBase.id,
      direccion: direccionParaEmprendedor || null,
      whatsapp_principal: whatsappPrincipal,
      whatsapp_secundario: whatsappSecundario || null,
      frase_negocio: fraseNegocio || null,
      nivel_cobertura: nivelCobertura,
      cobertura: coberturaTexto,
      coverage_keys: coverageKeys,
      coverage_labels: coverageLabels,
      modalidades_atencion: modalidades,
      subcategorias_slugs: hasLegacyTaxonomy ? subcategoriaSlugs : subcats.map((s) => s.slug),
      whatsapp,
      instagram: instagram || null,
      sitio_web: sitioWeb || null,
      web: sitioWeb || null,
      email,
      responsable_nombre: responsableNombre,
      mostrar_responsable: mostrarResponsable,
      keywords: unique([...keywords, ...keywordsClasificacion]),
      tipo_actividad: useClassifyAndAssign ? null : tipoActividadFinal,
      sector_slug: useClassifyAndAssign ? null : sectorSlugFinal,
      tags_slugs: useClassifyAndAssign ? null : (tagsOficiales.length ? tagsOficiales : null),
      keywords_clasificacion: useClassifyAndAssign ? null : (keywordsClasificacion.length ? keywordsClasificacion : null),
      clasificacion_confianza: useClassifyAndAssign ? null : confianzaFinal,
      clasificacion_fuente: useClassifyAndAssign ? null : fuenteFinal,
      ai_raw_classification_json: useClassifyAndAssign ? null : aiRawForJson,
      ai_keywords_json: useClassifyAndAssign
        ? null
        : keywordsIa.length || keywordsClasificacion.length
          ? { keywords: keywordsClasificacion, confianza: confianzaFinal }
          : null,
      foto_principal_url: fotoPrincipalUrl,
      galeria_urls: galeriaUrls,
      plan: "trial",
      trial_expira: trialExpiresAt,
      estado_publicacion: estadoPublicacion,
      motivo_verificacion: motivoVerificacion,
      estado: "pendiente_revision",
      form_completo: true,
    };

    if (draftId) {
      (baseInsert as Record<string, unknown>).ultimo_avance = now.toISOString();
    }

    let inserted: { id: string; slug: string } | null = null;
    let insertError: { message: string } | null = null;

    if (draftId) {
      const { data: updated, error: updateErr } = await supabase
        .from("emprendedores")
        .update({
          ...baseInsert,
          trial_inicia_at: trialIniciaAt,
          trial_expira_at: trialExpiresAt,
        })
        .eq("id", draftId)
        .eq("estado", "borrador")
        .select("id, slug")
        .single();
      inserted = updated;
      insertError = updateErr as { message: string } | null;
    } else {
      const resWithTrialCols = await supabase
        .from("emprendedores")
        .insert({ ...baseInsert, trial_inicia_at: trialIniciaAt, trial_expira_at: trialExpiresAt })
        .select("id,slug")
        .single();

      if (resWithTrialCols.error && /does not exist|column .* does not exist/i.test(resWithTrialCols.error.message)) {
        const resBase = await supabase
          .from("emprendedores")
          .insert(baseInsert)
          .select("id,slug")
          .single();
        inserted = resBase.data;
        insertError = resBase.error;
      } else {
        inserted = resWithTrialCols.data;
        insertError = resWithTrialCols.error;
      }
    }

    if (insertError || !inserted) {
      return NextResponse.json(
        { ok: false, error: insertError?.message || "No se pudo guardar el emprendimiento." },
        { status: 500 }
      );
    }

    const emprendedorId = inserted.id;

    if (draftId) {
      await supabase.from("emprendedor_subcategorias").delete().eq("emprendedor_id", draftId);
      await supabase.from("emprendedor_comunas_cobertura").delete().eq("emprendedor_id", draftId);
      await supabase.from("emprendedor_regiones_cobertura").delete().eq("emprendedor_id", draftId);
      await supabase.from("emprendedor_locales").delete().eq("emprendedor_id", draftId);
    }

    if (tieneLocalFisico && localesPayload.length > 0) {
      const slugsUnicos = unique(localesPayload.map((l) => s(l.comuna_slug)));
      const { data: comunasLocales } = await supabase
        .from("comunas")
        .select("id, slug")
        .in("slug", slugsUnicos);
      const slugToId = new Map<string, string>();
      for (const c of comunasLocales ?? []) {
        slugToId.set((c as { slug: string }).slug, (c as { id: string }).id);
      }
      const rows = localesPayload.map((loc) => {
        const comunaId = slugToId.get(s(loc.comuna_slug));
        if (!comunaId) return null;
        return {
          emprendedor_id: emprendedorId,
          nombre_local: s(loc.nombre_local) || null,
          direccion: s(loc.direccion),
          comuna_id: comunaId,
          es_principal: !!loc.es_principal,
        };
      }).filter(Boolean) as { emprendedor_id: string; nombre_local: string | null; direccion: string; comuna_id: string; es_principal: boolean }[];
      if (rows.length > 0) {
        await supabase.from("emprendedor_locales").insert(rows);
      }
    }

    let classificationResult: {
      estado_publicacion?: "publicado" | "pendiente_aprobacion";
      motivo_verificacion?: string | null;
    } = {};

    if (useClassifyAndAssign) {
      const result = await classifyAndAssignBusiness(supabase, emprendedorId, {
        descripcion_negocio: descripcionNegocio,
        keywords_usuario: keywordsUsuario,
      });
      if (result.estado_publicacion) classificationResult.estado_publicacion = result.estado_publicacion;
      if (result.motivo_verificacion !== undefined) classificationResult.motivo_verificacion = result.motivo_verificacion;
    }

    // Sincronizar con Algolia en segundo plano (no bloquear publicación si falla)
    syncEmprendedorToAlgolia(String(emprendedorId)).catch(() => {});

    // Contador "personas ayudando": un emprendimiento más en esta comuna
    incrementCommuneActivity(comunaBase.slug, "contributors").catch(() => {});

    // ============================
    // INSERT SUBCATEGORÍAS RELACIÓN
    // ============================

    if (subcats.length) {
      const rows = subcats.map((sub, i) => ({
        emprendedor_id: emprendedorId,
        subcategoria_id: sub.id,
        source_type: hasLegacyTaxonomy ? "manual" : "ai",
        is_primary: i === 0,
        ...(confianzaFinal != null && !hasLegacyTaxonomy ? { confidence_score: confianzaFinal } : {}),
      }));

      const { error } = await supabase
        .from("emprendedor_subcategorias")
        .insert(rows);

      if (error) {
        return NextResponse.json(
          { ok: false, error: `Error guardando subcategorías: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // ============================
    // INSERT COMUNAS COBERTURA RELACIÓN
    // ============================

    if (comunasCobertura.length) {
      const rows = comunasCobertura.map((comuna) => ({
        emprendedor_id: emprendedorId,
        comuna_id: comuna.id,
      }));

      const { error } = await supabase
        .from("emprendedor_comunas_cobertura")
        .insert(rows);

      if (error) {
        return NextResponse.json(
          { ok: false, error: `Error guardando comunas de cobertura: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // ============================
    // INSERT REGIONES COBERTURA RELACIÓN
    // ============================

    if (regionesCobertura.length) {
      const rows = regionesCobertura.map((region) => ({
        emprendedor_id: emprendedorId,
        region_id: region.id,
      }));

      const { error } = await supabase
        .from("emprendedor_regiones_cobertura")
        .insert(rows);

      if (error) {
        return NextResponse.json(
          { ok: false, error: `Error guardando regiones de cobertura: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // ============================
    // REINDEX ALGOLIA (ITEM)
    // ============================

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    try {
      await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/reindex/emprendedores/item?id=${encodeURIComponent(
          emprendedorId
        )}`
      );
    } catch (_err) {
      // Ignorar errores de reindex para no bloquear la publicación
    }

    const finalEstado =
      useClassifyAndAssign && classificationResult.estado_publicacion
        ? classificationResult.estado_publicacion
        : estadoPublicacion;
    const finalMotivo =
      useClassifyAndAssign && classificationResult.motivo_verificacion !== undefined
        ? classificationResult.motivo_verificacion
        : motivoVerificacion ?? undefined;

    const productosDetectados = arr(body.productos_detectados).slice(0, 8);
    if (productosDetectados.length > 0 && descripcionNegocio.length >= 20) {
      // Tabla de aprendizaje consolidada
      await supabase.from("textos_aprendizaje").insert({
        descripcion: descripcionNegocio,
        palabras_detectadas: productosDetectados,
      });

      // Tabla auxiliar para el detector (formato simple: descripcion + keywords)
      await supabase.from("detector_aprendizaje").insert({
        descripcion: descripcionNegocio,
        keywords: productosDetectados,
      });
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: emprendedorId,
        slug: inserted.slug,
        estado_publicacion: finalEstado,
        motivo_verificacion: finalMotivo,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al publicar.",
      },
      { status: 500 }
    );
  }
}