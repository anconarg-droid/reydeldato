"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TrackImpressions from "@/components/TrackImpressions";
import CoverageBadge from "@/components/CoverageBadge";
import { getSessionId } from "@/lib/sessionId";
import { getProfileState } from "@/lib/profileState";
import ComunaEnPreparacion from "@/components/ComunaEnPreparacion";

type BucketLabel =
  | "local"
  | "exacta"
  | "cobertura_comuna"
  | "regional"
  | "nacional"
  | "relacionada";

type SearchHit = {
  objectID?: string;
  id?: string;
  slug?: string;
  nombre?: string;
  descripcion_corta?: string;
  comuna_base_nombre?: string;
  comuna_base_slug?: string;
  nivel_cobertura?: string | null;
  coverage_labels?: string[] | null;
  coverage_keys?: string[] | null;
  tipo_actividad?: string | null;
  sector_slug?: string | null;
  tags_slugs?: string[] | null;
  foto_principal_url?: string | null;
  bucket?: BucketLabel;
  tiene_local_en_comuna?: boolean;
  atiende_comuna?: boolean;
  comuna_match_source?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
  created_at?: string | null;
  plan?: string | null;
  trial_expira?: string | null;
  trial_inicia_at?: string | null;
  trial_expira_at?: string | null;
  plan_tipo?: string | null;
  plan_periodicidad?: string | null;
  plan_activo?: boolean | null;
  plan_expira_at?: string | null;
};

/** Días durante los cuales se muestra la etiqueta "🆕 Nuevo" sobre la foto. */
export const NEW_BADGE_DAYS = 30;

function MapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2.25c-3.1 0-5.75 2.46-5.75 5.7 0 3.76 4.52 8.18 5.19 8.84.3.3.78.3 1.08 0 .67-.66 5.18-5.08 5.18-8.84 0-3.24-2.65-5.7-5.75-5.7Zm0 3.25a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

const SECTOR_LABELS: Record<string, string> = {
  alimentacion: "Alimentación",
  hogar_construccion: "Hogar y construcción",
  automotriz: "Automotriz",
  salud_bienestar: "Salud y bienestar",
  belleza_estetica: "Belleza y estética",
  mascotas: "Mascotas",
  eventos: "Eventos",
  educacion_clases: "Educación y clases",
  tecnologia: "Tecnología",
  comercio_tiendas: "Comercio y tiendas",
  transporte_fletes: "Transporte y fletes",
  jardin_agricultura: "Jardín y agricultura",
  profesionales_asesorias: "Profesionales y asesorías",
  turismo_alojamiento: "Turismo y alojamiento",
  otros: "Otros",
};

const TIPO_LABELS: Record<string, string> = {
  venta: "Venta",
  servicio: "Servicio",
  arriendo: "Arriendo",
};

type SearchSuccessResponse = {
  ok: true;
  total: number;
  q?: string;
  comuna?: string | null;
  items: SearchHit[];
  suggested_terms?: string[];
};

type ProgresoItem = { nombre: string; actual: number; meta: number };

type ComunaEnPreparacionResponse = {
  modo: "comuna_en_preparacion";
  comuna: string;
  comuna_slug: string;
  progreso?: ProgresoItem[];
};

type SearchResponse = SearchSuccessResponse | ComunaEnPreparacionResponse;

export type QuickFilterOrderBy =
  | "todos"
  | "perfil_completo"
  | "nuevos";

type Props = {
  query: string;
  comuna?: string;
  sectorSlug?: string;
  tipoActividad?: string;
  subcategoriaSlug?: string;
  orderBy?: QuickFilterOrderBy;
  onSuggestedTerms?: (terms: string[]) => void;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function prettyComunaSlug(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (v.includes(" ")) return v;
  const withSpaces = v.replace(/-/g, " ");
  return withSpaces
    .split(" ")
    .map((word) =>
      word.length ? word.charAt(0).toUpperCase() + word.slice(1) : ""
    )
    .join(" ");
}

/** Ej: electricista -> Electricista; gasfiter -> Gasfiter. Para títulos con subcategoría. */
function subcategoriaSlugToLabel(slug: string): string {
  const v = slug.trim().toLowerCase().replace(/-/g, " ");
  if (!v) return "";
  return v
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/** Plural simple para mensajes: Electricista -> Electricistas. */
function subcategoriaLabelPlural(label: string): string {
  const L = label.trim();
  if (!L) return "";
  const lower = L.toLowerCase();
  if (lower.endsWith("s") || lower.endsWith("x")) return L;
  return L + "s";
}

function isNewEmprendimiento(createdAt: string | null | undefined, days: number): boolean {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

type CardSearchContext = {
  query?: string;
  sectorSlug?: string;
};

function Card({
  hit,
  comuna,
  searchContext,
}: {
  hit: SearchHit;
  comuna?: string;
  searchContext?: CardSearchContext;
}) {
  const slug = s(hit.slug || hit.objectID || hit.id);
  const linkSlug = slug;
  const nombre = s(hit.nombre) || "Emprendimiento";
  const descripcion = s(hit.descripcion_corta);
  const comunaBase = s(hit.comuna_base_nombre);
  const comunaBaseSlug = s(hit.comuna_base_slug);
  const coverageLabels =
    (hit.coverage_labels || undefined)?.filter(Boolean) ?? [];
  const coberturaTexto = coverageLabels[0] || comunaBase || "—";
  const sectorSlug = s(hit.sector_slug);
  const tipoSlug = s(hit.tipo_actividad);
  const sectorLabel = sectorSlug
    ? SECTOR_LABELS[sectorSlug] || sectorSlug
    : "";
  const tipoLabel = tipoSlug ? TIPO_LABELS[tipoSlug] || tipoSlug : "";
  const tags =
    (hit.tags_slugs || undefined)?.map((t) => t.trim()).filter(Boolean) ?? [];

  const comunaNorm = comuna ? comuna.trim().toLowerCase() : "";
  const comunaBuscadaLabel = comuna ? prettyComunaSlug(comuna) : "";
  const comunaBaseNorm = comunaBase.toLowerCase();
  const comunaBaseSlugNorm = comunaBaseSlug.toLowerCase();
  const matchesBase =
    !!comunaNorm &&
    (comunaNorm === comunaBaseNorm || comunaNorm === comunaBaseSlugNorm);
  const coverageLabelsNorm = coverageLabels.map((c) => c.toLowerCase());
  const atiendeComuna =
    !!comunaNorm && !matchesBase && coverageLabelsNorm.includes(comunaNorm);

  const nivelCobertura = s(hit.nivel_cobertura).toLowerCase();
  const isRegional =
    nivelCobertura === "varias_regiones" || nivelCobertura === "regional";
  const isNacional = nivelCobertura === "nacional";

  /** Etiqueta "Atiende [comuna]" cuando no está en la comuna buscada pero sí la atiende (cobertura, regional o nacional). */
  const showAtiendeComunaLabel =
    !!comunaNorm &&
    !matchesBase &&
    (atiendeComuna || isRegional || isNacional);

  const profileState = getProfileState(hit.created_at, {
    planActivo: hit.plan_activo ?? undefined,
    planExpiraAt: hit.plan_expira_at ?? undefined,
    trialExpiraAt: hit.trial_expira_at ?? hit.trial_expira ?? undefined,
    trialExpira: hit.trial_expira ?? undefined,
  });
  const showNewBadge = profileState.showNewBadge;
  const showFullProfileBadge = profileState.showFullProfileBadge;
  const isFullProfileCard = profileState.isFullProfile;

  // Solo perfil completo (TRIAL o PLAN_ACTIVO) tiene ficha clickeable; PLAN_EXPIRADO no abre ficha
  const fichaHref =
    isFullProfileCard && linkSlug
      ? `/emprendedor/${encodeURIComponent(linkSlug)}`
      : null;
  const instagram = s(hit.instagram);
  const sitioWeb = s(hit.sitio_web);
  const hasInstagram = instagram.length > 0;
  const hasWeb = sitioWeb.length > 0;
  const whatsapp = s(hit.whatsapp);
  const hasWhatsapp = whatsapp.length >= 9;
  const WA_DEFAULT_MESSAGE =
    "Hola, vi tu emprendimiento en Rey del Dato y quiero hacer una consulta.";
  const waBase =
    whatsapp.startsWith("http") ? whatsapp : `https://wa.me/${whatsapp.replace(/\D/g, "")}`;
  const whatsappLink = hasWhatsapp
    ? `${waBase}${waBase.includes("?") ? "&" : "?"}text=${encodeURIComponent(WA_DEFAULT_MESSAGE)}`
    : null;

  function trackCardClick() {
    const sessionId = getSessionId();
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "card_click",
        slug: linkSlug,
        comuna_slug: comuna || null,
        sector_slug: searchContext?.sectorSlug || null,
        q: searchContext?.query || null,
        session_id: sessionId || undefined,
      }),
    }).catch((err) => console.error("card_click track error:", err));
  }

  function handleCardClick() {
    trackCardClick();
  }

  const cardMain = (
    <>
      <div className="aspect-video bg-slate-100 overflow-hidden relative shrink-0">
        {showNewBadge && (
          <span className="absolute top-2 left-2 z-10 rounded-md bg-sky-600 px-2 py-1 text-xs font-bold text-white shadow-sm">
            🆕 Nuevo
          </span>
        )}
        {showFullProfileBadge && !showNewBadge && (
          <span className="absolute top-2 left-2 z-10 rounded-md bg-amber-100 border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800 shadow-sm">
            ⭐ Perfil completo
          </span>
        )}
        {showFullProfileBadge && showNewBadge && (
          <span className="absolute top-2 right-2 z-10 rounded-md bg-amber-100 border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800 shadow-sm">
            ⭐ Perfil completo
          </span>
        )}
        {hit.foto_principal_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.foto_principal_url}
            alt=""
            className="w-full h-full object-cover card-img-zoom"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-slate-300 text-4xl"
            aria-hidden
          >
            🏪
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col min-h-0">
        {/* Línea 1: comuna base */}
        <p className="text-base font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5" aria-label={`Ubicado en ${comunaBase || "—"}`}>
          <MapPin className="w-4 h-4 text-slate-500" />
          <span>{comunaBase || "—"}</span>
        </p>
        {/* Línea 2: nombre del negocio */}
        <h2 className="font-semibold text-slate-900 text-base line-clamp-2 mb-1.5">
          {nombre}
        </h2>
        {/* Badge: Con local en comuna | En tu comuna (base) | Atiende [comuna] (cobertura) */}
        {hit.bucket === "local" && comunaBuscadaLabel && (
          <div className="mb-2">
            <CoverageBadge type="local_en_comuna" comunaBuscada={comunaBuscadaLabel} />
          </div>
        )}
        {hit.bucket !== "local" && matchesBase && comunaBuscadaLabel && (
          <div className="mb-2">
            <CoverageBadge type="local" comunaBuscada={comunaBuscadaLabel} />
          </div>
        )}
        {hit.bucket !== "local" && !matchesBase && showAtiendeComunaLabel && comunaBuscadaLabel && (
          <div className="mb-2" style={{ marginTop: "6px" }}>
            <CoverageBadge type="coverage" comunaBuscada={comunaBuscadaLabel} />
          </div>
        )}
        {/* Línea 3: categoría / sector (tipografía secundaria) */}
        {sectorLabel && (
          <p className="text-xs text-slate-500 mb-2 line-clamp-1">
            {sectorLabel}
          </p>
        )}
        {/* Línea 4: descripción */}
        <p className="text-sm text-slate-600 line-clamp-2 flex-1 min-h-0">
          {descripcion || (
            <span className="text-slate-400 italic">Sin descripción</span>
          )}
        </p>
      </div>
    </>
  );

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  const actionsRow = (
    <div className="mt-auto px-4 pb-4 flex flex-col gap-2 shrink-0" onClick={stopProp}>
      <div className="flex flex-wrap items-center gap-2">
        {whatsappLink && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 font-medium">
              Contacto directo con el negocio
            </span>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                stopProp(e);
                try {
                  const sessionId = getSessionId();
                  const payload = JSON.stringify({
                    event_type: "whatsapp_click",
                    slug: linkSlug,
                    comuna_slug: comuna || null,
                    sector_slug: searchContext?.sectorSlug || null,
                    q: searchContext?.query || null,
                    session_id: sessionId || undefined,
                  });

                  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
                    const blob = new Blob([payload], { type: "application/json" });
                    (navigator as Navigator & {
                      sendBeacon: (url: string, data?: BodyInit | null) => boolean;
                    }).sendBeacon("/api/event", blob);
                  } else {
                    fetch("/api/event", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: payload,
                      keepalive: true,
                    }).catch((err) => console.error("whatsapp_click track error:", err));
                  }
                } catch (err) {
                  console.error("whatsapp_click track error:", err);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 w-fit"
              aria-label="Hablar por WhatsApp"
            >
              <span className="group-hover:hidden">WhatsApp</span>
              <span className="hidden group-hover:inline">Hablar por WhatsApp</span>
            </a>
          </div>
        )}
        {fichaHref && (
          <Link
            href={fichaHref}
            onClick={handleCardClick}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Ver ficha
          </Link>
        )}
      </div>
    </div>
  );

  const articleClass = isFullProfileCard
    ? "card-hover-effect group border-2 border-[#F0D48A] rounded-xl bg-white/80 overflow-hidden shadow-sm flex flex-col cursor-pointer"
    : "card-hover-effect group border border-slate-200 rounded-xl bg-white/80 overflow-hidden shadow-sm flex flex-col hover:border-slate-300 cursor-default";

  if (fichaHref) {
    return (
      <article className={articleClass}>
        <Link
          href={fichaHref}
          onClick={handleCardClick}
          className="flex flex-col flex-1 min-h-0 min-w-0 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-inset rounded-t-xl no-underline text-inherit"
        >
          {cardMain}
        </Link>
        {actionsRow}
      </article>
    );
  }

  return (
    <article className={articleClass}>
      {cardMain}
      {actionsRow}
    </article>
  );
}

export default function PublicSearchResults({
  query,
  comuna,
  sectorSlug,
  tipoActividad,
  subcategoriaSlug,
  orderBy = "todos",
  onSuggestedTerms,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [visibleCount, setVisibleCount] = useState(9);

  const hasFilters =
    !!query.trim() ||
    !!(comuna && comuna.trim()) ||
    !!(sectorSlug && sectorSlug.trim()) ||
    !!(subcategoriaSlug && subcategoriaSlug.trim()) ||
    !!(tipoActividad && tipoActividad.trim());

  useEffect(() => {
    if (!hasFilters) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (comuna && comuna.trim()) params.set("comuna", comuna.trim());
        if (sectorSlug && sectorSlug.trim()) params.set("sector", sectorSlug.trim());
        if (subcategoriaSlug && subcategoriaSlug.trim()) params.set("subcategoria", subcategoriaSlug.trim());
        if (tipoActividad && tipoActividad.trim()) params.set("tipo_actividad", tipoActividad.trim());
        if (orderBy && orderBy !== "todos") params.set("order", orderBy);

        const res = await fetch(`/api/buscar?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Error HTTP ${res.status}`);
        }

        const json = (await res.json()) as SearchResponse;
        setData(json);
        if (
          onSuggestedTerms &&
          "suggested_terms" in json &&
          Array.isArray((json as SearchSuccessResponse).suggested_terms)
        ) {
          onSuggestedTerms((json as SearchSuccessResponse).suggested_terms!);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err?.message || "Error al buscar");
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [hasFilters, query, comuna, sectorSlug, subcategoriaSlug, tipoActividad, orderBy, onSuggestedTerms]);

  useEffect(() => {
    setVisibleCount(9);
  }, [query, comuna, sectorSlug, subcategoriaSlug, tipoActividad, orderBy]);

  if (!hasFilters) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-1 sm:mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="border border-slate-200 rounded-2xl bg-white/80 overflow-hidden shadow-sm animate-pulse"
          >
            <div className="aspect-video bg-slate-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
              <div className="h-8 bg-slate-200 rounded w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">Error al buscar: {error}</div>
    );
  }

  if (!data) {
    return null;
  }

  if ("modo" in data && data.modo === "comuna_en_preparacion") {
    return (
      <div className="mt-6 max-w-2xl mx-auto">
        <p className="text-sm text-slate-600 mb-4">
          Rey del Dato aún no está disponible en <strong>{data.comuna}</strong>.
        </p>
        <ComunaEnPreparacion
          comunaSlug={data.comuna_slug}
          comunaNombre={data.comuna}
          progreso={data.progreso ?? [{ nombre: "Emprendimientos", actual: 0, meta: 40 }]}
        />
      </div>
    );
  }

  const items = "items" in data && Array.isArray(data.items) ? data.items : [];
  const total =
    "total" in data && typeof data.total === "number"
      ? data.total
      : items.length;

  const comunaLabel = comuna ? prettyComunaSlug(comuna) : "";
  const subcategoriaLabel = subcategoriaSlug?.trim() ? subcategoriaSlugToLabel(subcategoriaSlug) : "";
  const subcategoriaPlural = subcategoriaLabel ? subcategoriaLabelPlural(subcategoriaLabel) : "";
  const isSubcategoriaComuna = !!(comunaLabel && subcategoriaPlural);

  if (items.length === 0) {
    const emptyTitle =
      isSubcategoriaComuna
        ? `No hay ${subcategoriaPlural.toLowerCase()} publicados en esta categoría para ${comunaLabel}.`
        : subcategoriaSlug && subcategoriaSlug.trim() && comunaLabel
          ? "Aún no hay negocios publicados en esta categoría para esta comuna."
          : (() => {
              const busqueda = query.trim() || "tu búsqueda";
              return comunaLabel
                ? `No encontramos resultados para "${busqueda}" en ${comunaLabel}.`
                : `No encontramos resultados para "${busqueda}".`;
            })();
    return (
      <div className="mt-1 sm:mt-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-5 text-center">
        <h2 className="text-base font-semibold text-slate-900 mb-2">
          {emptyTitle}
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          Prueba con otra palabra, cambia la comuna o explora una búsqueda relacionada.
        </p>
        {isSubcategoriaComuna && comuna && (
          <p className="text-sm">
            <Link
              href={`/${encodeURIComponent(comuna)}`}
              className="font-medium text-sky-700 hover:text-sky-800"
            >
              Ver todos los servicios en {comunaLabel}
            </Link>
          </p>
        )}
      </div>
    );
  }

  const slugs = items.map((i) => s(i.slug || i.objectID || i.id)).filter(Boolean);

  const searchContext: CardSearchContext = { query: query.trim() || undefined, sectorSlug: sectorSlug || undefined };

  if (!comuna) {
    return (
      <section className="mt-1 sm:mt-2 space-y-4">
        <TrackImpressions
          slugs={slugs}
          comuna_slug={undefined}
          sector_slug={sectorSlug}
          q={query.trim() || undefined}
        />
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            {total === 1
              ? "1 resultado"
              : `${total} resultados`}
            {query.trim() ? ` para “${query.trim()}”` : ""}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, visibleCount).map((hit, index) => (
            <Card key={index} hit={hit} comuna={undefined} searchContext={searchContext} />
          ))}
        </div>

        {items.length > visibleCount && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 9)}
              className="px-4 py-2 text-sm font-semibold rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
            >
              Cargar más resultados
            </button>
          </div>
        )}
      </section>
    );
  }

  const grouped: Record<BucketLabel, SearchHit[]> = {
    local: [],
    exacta: [],
    cobertura_comuna: [],
    regional: [],
    nacional: [],
    relacionada: [],
  };

  items.forEach((hit) => {
    const raw = (hit.bucket || "relacionada") as BucketLabel;
    const key = grouped[raw] ? raw : "relacionada";
    grouped[key].push(hit);
  });

  const conLocalEnComuna = grouped.local.length;
  const exactosComuna = grouped.exacta.length;
  const atiendenComuna = grouped.cobertura_comuna.length;
  const countRegional = grouped.regional.length;
  const countNacional = grouped.nacional.length;
  const otrosRelacionados = grouped.relacionada.length;

  const hasLocal = conLocalEnComuna > 0;
  const hasExacta = exactosComuna > 0;
  const hasCobertura = atiendenComuna > 0;
  const hasRegional = countRegional > 0;
  const hasNacional = countNacional > 0;
  const hasRelacionada = otrosRelacionados > 0;
  /** Cualquier resultado que “atiende” la comuna: cobertura comuna, regional o nacional. Evita mensajes contradictorios. */
  const hasAlguienQueAtiende = hasLocal || hasExacta || hasCobertura || hasRegional || hasNacional;

  const renderBlock = (
    key: BucketLabel,
    title: string,
    hits: SearchHit[],
    emptyMessage?: string,
    introLines?: string[],
    sectionClassName?: string
  ) => {
    const showSection = hits.length > 0 || emptyMessage !== undefined;
    if (!showSection) return null;

    const n = hits.length;
    const gridClass =
      n <= 1
        ? "grid grid-cols-1 gap-4 max-w-md"
        : n === 2
          ? "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

    return (
      <section key={key} className={`space-y-2 ${sectionClassName ?? ""}`.trim()}>
        {introLines && introLines.length > 0 && (
          <div className="space-y-1" role="status">
            {introLines.map((line, i) => (
              <p key={i} className="text-sm text-slate-600">
                {line}
              </p>
            ))}
          </div>
        )}
        <header className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {hits.length > 0 && (
            <p className="text-xs text-slate-500">
              {hits.length === 1
                ? "1 emprendimiento"
                : `${hits.length} emprendimientos`}
            </p>
          )}
        </header>
        {hits.length > 0 ? (
          <div className={gridClass}>
            {hits.map((hit, idx) => (
              <Card key={`${key}-${idx}`} hit={hit} comuna={comuna} searchContext={searchContext} />
            ))}
          </div>
        ) : (
          emptyMessage && (
            <p className="text-sm text-slate-600" role="status">
              {emptyMessage}
            </p>
          )
        )}
      </section>
    );
  };

  const totalAtienden = atiendenComuna + countRegional + countNacional;
  const titleLocal = `Con local en ${comunaLabel}`;
  const titleExacta = "En tu comuna";
  const titleCobertura = `También atienden ${comunaLabel}`;
  /** Todos los que atienden la comuna por cobertura (sin local en comuna): cobertura explícita + regional + nacional. */
  const atiendenComunaTodos: SearchHit[] = [
    ...grouped.cobertura_comuna,
    ...grouped.regional,
    ...grouped.nacional,
  ];
  const hasAtiendenTodos = atiendenComunaTodos.length > 0;
  const emptyMsgExacta = !hasLocal && !hasExacta
    ? isSubcategoriaComuna
      ? `No encontramos ${subcategoriaPlural.toLowerCase()} ubicados en ${comunaLabel}.`
      : `No encontramos resultados en ${comunaLabel}.`
    : undefined;

  /** Resumen: distingue "con local en comuna", "en tu comuna" (base) y "que también atienden". */
  const totalEnComuna = conLocalEnComuna + exactosComuna;
  const summaryLine =
    comunaLabel && (hasLocal || hasExacta)
      ? totalAtienden > 0
        ? `${totalEnComuna} en ${comunaLabel}${hasLocal && conLocalEnComuna > 0 ? ` (${conLocalEnComuna} con local)` : ""} · ${totalAtienden} que ${totalAtienden === 1 ? "también atiende" : "también atienden"} ${comunaLabel}`
        : `${totalEnComuna} en ${comunaLabel}${hasLocal && conLocalEnComuna > 0 ? ` (${conLocalEnComuna} con local)` : ""}`
      : comunaLabel && hasAtiendenTodos
        ? `${totalAtienden} que ${totalAtienden === 1 ? "atiende" : "atienden"} ${comunaLabel}`
        : null;

  return (
    <section className="mt-1 sm:mt-2 space-y-4">
      <TrackImpressions
        slugs={slugs}
        comuna_slug={comuna}
        sector_slug={sectorSlug}
        q={query.trim() || undefined}
      />
      <div>
        {summaryLine ? (
          <h2 className="text-base font-semibold text-slate-900">
            {summaryLine}
          </h2>
        ) : (
          <h2 className="text-base font-semibold text-slate-900">
            {hasAlguienQueAtiende
              ? isSubcategoriaComuna
                ? `Aún no tenemos ${subcategoriaPlural.toLowerCase()} registrados en ${comunaLabel}.`
                : `No encontramos resultados en ${comunaLabel}, pero sí ${totalAtienden} servicio${totalAtienden === 1 ? "" : "s"} que ${totalAtienden === 1 ? "atiende" : "atienden"} tu comuna`
              : isSubcategoriaComuna
                ? `No encontramos servicios de ${subcategoriaPlural.toLowerCase()} para ${comunaLabel}.`
                : `No encontramos resultados en ${comunaLabel} ni negocios que atiendan tu comuna.`}
          </h2>
        )}
        {!hasLocal && !hasExacta && hasAlguienQueAtiende && isSubcategoriaComuna && (
          <p className="mt-1.5 text-sm text-slate-600" role="status">
            ¿Conoces alguno?{" "}
            <Link
              href="/publicar"
              className="text-sky-600 hover:text-sky-800 font-medium underline underline-offset-2"
            >
              Invítalo a registrarse en Rey del Dato
            </Link>
            .
          </p>
        )}
        {!hasLocal && !hasExacta && hasAlguienQueAtiende && !isSubcategoriaComuna && (
          <p className="mt-1 text-sm text-slate-600" role="status">
            Pero estos servicios sí atienden tu comuna.
          </p>
        )}
      </div>

      {/* 1. Con local en la comuna (prioridad máxima) */}
      {hasLocal &&
        renderBlock(
          "local",
          titleLocal,
          grouped.local,
          undefined,
          undefined,
          "rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3"
        )}

      {/* 2. En tu comuna (base en la comuna, sin local físico en la comuna) */}
      {hasExacta &&
        renderBlock(
          "exacta",
          titleExacta,
          grouped.exacta,
          undefined,
          undefined,
          "rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3"
        )}

      {/* 3. Atienden tu comuna (cobertura explícita, regional, nacional) */}
      {hasAtiendenTodos &&
        renderBlock(
          "cobertura_comuna",
          titleCobertura,
          atiendenComunaTodos,
          undefined,
          undefined,
          "rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 mt-3"
        )}

      {/* 3. Otros resultados relacionados */}
      {hasRelacionada && (
        <section
          key="relacionada"
          className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-4"
          aria-label="Otros resultados relacionados"
        >
          <p className="text-sm text-slate-600" role="status">
            No encontramos resultados en {comunaLabel} ni servicios que atiendan tu comuna.
          </p>
          <p className="text-sm text-slate-600" role="status">
            Te mostramos negocios relacionados en otras comunas por si quieres contactarlos o visitarlos directamente.
          </p>
          <header className="flex items-baseline justify-between gap-2 pt-1">
            <h3 className="text-sm font-medium text-slate-600">
              Otros resultados relacionados ({otrosRelacionados})
            </h3>
          </header>
          <div
            className={
              otrosRelacionados <= 1
                ? "grid grid-cols-1 gap-4 max-w-md pt-1"
                : otrosRelacionados === 2
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-1"
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1"
            }
          >
            {grouped.relacionada.map((hit, idx) => (
              <Card key={`relacionada-${idx}`} hit={hit} comuna={comuna} searchContext={searchContext} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

