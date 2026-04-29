"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeText } from "@/lib/search/normalizeText";
import PublicSearchResults from "@/components/search/PublicSearchResults";

type TipoFichaFiltro = "todas" | "completas" | "basicas";
import { parseSearchIntent } from "@/lib/search/parseSearchIntent";
import SearchAutocompleteDropdown, {
  type AutocompleteSuggestion,
} from "@/components/SearchAutocompleteDropdown";
import TrackPageView from "@/components/TrackPageView";
import { getRegionShort } from "@/utils/regionShort";

type ComunaSuggestion = { nombre: string; slug: string; region_nombre?: string };

type ComunaResolved = {
  id: number;
  slug: string;
  nombre: string;
  region_nombre?: string;
};

function prettyQuery(raw: string): string {
  const q = (raw || "").trim();
  if (!q) return "";
  return q.charAt(0).toUpperCase() + q.slice(1);
}

const SECTOR_EMOJI: Record<string, string> = {
  alimentacion: "🍞",
  hogar_construccion: "🏠",
  automotriz: "🚗",
  salud_bienestar: "💪",
  belleza_estetica: "✨",
  mascotas: "🐾",
  eventos: "🎉",
  educacion_clases: "📚",
  tecnologia: "💻",
  comercio_tiendas: "🛒",
  transporte_fletes: "🚚",
  jardin_agricultura: "🌱",
  profesionales_asesorias: "📋",
  turismo_alojamiento: "🏨",
  otros: "📌",
};

function RubrosCarousel({
  sectores,
  sectorActivo,
  buildSectorUrl,
}: {
  sectores: SectorConteo[];
  sectorActivo: string;
  buildSectorUrl: (slug: string) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sorted = useMemo(
    () => [...sectores].filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    [sectores]
  );

  const updateArrows = useMemo(
    () => () => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    },
    []
  );

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    el.addEventListener("scroll", updateArrows);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateArrows);
    };
  }, [updateArrows, sorted.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({
      left: dir === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <button
          type="button"
          onClick={() => scroll("left")}
          onKeyDown={(e) => e.key === "Enter" && scroll("left")}
          aria-label="Ver rubros anteriores"
          className={`hidden md:flex flex-shrink-0 w-10 h-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors ${
            !canScrollLeft ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="rubros-carousel flex flex-1 overflow-x-auto overflow-y-hidden scroll-smooth gap-3 py-1 -mx-1 touch-pan-x overscroll-x-contain"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
          role="region"
          aria-label="Rubros en la comuna"
        >
          <style>{`.rubros-carousel::-webkit-scrollbar { display: none; }`}</style>
          <div className="flex flex-nowrap gap-3 min-w-0">
            {sorted.map((s, index) => {
              const isFirst = index === 0;
              const isActive = sectorActivo === s.slug;
              const emoji = SECTOR_EMOJI[s.slug] ?? "📌";
              return (
                <Link
                  key={s.slug}
                  href={buildSectorUrl(s.slug)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-colors whitespace-nowrap min-w-[120px] ${
                    isFirst && !isActive
                      ? "bg-sky-50 border-sky-300 text-sky-900 shadow-sm ring-2 ring-sky-200/60 hover:bg-sky-100 hover:border-sky-400"
                      : isActive
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                  }`}
                >
                  <span className="text-lg leading-none select-none" aria-hidden>
                    {emoji}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{s.label}</span>
                  {isFirst && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${
                        isActive ? "text-sky-200" : "text-sky-600"
                      }`}
                    >
                      Más
                    </span>
                  )}
                  <span
                    className={`flex-shrink-0 ${isActive ? "text-sky-100" : "text-slate-400"}`}
                  >
                    {s.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scroll("right")}
          onKeyDown={(e) => e.key === "Enter" && scroll("right")}
          aria-label="Ver más rubros"
          className={`hidden md:flex flex-shrink-0 w-10 h-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors ${
            !canScrollRight ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type SectorConteo = { slug: string; label: string; count: number };
type TagPorSector = { tag: string; tagSlug: string; count?: number };

const SECTORES: { slug: string; label: string }[] = [
  { slug: "alimentacion", label: "Alimentación" },
  { slug: "hogar_construccion", label: "Hogar y construcción" },
  { slug: "automotriz", label: "Automotriz" },
  { slug: "salud_bienestar", label: "Salud y bienestar" },
  { slug: "belleza_estetica", label: "Belleza y estética" },
  { slug: "mascotas", label: "Mascotas" },
  { slug: "eventos", label: "Eventos" },
  { slug: "educacion_clases", label: "Educación y clases" },
  { slug: "tecnologia", label: "Tecnología" },
  { slug: "comercio_tiendas", label: "Comercio y tiendas" },
  { slug: "transporte_fletes", label: "Transporte y fletes" },
  { slug: "jardin_agricultura", label: "Jardín y agricultura" },
  { slug: "profesionales_asesorias", label: "Profesionales y asesorías" },
  { slug: "turismo_alojamiento", label: "Turismo y alojamiento" },
  { slug: "otros", label: "Otros" },
];

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

type QuickFilterValue = "todos" | "perfil_completo" | "nuevos";

const QUICK_FILTERS: { value: QuickFilterValue; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "nuevos", label: "Nuevos" },
  { value: "perfil_completo", label: "Perfil completo" },
];

function ComunaQuickFilters({
  active,
  onSelect,
}: {
  active: QuickFilterValue;
  onSelect: (v: QuickFilterValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
        Ver:
      </span>
      {QUICK_FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === value
              ? "bg-sky-600 text-white border border-sky-600"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TipoFichaSelect({
  value,
  onChange,
}: {
  value: TipoFichaFiltro;
  onChange: (v: TipoFichaFiltro) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label htmlFor="tipo-ficha-buscar" className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
        Ficha:
      </label>
      <select
        id="tipo-ficha-buscar"
        value={value}
        onChange={(e) => onChange(e.target.value as TipoFichaFiltro)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 min-w-[11rem]"
      >
        <option value="todas">Todas</option>
        <option value="completas">Solo completas</option>
        <option value="basicas">Solo básicas</option>
      </select>
    </div>
  );
}

type TagConteo = { tagSlug: string; label: string; count: number };

function CategoriasExpandiblesComuna({
  comuna,
  sectoresConCount,
  sectorActivo,
  subcategoriaActiva,
  buildSubcategoriaUrl,
}: {
  comuna: string;
  sectoresConCount: { slug: string; label: string; count: number }[];
  sectorActivo: string;
  subcategoriaActiva?: string;
  buildSubcategoriaUrl: (slug: string) => string;
}) {
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set());
  const [sectorConSubcategoriaActiva, setSectorConSubcategoriaActiva] = useState<string | null>(null);
  const [tagsBySector, setTagsBySector] = useState<Record<string, TagConteo[]>>({});
  const [loadingSector, setLoadingSector] = useState<string | null>(null);
  const expandedForSubcatRef = useRef<string | null>(null);

  useEffect(() => {
    if (!subcategoriaActiva?.trim()) {
      expandedForSubcatRef.current = null;
      setSectorConSubcategoriaActiva(null);
      return;
    }
    if (expandedForSubcatRef.current === subcategoriaActiva) return;
    expandedForSubcatRef.current = subcategoriaActiva;
    fetch(`/api/buscar/sector-por-tag?tag=${encodeURIComponent(subcategoriaActiva)}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; sector_slug?: string | null }) => {
        if (!data?.ok || !data.sector_slug) return;
        setSectorConSubcategoriaActiva(data.sector_slug);
        setExpandedSlugs((prev) => new Set(prev).add(data.sector_slug!));
        if (tagsBySector[data.sector_slug]) return;
        setLoadingSector(data.sector_slug);
        fetch(
          `/api/buscar/tags-por-comuna-sector?comuna=${encodeURIComponent(comuna)}&sector=${encodeURIComponent(data.sector_slug)}`
        )
          .then((r) => r.json())
          .then((d: { ok?: boolean; tags?: TagConteo[] }) => {
            const list = d.tags;
            if (d?.ok && Array.isArray(list)) {
              const sector = data.sector_slug!;
              setTagsBySector((prev) => ({ ...prev, [sector]: list }));
            }
          })
          .finally(() => setLoadingSector(null));
      });
  }, [subcategoriaActiva, comuna, tagsBySector]);

  const toggleSector = useCallback(
    (slug: string) => {
      const isExpanded = expandedSlugs.has(slug);
      if (isExpanded) {
        if (slug === sectorConSubcategoriaActiva) return;
        setExpandedSlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
        return;
      }
      setExpandedSlugs((prev) => new Set(prev).add(slug));
      if (tagsBySector[slug]) return;
      setLoadingSector(slug);
      fetch(
        `/api/buscar/tags-por-comuna-sector?comuna=${encodeURIComponent(comuna)}&sector=${encodeURIComponent(slug)}`
      )
        .then((res) => res.json())
        .then((data: { ok?: boolean; tags?: TagConteo[] }) => {
          const tags = data?.tags;
          if (data?.ok && Array.isArray(tags)) {
            setTagsBySector((prev) => ({ ...prev, [slug]: tags }));
          }
        })
        .finally(() => setLoadingSector(null));
    },
    [comuna, expandedSlugs, sectorConSubcategoriaActiva, tagsBySector]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 sm:p-4 space-y-1">
      {sectoresConCount.map((s) => {
        const isExpanded = expandedSlugs.has(s.slug);
        const isActive = sectorActivo === s.slug;
        const isEmpty = s.count === 0;
        const subcategorias = tagsBySector[s.slug];
        const loading = loadingSector === s.slug;

        return (
          <div key={s.slug} className="rounded-lg border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSector(s.slug)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isEmpty
                  ? "text-slate-500 opacity-70 hover:bg-slate-50"
                  : isActive
                    ? "bg-sky-50 text-sky-900 border-sky-200"
                    : "hover:bg-slate-50 text-slate-800"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block w-5 h-5 flex-shrink-0 flex items-center justify-center ${
                    isEmpty ? "text-slate-400" : "text-slate-500"
                  }`}
                  aria-hidden
                >
                  {isExpanded ? "−" : "+"}
                </span>
                <span className={isEmpty ? "text-slate-500" : ""}>{s.label}</span>
              </span>
              <span className={`tabular-nums ${isEmpty ? "text-slate-400" : "text-slate-500"}`}>
                ({s.count})
              </span>
            </button>
            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50/50 pl-8 pr-3 py-2 space-y-1">
                {loading ? (
                  <div className="text-sm text-slate-500 py-1">Cargando…</div>
                ) : subcategorias && subcategorias.length > 0 ? (
                  subcategorias.map((tag) => {
                    const isActive =
                      subcategoriaActiva &&
                      tag.tagSlug.toLowerCase() === subcategoriaActiva.toLowerCase();
                    const href = isActive
                      ? `/${encodeURIComponent(comuna)}`
                      : buildSubcategoriaUrl(tag.tagSlug);
                    return (
                      <Link
                        key={tag.tagSlug}
                        href={href}
                        className={`flex items-center gap-2 py-1.5 text-sm font-medium ${
                          isEmpty
                            ? "text-slate-500 hover:text-slate-700"
                            : isActive
                              ? "text-sky-700 font-semibold"
                              : "text-slate-700 hover:text-sky-700"
                        }`}
                      >
                        <span
                          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border border-slate-300 bg-white text-xs"
                          aria-hidden
                        >
                          {isActive ? "☑" : "☐"}
                        </span>
                        {tag.label} ({tag.count})
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500 py-1">
                    Sin subcategorías en esta comuna
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultsFade({
  resultKey,
  children,
}: {
  resultKey: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [resultKey]);

  return (
    <div
      key={resultKey}
      className={`transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

type BuscarClientProps = {
  comuna?: string;
  initialComuna?: string;
  initialComunaNombre?: string;
  initialSector?: string;
  initialSubcategoria?: string;
  /** UUID en public.subcategorias; filtro por emprendedor_subcategorías en /api/buscar */
  initialSubcategoriaId?: string | null;
  initialSubcategoriaNombre?: string | null;
};

export default function BuscarClient({
  comuna: comunaProp,
  initialComuna,
  initialComunaNombre,
  initialSector,
  initialSubcategoria,
  initialSubcategoriaId,
  initialSubcategoriaNombre,
}: BuscarClientProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  /** Texto libre solo desde ?q= (input del usuario / historial), nunca el slug del path. */
  const qFromSearchParams = q.trim();
  const comunaFromUrl = searchParams.get("comuna") ?? "";
  const comunaRaw = (comunaProp ?? initialComuna ?? comunaFromUrl).trim();
  const sector = (initialSector ?? searchParams.get("sector") ?? "").trim();
  const subcategoriaFromQuery = (searchParams.get("subcategoria") ?? "").trim();
  const tipo = searchParams.get("tipo_actividad") ?? "";

  const pathParts = useMemo(
    () => (pathname ?? "").split("/").filter(Boolean),
    [pathname]
  );
  /** Respaldo si algo fallara al hidratar props del server (evita lista completa sin filtro de rubro). */
  const subcategoriaFromPathname =
    initialComuna &&
    pathParts[0]?.toLowerCase() === String(initialComuna).trim().toLowerCase() &&
    pathParts.length >= 2
      ? decodeURIComponent(pathParts[1])
      : "";
  const pathSubcategoriaSlug = (
    initialSubcategoria ??
    subcategoriaFromPathname ??
    ""
  ).trim();
  const subcategoria = pathSubcategoriaSlug || subcategoriaFromQuery;

  /** Para /[comuna]/[subcategoria]: no enviar q si solo repite el slug (evita búsqueda por texto dominante). */
  let qForApi = qFromSearchParams;
  if (
    pathSubcategoriaSlug &&
    qForApi &&
    normalizeText(qForApi) === normalizeText(pathSubcategoriaSlug)
  ) {
    qForApi = "";
  }

  const qEfectiva =
    qFromSearchParams || pathSubcategoriaSlug || subcategoriaFromQuery || "";
  const hasBusquedaTextual =
    qFromSearchParams.length > 0 ||
    pathSubcategoriaSlug.length > 0 ||
    subcategoriaFromQuery.length > 0;

  const [resolvedComuna, setResolvedComuna] = useState<ComunaResolved | null>(null);

  const comuna = resolvedComuna?.slug || comunaRaw;

  const [qInput, setQInput] = useState(() => prettyQuery(q));
  const [comunaInput, setComunaInput] = useState(() =>
    comunaRaw ? prettyComunaSlug(comunaRaw) : ""
  );
  const [selectedComunaSlug, setSelectedComunaSlug] = useState<string | null>(() =>
    comunaRaw ? comunaRaw : null
  );
  const [openComuna, setOpenComuna] = useState(false);
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [showComunaPicker, setShowComunaPicker] = useState(false);
  const [openQuerySuggestions, setOpenQuerySuggestions] = useState(false);
  const [querySuggestions, setQuerySuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [highlightQueryIndex, setHighlightQueryIndex] = useState(-1);

  const queryBoxRef = useRef<HTMLDivElement>(null);
  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters =
    !!initialComuna ||
    qFromSearchParams.length > 0 ||
    comuna.trim().length > 0 ||
    sector.trim().length > 0 ||
    subcategoria.trim().length > 0 ||
    tipo.trim().length > 0;

  const comunaLabel = useMemo(() => {
    if (initialComunaNombre) return initialComunaNombre;
    if (resolvedComuna?.nombre) return resolvedComuna.nombre;
    if (!comuna) return "";
    return prettyComunaSlug(comuna);
  }, [comuna, initialComunaNombre, resolvedComuna]);

  useEffect(() => {
    setQInput(prettyQuery(q));
  }, [q]);

  useEffect(() => {
    if (showComunaPicker) return;
    setComunaInput(comunaLabel);
    setSelectedComunaSlug(comuna || null);
    setOpenComuna(false);
  }, [comuna, comunaLabel, showComunaPicker, resolvedComuna]);

  useEffect(() => {
    const raw = (comunaProp ?? initialComuna ?? comunaFromUrl).trim();

    if (!raw) {
      setResolvedComuna(null);
      return;
    }

    if (!/^\d+$/.test(raw)) {
      setResolvedComuna(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/suggest/comunas-by-id?id=${encodeURIComponent(raw)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;

        if (data?.ok && data.comuna) {
          setResolvedComuna(data.comuna);
          setSelectedComunaSlug(data.comuna.slug || raw);
        } else {
          setResolvedComuna(null);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedComuna(null);
      });

    return () => {
      cancelled = true;
    };
  }, [comunaProp, initialComuna, comunaFromUrl]);

  const sectorLabel = useMemo(() => {
    if (!sector) return "";
    return SECTORES.find((s) => s.slug === sector)?.label ?? sector;
  }, [sector]);

  const subcategoriaLabel = useMemo(() => {
    if (initialSubcategoriaNombre?.trim()) return initialSubcategoriaNombre.trim();
    if (!subcategoria) return "";
    return subcategoria
      .split("-")
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }, [initialSubcategoriaNombre, subcategoria]);

  const subcategoriaLabelPlural = useMemo(() => {
    const L = subcategoriaLabel.trim();
    if (!L) return "";
    const lower = L.toLowerCase();
    if (lower.endsWith("s") || lower.endsWith("x")) return L;
    return L + "s";
  }, [subcategoriaLabel]);

  const isComunaPage = comuna.trim().length > 0;
  const busquedaView = q.trim().length > 0;

  const [sectoresPorComuna, setSectoresPorComuna] = useState<SectorConteo[]>([]);
  const [loadingSectores, setLoadingSectores] = useState(false);
  const [serviciosTop, setServiciosTop] = useState<TagPorSector[]>([]);
  const [loadingServiciosTop, setLoadingServiciosTop] = useState(false);
  const [suggestedTerms, setSuggestedTerms] = useState<string[]>([]);
  const [tagsPorSector, setTagsPorSector] = useState<TagPorSector[]>([]);
  const [loadingTagsPorSector, setLoadingTagsPorSector] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("todos");
  const [tipoFicha, setTipoFicha] = useState<TipoFichaFiltro>("todas");

  const sectorActivo = sector.trim().length > 0;

  useEffect(() => {
    const term = qInput.trim();
    if (term.length < 2) {
      setQuerySuggestions([]);
      setOpenQuerySuggestions(false);
      return;
    }
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("q", term);
      params.set("limit", "8");
      if (selectedComunaSlug) params.set("comuna", selectedComunaSlug);
      const termNorm = term.toLowerCase().trim();
      const qFromUrlNorm = (q || "").toLowerCase().trim();
      const isSyncedFromUrl = termNorm === qFromUrlNorm;

      fetch(`/api/autocomplete?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; suggestions?: AutocompleteSuggestion[] }) => {
          if (data?.ok && Array.isArray(data.suggestions)) {
            setQuerySuggestions(data.suggestions);
            if (!isSyncedFromUrl) setOpenQuerySuggestions(true);
            setHighlightQueryIndex(-1);
          } else {
            setQuerySuggestions([]);
          }
        })
        .catch(() => setQuerySuggestions([]));
    }, 200);

    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, [qInput, selectedComunaSlug, q]);

  useEffect(() => {
    const term = comunaInput.trim();
    if (term.length < 2) {
      setComunaSuggestions([]);
      setOpenComuna(false);
      return;
    }

    const selectedLabel = selectedComunaSlug ? prettyComunaSlug(selectedComunaSlug) : "";
    const isShowingSelectedComuna =
      !!selectedComunaSlug && term.toLowerCase() === selectedLabel.toLowerCase();

    if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    comunaDebounceRef.current = setTimeout(() => {
      fetch(`/api/suggest/comunas?q=${encodeURIComponent(term)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; comunas?: ComunaSuggestion[] }) => {
          if (data?.ok && Array.isArray(data.comunas)) {
            setComunaSuggestions(data.comunas);
            if (!isShowingSelectedComuna) setOpenComuna(true);
          } else {
            setComunaSuggestions([]);
          }
        })
        .catch(() => setComunaSuggestions([]));
    }, 200);

    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [comunaInput, selectedComunaSlug]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Node;
      if (queryBoxRef.current && !queryBoxRef.current.contains(target)) {
        setOpenQuerySuggestions(false);
      }
      if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) {
        setOpenComuna(false);
        if (initialComuna && showComunaPicker) setShowComunaPicker(false);
      }
    },
    [initialComuna, showComunaPicker]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const runSearch = useCallback(() => {
    const parsed = parseSearchIntent(qInput.trim());
    const finalQ = parsed.finalQuery.trim();
    const comunaSlug =
      (parsed.comunaSlug || selectedComunaSlug || comuna.trim() || "").trim();
    const sectorSlug = (parsed.sectorSlug || sector.trim() || "").trim();

    if (comunaSlug && sectorSlug && finalQ) {
      const subcatSlug = finalQ.toLowerCase().replace(/\s+/g, "-");
      router.push(`/${encodeURIComponent(comunaSlug)}/${encodeURIComponent(subcatSlug)}`);
      return;
    }

    const params = new URLSearchParams();
    if (finalQ) params.set("q", finalQ);
    if (comunaSlug) params.set("comuna", comunaSlug);
    if (sectorSlug) params.set("sector", sectorSlug);
    if (tipo.trim()) params.set("tipo_actividad", tipo.trim());

    router.push(params.toString() ? `/buscar?${params.toString()}` : "/buscar");
  }, [qInput, selectedComunaSlug, comuna, sector, tipo, router]);

  useEffect(() => {
    if (!comuna.trim()) {
      setSectoresPorComuna([]);
      return;
    }
    let cancelled = false;
    setLoadingSectores(true);

    fetch(`/api/buscar/sectores-por-comuna?comuna=${encodeURIComponent(comuna.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setSectoresPorComuna(Array.isArray(data.sectors) ? data.sectors : []);
      })
      .catch(() => {
        if (!cancelled) setSectoresPorComuna([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSectores(false);
      });

    return () => {
      cancelled = true;
    };
  }, [comuna]);

  useEffect(() => {
    if (!comuna.trim()) {
      setServiciosTop([]);
      return;
    }
    let cancelled = false;
    setLoadingServiciosTop(true);

    fetch(`/api/buscar/tags-populares?comuna=${encodeURIComponent(comuna.trim())}&limit=8`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; tags?: TagPorSector[] }) => {
        if (cancelled || !data?.ok || !Array.isArray(data.tags)) return;
        setServiciosTop(data.tags);
      })
      .catch(() => {
        if (!cancelled) setServiciosTop([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingServiciosTop(false);
      });

    return () => {
      cancelled = true;
    };
  }, [comuna]);

  useEffect(() => {
    if (!sector.trim()) {
      setTagsPorSector([]);
      return;
    }
    let cancelled = false;
    setLoadingTagsPorSector(true);

    fetch(`/api/buscar/tags-por-sector?sector=${encodeURIComponent(sector.trim())}&limit=8`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; tags?: TagPorSector[] }) => {
        if (cancelled || !data?.ok || !Array.isArray(data.tags)) return;
        setTagsPorSector(data.tags);
      })
      .catch(() => {
        if (!cancelled) setTagsPorSector([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTagsPorSector(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sector]);

  useEffect(() => {
    if (!q.trim()) setSuggestedTerms([]);
  }, [q]);

  const headerTitle = useMemo(() => {
    const busqueda = qEfectiva.trim();
    if (busqueda && comunaLabel) return `Buscando ${busqueda} en ${comunaLabel}`;
    if (comunaLabel) return `Buscando en ${comunaLabel}`;
    if (busqueda) return `Buscando ${busqueda}`;
    return "Buscar";
  }, [qEfectiva, comunaLabel]);

  const buildChipUrl = (chipQ: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", chipQ.trim());
    return `/buscar?${params.toString()}`;
  };

  const buildSectorUrl = (sectorSlug: string) => {
    if (initialComuna && comuna) {
      return `/${encodeURIComponent(comuna)}/${encodeURIComponent(sectorSlug)}`;
    }
    const params = new URLSearchParams();
    if (comuna) params.set("comuna", comuna);
    if (sectorSlug) params.set("sector", sectorSlug);
    return `/buscar?${params.toString()}`;
  };

  const buildSubcategoriaUrl = (subcategoriaSlug: string) => {
    if (!comuna) return "/buscar";
    return `/${encodeURIComponent(comuna)}/${encodeURIComponent(subcategoriaSlug)}`;
  };

  const resolveSuggestionUrl = useCallback(
    (suggestion: AutocompleteSuggestion): string => {
      if (suggestion.type === "intent" && comuna) {
        return `/${encodeURIComponent(comuna)}/${encodeURIComponent(suggestion.value)}`;
      }
      if (suggestion.type === "intent_comuna") {
        return `/${encodeURIComponent(suggestion.comuna)}/${encodeURIComponent(suggestion.value)}`;
      }
      return suggestion.url;
    },
    [comuna]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      setOpenQuerySuggestions(false);
      setHighlightQueryIndex(-1);

      if (!initialComuna && suggestion.type === "intent_comuna") {
        const fullLabel = suggestion.label || "";
        const lower = fullLabel.toLowerCase();
        const idx = lower.lastIndexOf(" en ");
        const servicio = idx > 0 ? fullLabel.slice(0, idx) : fullLabel;
        const nextQ = servicio.trim();

        const params = new URLSearchParams();
        if (nextQ) params.set("q", nextQ);
        if (suggestion.comuna) params.set("comuna", suggestion.comuna);

        setQInput(nextQ);
        router.push(`/buscar?${params.toString()}`);
        return;
      }

      router.push(resolveSuggestionUrl(suggestion));
    },
    [initialComuna, resolveSuggestionUrl, router]
  );

  const sectoresConCount = useMemo(() => {
    const bySlug = new Map(sectoresPorComuna.map((s) => [s.slug, s.count]));
    return SECTORES.map((s) => ({
      slug: s.slug,
      label: s.label,
      count: bySlug.get(s.slug) ?? 0,
    })).sort((a, b) => {
      const aHas = a.count > 0;
      const bHas = b.count > 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "es");
    });
  }, [sectoresPorComuna]);

  const pageViewType = initialComuna ? "page_view_comuna" : "page_view_search";
  const comunaSlugForTrack = initialComuna || (comuna.trim() || null);

  return (
    <main className="min-h-screen bg-slate-50">
      <TrackPageView
        eventType={pageViewType}
        comuna_slug={comunaSlugForTrack || null}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <header className="mb-2 sm:mb-3">
          <nav className="flex items-center gap-2 text-sm text-slate-600 mb-2" aria-label="Breadcrumb">
            <a href="/" className="font-medium text-sky-700 hover:text-sky-800">
              Inicio
            </a>

            {hasFilters && comuna ? (
              <>
                <span aria-hidden>/</span>
                <a
                  href={`/${encodeURIComponent(comuna)}`}
                  className="font-medium text-sky-700 hover:text-sky-800"
                >
                  {comunaLabel}
                </a>

                {subcategoria ? (
                  <>
                    <span aria-hidden>/</span>
                    <span className="font-semibold text-slate-900">
                      {subcategoriaLabel || subcategoria}
                    </span>
                  </>
                ) : sector ? (
                  <>
                    <span aria-hidden>/</span>
                    <span className="font-semibold text-slate-900">
                      {sectorLabel || sector}
                    </span>
                  </>
                ) : null}
              </>
            ) : hasFilters ? (
              <>
                <span aria-hidden>/</span>
                <span className="font-semibold text-slate-900">Resultados</span>
              </>
            ) : (
              <>
                <span aria-hidden>/</span>
                <span className="font-semibold text-slate-900">Buscar</span>
              </>
            )}
          </nav>

          <div className="mt-1 mb-2">
            <a
              href="/"
              className="inline-flex items-center text-xs font-semibold text-sky-700 hover:text-sky-800"
            >
              ← Volver al inicio
            </a>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {headerTitle}
          </h1>
        </header>

        {!hasFilters ? (
          <section className="mt-10 flex justify-center">
            <div className="max-w-xl w-full rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Comienza desde el buscador principal
              </h2>
              <p className="text-sm text-slate-600 mb-5">
                Elige una comuna para explorar emprendimientos o escribe lo que buscas en el buscador de la página de inicio.
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Volver al inicio
              </a>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <form
              className={`rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 sm:px-6 sm:py-5 shadow-sm ${
                initialComuna ? "space-y-5" : "flex flex-wrap gap-4 items-end"
              }`}
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
            >
              {initialComuna ? (
                <>
                  <div className="space-y-2">
                    {subcategoriaLabelPlural && comunaLabel ? (
                      <p className="text-lg sm:text-xl font-bold text-slate-900" aria-hidden>
                        {subcategoriaLabelPlural} en {comunaLabel}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                        Buscando en
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <span className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2" aria-hidden>
                        <span>📍</span>
                        {comunaLabel || comuna}
                      </span>

                      {!showComunaPicker ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowComunaPicker(true);
                            setComunaInput("");
                            setOpenComuna(false);
                          }}
                          className="text-sm font-medium text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          Cambiar comuna
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {showComunaPicker ? (
                    <div ref={comunaBoxRef} className="relative">
                      <label className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1 block">
                        Elegir otra comuna
                      </label>
                      <input
                        type="text"
                        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400 w-full max-w-xs"
                        placeholder="Buscar comuna…"
                        value={comunaInput}
                        onChange={(e) => setComunaInput(e.target.value)}
                        onFocus={() => comunaSuggestions.length > 0 && setOpenComuna(true)}
                      />
                      {openComuna && comunaSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg max-h-56 overflow-auto max-w-xs">
                          {comunaSuggestions.map((c) => (
                            <button
                              key={c.slug}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const short = getRegionShort(c.region_nombre);
                                setComunaInput(short ? `${c.nombre} — ${short}` : c.nombre);
                                setSelectedComunaSlug(c.slug);
                                setOpenComuna(false);
                                setShowComunaPicker(false);
                                router.push(`/${encodeURIComponent(c.slug)}`);
                              }}
                            >
                              {getRegionShort(c.region_nombre)
                                ? `${c.nombre} — ${getRegionShort(c.region_nombre)}`
                                : c.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <div ref={comunaBoxRef} className="flex flex-col min-w-[140px] sm:min-w-[180px] relative">
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1">
                    Comuna
                  </label>
                  <input
                    type="text"
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
                    placeholder="Ej: Maipú, Talagante…"
                    value={comunaInput}
                    onChange={(e) => setComunaInput(e.target.value)}
                    onFocus={() => {
                      const yaEsLaSeleccionada =
                        selectedComunaSlug &&
                        comunaInput.trim() &&
                        comunaLabel &&
                        comunaInput.trim().toLowerCase() === comunaLabel.toLowerCase();
                      if (yaEsLaSeleccionada) return;
                      if (comunaSuggestions.length > 0) setOpenComuna(true);
                    }}
                  />
                  {openComuna && comunaSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg max-h-56 overflow-auto">
                      {comunaSuggestions.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const short = getRegionShort(c.region_nombre);
                            setComunaInput(short ? `${c.nombre} — ${short}` : c.nombre);
                            setSelectedComunaSlug(c.slug);
                            setOpenComuna(false);
                          }}
                        >
                          {getRegionShort(c.region_nombre)
                            ? `${c.nombre} — ${getRegionShort(c.region_nombre)}`
                            : c.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex flex-col flex-1 min-w-0 ${!initialComuna ? "min-w-[160px] relative" : ""}`}>
                <label className="text-sm font-medium text-slate-700 mb-1">
                  {comunaLabel
                    ? `¿Qué necesitas en ${comunaLabel}?`
                    : "¿Qué necesitas?"}
                </label>
                <div className={`flex flex-1 min-w-0 ${initialComuna ? "gap-2 items-end" : ""}`}>
                  <div ref={queryBoxRef} className="flex flex-col flex-1 min-w-0 relative">
                    <input
                      type="text"
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
                      placeholder="¿Qué necesitas? Ej: gasfiter, carnicería, comida..."
                      value={qInput}
                      onChange={(e) => {
                        setQInput(e.target.value);
                        setOpenQuerySuggestions(true);
                      }}
                      onFocus={() => querySuggestions.length > 0 && setOpenQuerySuggestions(true)}
                      onKeyDown={(e) => {
                        if (!openQuerySuggestions || querySuggestions.length === 0) {
                          if (e.key === "Enter") runSearch();
                          return;
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightQueryIndex((i) =>
                            i < querySuggestions.length - 1 ? i + 1 : 0
                          );
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightQueryIndex((i) =>
                            i > 0 ? i - 1 : querySuggestions.length - 1
                          );
                          return;
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            highlightQueryIndex >= 0 &&
                            highlightQueryIndex < querySuggestions.length
                          ) {
                            handleSuggestionSelect(querySuggestions[highlightQueryIndex]);
                          } else {
                            runSearch();
                          }
                          return;
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setOpenQuerySuggestions(false);
                          setHighlightQueryIndex(-1);
                        }
                      }}
                    />
                    <SearchAutocompleteDropdown
                      suggestions={querySuggestions}
                      open={openQuerySuggestions && querySuggestions.length > 0}
                      highlightIndex={highlightQueryIndex}
                      onSelect={(suggestion) => {
                        handleSuggestionSelect(suggestion);
                      }}
                      onClose={() => {
                        setOpenQuerySuggestions(false);
                        setHighlightQueryIndex(-1);
                      }}
                      onHighlightChange={setHighlightQueryIndex}
                      containerRef={queryBoxRef}
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 shrink-0"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </form>

            {comuna && !hasBusquedaTextual && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-700">
                  {comunaLabel
                    ? `Servicios más buscados en ${comunaLabel}`
                    : "Servicios más buscados en esta comuna"}
                </h2>
                {loadingServiciosTop ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-9 w-24 rounded-full bg-slate-200 animate-pulse"
                      />
                    ))}
                  </div>
                ) : serviciosTop.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {serviciosTop.slice(0, 8).map((t) => (
                      <Link
                        key={t.tagSlug}
                        href={buildSubcategoriaUrl(t.tagSlug)}
                        className="rounded-full px-3 py-1.5 text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-800 border border-slate-200 transition-colors"
                      >
                        {t.tag}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            )}

            {comuna ? (
              hasBusquedaTextual ? (
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center sm:gap-4">
                    <ComunaQuickFilters active={quickFilter} onSelect={setQuickFilter} />
                    <TipoFichaSelect value={tipoFicha} onChange={setTipoFicha} />
                  </div>

                  <PublicSearchResults
                    comuna={comuna}
                    q={qForApi}
                    subcategoriaSlug={subcategoria || undefined}
                    subcategoriaId={initialSubcategoriaId ?? undefined}
                  />
                </section>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                  <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-24 order-2 lg:order-1">
                    <section className="space-y-2">
                      <h2 className="text-sm font-semibold text-slate-700">
                        Categorías en esta comuna
                      </h2>
                      {loadingSectores ? (
                        <div className="flex gap-2 flex-wrap">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="h-10 w-full max-w-xs rounded-lg bg-slate-200 animate-pulse"
                            />
                          ))}
                        </div>
                      ) : (
                        <CategoriasExpandiblesComuna
                          comuna={comuna}
                          sectoresConCount={sectoresConCount}
                          sectorActivo={sector}
                          subcategoriaActiva={subcategoria || undefined}
                          buildSubcategoriaUrl={buildSubcategoriaUrl}
                        />
                      )}
                    </section>
                  </aside>

                  <div className="flex-1 min-w-0 w-full order-1 lg:order-2">
                    <ResultsFade resultKey={subcategoria || "all"}>
                      <div className="space-y-4">
                        {(comuna || subcategoria) && (
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Filtros activos
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {comuna && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                                  Comuna: <span className="font-medium">{comunaLabel || comuna}</span>
                                </span>
                              )}
                              {subcategoria && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-800 border border-sky-200">
                                  Subcategoría: <span className="font-medium">{subcategoriaLabel || subcategoria}</span>
                                  <Link
                                    href={`/${encodeURIComponent(comuna)}`}
                                    className="ml-0.5 rounded-full p-0.5 hover:bg-sky-200/70 text-sky-700 focus:outline-none"
                                    title="Quitar filtro de subcategoría"
                                    aria-label="Quitar filtro de subcategoría"
                                  >
                                    <span aria-hidden>×</span>
                                  </Link>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center sm:gap-4">
                          <ComunaQuickFilters active={quickFilter} onSelect={setQuickFilter} />
                          <TipoFichaSelect value={tipoFicha} onChange={setTipoFicha} />
                        </div>

                        <PublicSearchResults
                          comuna={comuna}
                          q={qForApi}
                          subcategoriaSlug={subcategoria || undefined}
                          subcategoriaId={initialSubcategoriaId ?? undefined}
                        />
                      </div>
                    </ResultsFade>
                  </div>
                </div>
              )
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center sm:gap-4 mb-2">
                  <ComunaQuickFilters active={quickFilter} onSelect={setQuickFilter} />
                  <TipoFichaSelect value={tipoFicha} onChange={setTipoFicha} />
                </div>
                <PublicSearchResults
                  comuna={comuna}
                  q={qForApi}
                  subcategoriaSlug={subcategoria || undefined}
                  subcategoriaId={initialSubcategoriaId ?? undefined}
                />

                {busquedaView && suggestedTerms.length > 0 && (
                  <section className="space-y-2 pt-2">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Quizás buscabas
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTerms.slice(0, 6).map((term) => (
                        <Link
                          key={term}
                          href={buildChipUrl(term)}
                          className="rounded-full px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-800 border border-slate-200 transition-colors"
                        >
                          {term}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}