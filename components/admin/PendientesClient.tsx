"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostulacionModeracionItem } from "@/lib/loadPostulacionesModeracion";
import { readKeywordsUsuarioFromPostulacionRow } from "@/lib/keywordsUsuarioPostulacion";
import { formatDateSafe } from "@/lib/formatDateTimeEsCL";
import { etiquetaModalidadAtencion } from "@/lib/modalidadesAtencion";
import ModeracionFichaPreview from "@/components/admin/ModeracionFichaPreview";
import { expandGaleriaUrlList } from "@/lib/galeriaUrlsEmprendedor";
import { parseLocalesPatchInput } from "@/lib/emprendedorLocalesDb";

const MAX_KEYWORDS_MODERACION = 40;

function s(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * Si no hay keywords en postulación (`keywords_usuario` text[]), sugerencia débil por `descripcion_libre`.
 */
function keywordsFallbackDesdeDescripcionLibre(raw: string): string[] {
  const t = s(raw);
  if (!t) return [];
  const parts = t
    .split(/[,;\n]+/)
    .map((x) => s(x))
    .filter((x) => x.length >= 2 && x.length <= 48);
  return [...new Set(parts)].slice(0, MAX_KEYWORDS_MODERACION);
}

function mergeKeywordsPreviewModeracion(item: PostulacionModeracionItem): string[] {
  const fromRow = readKeywordsUsuarioFromPostulacionRow(item as unknown as Record<string, unknown>);
  if (fromRow.length) {
    return [...new Set(fromRow)].slice(0, MAX_KEYWORDS_MODERACION);
  }
  return keywordsFallbackDesdeDescripcionLibre(s(item.descripcion_libre));
}

function textoLocalesModeracion(item: PostulacionModeracionItem): string | null {
  const parsed = parseLocalesPatchInput(item.locales);
  if (parsed === null) return null;
  if (parsed.length === 0) return null;
  return parsed
    .map((loc, idx) => {
      const principal = loc.es_principal ? " (principal)" : "";
      const ref = loc.referencia?.trim() ? ` · ${loc.referencia.trim()}` : "";
      return `${idx + 1}. ${loc.comuna_slug}${principal}: ${loc.direccion}${ref}`;
    })
    .join("\n");
}

function galeriaUrlsModeracion(item: PostulacionModeracionItem): string[] {
  return expandGaleriaUrlList(item.galeria_urls);
}

/** Sitio web en postulaciones: columna canónica `sitio_web` (no existe `web` en muchas BDs). */
function sitioWebModeracion(item: PostulacionModeracionItem): string {
  return s(item.sitio_web);
}

function truncatePreview(text: string, max: number): string {
  const t = s(text);
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Texto corto para subtítulo/búsqueda: no hay `descripcion_corta` en postulaciones →
 * `frase_negocio` o extracto de `descripcion_libre`.
 */
function textoCortoPostulacion(item: PostulacionModeracionItem): string {
  const direct = s(item.descripcion_corta) || s(item.frase_negocio);
  if (direct) return direct;
  return truncatePreview(s(item.descripcion_libre), 200);
}

export type EstadoPostulacionFiltro =
  | "todos"
  | "borrador"
  | "pendiente_revision"
  | "aprobada"
  | "rechazada";

type CategoriaMod = { id: string; nombre: string; slug: string };
type SubcategoriaMod = {
  id: string;
  nombre: string;
  slug: string;
  categoria_id: string;
};

type TaxonomiaMod = {
  categorias: CategoriaMod[];
  subcategorias: SubcategoriaMod[];
};

type ClasificacionRow = { categoriaId: string; subIds: string[] };

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!s(text)) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { raw: parsed };
  } catch {
    return { parseError: true, rawBody: text.slice(0, 2000) };
  }
}

/** Prioridad: error → message → details (string u objeto) → hint → code → fallback */
function formatApiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const pick = (v: unknown) => (v == null ? "" : String(v).trim());
  const err = pick(data.error);
  const msg = pick(data.message);
  const d = data.details;
  const det =
    typeof d === "string"
      ? pick(d)
      : d != null
        ? (() => {
            try {
              return JSON.stringify(d);
            } catch {
              return pick(d);
            }
          })()
        : "";
  let out = err || msg || det || pick(data.hint) || pick(data.code) || fallback;
  const blob = `${err} ${msg} ${det}`.toLowerCase();
  const pickCode = pick(data.code);
  const schemaCacheIssue =
    pickCode === "PGRST204" ||
    (blob.includes("schema cache") &&
      (blob.includes("column") || blob.includes("table")));

  if (schemaCacheIssue) {
    if (blob.includes("categoria_slug_final") || blob.includes("subcategoria_slug_final")) {
      out +=
        " Aplica `supabase/migrations/20260420000000_emprendedores_campos_finales.sql` (p. ej. `supabase db push`).";
    } else if (blob.includes("classification_status")) {
      out +=
        " La tabla `emprendedores` necesita la columna `classification_status` (migraciones de clasificación, p. ej. `20260326000000_motor_clasificacion_ia_completo.sql` / `20260327000000_estados_clasificacion_publicacion_definitivo.sql`). Sincroniza migraciones con Supabase.";
    } else if (
      blob.includes("emprendedor_comunas_cobertura") ||
      blob.includes("emprendedor_regiones_cobertura") ||
      blob.includes("emprendedor_modalidades") ||
      blob.includes("emprendedor_galeria")
    ) {
      out +=
        " Ejecuta en Supabase el SQL de `supabase/migrations/20260322100000_emprendedor_relaciones_cobertura_modalidades_galeria.sql` (tablas pivote de cobertura, modalidades y galería). Luego recarga el esquema de la API si hace falta.";
    } else {
      out +=
        " El esquema de Supabase parece desactualizado respecto al código: ejecuta las migraciones pendientes (`supabase db push` o SQL del repo en `supabase/migrations/`).";
    }
  }
  return out;
}

/** Next/Turbopack a veces muestra `{}` en el overlay si el 2.º arg es un objeto profundo. */
function logAdminJson(label: string, payload: Record<string, unknown>) {
  try {
    console.error(`${label} ${JSON.stringify(payload)}`);
  } catch {
    console.error(label, payload);
  }
}

function sanitizeClasificacion(
  row: ClasificacionRow,
  taxonomia: TaxonomiaMod
): ClasificacionRow {
  const catId = s(row.categoriaId);
  if (!catId) {
    return { categoriaId: "", subIds: [] };
  }
  const allowed = new Set(
    taxonomia.subcategorias
      .filter((sc) => s(sc.categoria_id) === catId)
      .map((sc) => s(sc.id))
  );
  return {
    categoriaId: catId,
    subIds: row.subIds.map((x) => s(x)).filter((id) => allowed.has(id)),
  };
}

/**
 * Para `edicion_publicado`, si el moderador no tocó la taxonomía, se toma la clasificación
 * vigente en la ficha publicada (cargada en `clasificacion_publicada`).
 */
function effectiveClasificacionRow(
  item: PostulacionModeracionItem,
  row: ClasificacionRow,
  taxonomia: TaxonomiaMod
): ClasificacionRow {
  let cat = s(row.categoriaId);
  let subs = row.subIds.map((x) => s(x)).filter(Boolean);
  const pub = item.clasificacion_publicada;
  if (s(item.tipo_postulacion) === "edicion_publicado" && pub && s(pub.categoria_id)) {
    if (!cat) cat = s(pub.categoria_id);
    if (subs.length === 0) {
      subs = (pub.subcategorias_ids ?? []).map((x) => s(x)).filter(Boolean);
    }
  }
  return sanitizeClasificacion({ categoriaId: cat, subIds: subs }, taxonomia);
}

function clasificacionPermiteAprobar(
  row: ClasificacionRow | undefined,
  taxonomia: TaxonomiaMod | null,
  item?: PostulacionModeracionItem
): boolean {
  if (!taxonomia || !row) return false;
  const eff = item
    ? effectiveClasificacionRow(item, row, taxonomia)
    : sanitizeClasificacion(row, taxonomia);
  const catId = s(eff.categoriaId);
  const subIds = eff.subIds.map((x) => s(x)).filter(Boolean);
  if (!catId || subIds.length === 0) return false;
  const allowed = new Set(
    taxonomia.subcategorias
      .filter((sc) => s(sc.categoria_id) === catId)
      .map((sc) => s(sc.id))
  );
  return subIds.every((id) => allowed.has(id));
}

function formatCoberturaPostulacion(item: PostulacionModeracionItem) {
  const t = s(item.cobertura_tipo).toLowerCase();
  const comunaNombre = item.comuna?.nombre ?? null;
  const comunas = item.comunas_cobertura ?? [];
  const regiones = item.regiones_cobertura ?? [];

  if (t === "solo_comuna" || t === "solo_mi_comuna" || t === "comuna") {
    return comunaNombre
      ? `Solo comuna base (${comunaNombre})`
      : "Solo comuna base";
  }
  if (t === "varias_comunas") {
    if (comunas.length) return `Varias comunas: ${comunas.join(" · ")}`;
    return "Varias comunas";
  }
  if (t === "varias_regiones" || t === "regional") {
    if (regiones.length) return `Regiones: ${regiones.join(" · ")}`;
    return "Una o más regiones";
  }
  if (t === "nacional") return "Todo Chile";
  return s(item.cobertura_tipo) || "No informada";
}

/** Stopwords mínimas para sugerencias de keywords (solo moderación, sin IA). */
const STOPWORDS_KEYWORDS_MOD = new Set(
  [
    "que",
    "los",
    "las",
    "una",
    "uno",
    "por",
    "para",
    "con",
    "como",
    "más",
    "mas",
    "pero",
    "del",
    "les",
    "sus",
    "todo",
    "todos",
    "toda",
    "todas",
    "este",
    "esta",
    "estos",
    "estas",
    "ese",
    "esa",
    "son",
    "ser",
    "hay",
    "muy",
    "solo",
    "sólo",
    "cada",
    "sobre",
    "entre",
    "desde",
    "hasta",
    "han",
    "tiene",
    "tienen",
    "algo",
    "años",
    "año",
    "días",
    "día",
    "vez",
    "bien",
    "aquí",
    "aqui",
    "cuando",
    "donde",
    "dónde",
    "quien",
    "quién",
    "cual",
    "cuál",
    "mismo",
    "misma",
    "tan",
    "ya",
    "fue",
    "puede",
    "pueden",
    "hacer",
    "hace",
    "tipo",
    "mismo",
    "nuestro",
    "nuestra",
    "the",
    "and",
    "with",
  ].map((w) => w.toLowerCase())
);

function normalizarTokenKeyword(raw: string): string {
  return s(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Tokens candidatos desde nombre + texto corto + descripción larga (sin llamadas API).
 */
function sugerenciasKeywordsAutomaticas(
  item: PostulacionModeracionItem,
  yaElegidas: string[]
): string[] {
  const excl = new Set(yaElegidas.map((x) => normalizarTokenKeyword(x)).filter(Boolean));
  const blob = [
    s(item.nombre_emprendimiento),
    textoCortoPostulacion(item),
    s(item.descripcion_libre),
  ]
    .filter(Boolean)
    .join(" ");

  const matches = blob.match(/[a-záéíóúñ0-9]{3,}/gi) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const key = normalizarTokenKeyword(m);
    if (key.length < 3 || key.length > 32) continue;
    if (STOPWORDS_KEYWORDS_MOD.has(key)) continue;
    if (excl.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m.length <= 32 ? m.toLowerCase() : m.slice(0, 32).toLowerCase());
    if (out.length >= 18) break;
  }
  return out;
}

type CalidadModeracionDetalle = {
  nivel: "Alta" | "Media" | "Baja";
  recomendacion: string;
};

function detalleCalidadModeracion(
  item: PostulacionModeracionItem,
  kwList: string[]
): CalidadModeracionDetalle {
  const main = s(item.foto_principal_url);
  const gal = (item.galeria_urls ?? []).filter((u) => s(u) !== "").length;
  const fotoOk = Boolean(main) || gal > 0;
  const frase = s(item.frase_negocio);
  const libre = s(item.descripcion_libre);
  const descOk = frase.length >= 20 || libre.length >= 40;
  const kwOk = kwList.length > 0;
  const extraOk =
    Boolean(s(item.instagram)) ||
    Boolean(s(item.sitio_web)) ||
    Boolean(s(item.email));
  let n = 0;
  if (fotoOk) n++;
  if (descOk) n++;
  if (kwOk) n++;
  if (extraOk) n++;
  const nivel: "Alta" | "Media" | "Baja" =
    n >= 3 ? "Alta" : n === 2 ? "Media" : "Baja";

  const mejoras: string[] = [];
  if (!fotoOk) {
    mejoras.push(
      "agregar fotos para mejorar confianza y visibilidad en el directorio (no bloquea aprobar)"
    );
  }
  if (!descOk) {
    mejoras.push("ampliar la descripción (frase del negocio o texto largo)");
  }
  if (!kwOk) {
    mejoras.push("agregar palabras que la gente usaría en el buscador");
  }
  if (!extraOk) {
    mejoras.push("sumar Instagram, sitio web o email además del WhatsApp");
  }

  let recomendacion: string;
  if (nivel === "Alta") {
    recomendacion =
      "Perfil sólido en contenido básico. Revisá duplicados y clasificación antes de aprobar.";
  } else if (mejoras.length) {
    const top = mejoras.slice(0, 2);
    recomendacion = `Recomendación: ${top.join("; ")}${mejoras.length > 2 ? "…" : "."}`;
  } else {
    recomendacion = "Revisá cobertura, keywords y clasificación antes de confirmar.";
  }

  return { nivel, recomendacion };
}

type RechazoMotivoPreset = "falta_info" | "fotos" | "no_corresponde" | "otro";

function motivoRechazoDesdeModal(
  preset: RechazoMotivoPreset,
  otroTexto: string
): string | null {
  switch (preset) {
    case "falta_info":
      return "Falta información";
    case "fotos":
      return "Fotos no válidas o insuficientes";
    case "no_corresponde":
      return "No corresponde al directorio";
    case "otro": {
      const t = s(otroTexto);
      return t || null;
    }
  }
}

export default function PendientesClient({
  initialPostulaciones,
  initialEstadoFilter,
}: {
  initialPostulaciones: PostulacionModeracionItem[];
  initialEstadoFilter: EstadoPostulacionFiltro;
}) {
  const router = useRouter();
  const [items, setItems] = useState<PostulacionModeracionItem[]>(
    initialPostulaciones || []
  );
  const [taxonomia, setTaxonomia] = useState<TaxonomiaMod | null>(null);
  const [taxonomiaLoading, setTaxonomiaLoading] = useState(true);
  const [taxonomiaError, setTaxonomiaError] = useState("");
  const [clasificacion, setClasificacion] = useState<
    Record<string, ClasificacionRow>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [estadoFilter, setEstadoFilter] =
    useState<EstadoPostulacionFiltro>(initialEstadoFilter);
  const [search, setSearch] = useState<string>("");
  const [dupPanelOpen, setDupPanelOpen] = useState<Record<string, boolean>>({});
  const [keywordsEdit, setKeywordsEdit] = useState<Record<string, string[]>>({});
  const [approveModalPostId, setApproveModalPostId] = useState<string | null>(
    null
  );
  const [rejectModalPostId, setRejectModalPostId] = useState<string | null>(
    null
  );
  const [rejectMotivoPreset, setRejectMotivoPreset] =
    useState<RechazoMotivoPreset>("falta_info");
  const [rejectOtroTexto, setRejectOtroTexto] = useState("");
  const [ultimaFichaAprobadaSlug, setUltimaFichaAprobadaSlug] = useState<
    string | null
  >(null);
  const [keywordDraft, setKeywordDraft] = useState<Record<string, string>>({});
  const skipFirstFetch = useRef(true);

  const toggleDupPanel = useCallback((postId: string) => {
    setDupPanelOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTaxonomiaLoading(true);
      setTaxonomiaError("");
      try {
        const res = await fetch("/api/admin/taxonomia-moderacion");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setTaxonomiaError(
            s(data?.message) || s(data?.error) || "No se cargó la taxonomía."
          );
          setTaxonomia(null);
          return;
        }
        setTaxonomia({
          categorias: Array.isArray(data.categorias) ? data.categorias : [],
          subcategorias: Array.isArray(data.subcategorias)
            ? data.subcategorias
            : [],
        });
      } catch {
        if (!cancelled) {
          setTaxonomiaError("Error de red al cargar categorías.");
          setTaxonomia(null);
        }
      } finally {
        if (!cancelled) setTaxonomiaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setClasificacion((prev) => {
      const next: Record<string, ClasificacionRow> = {};
      for (const it of items) {
        const existing = prev[it.id];
        if (existing) {
          next[it.id] = existing;
        } else {
          const pub = it.clasificacion_publicada;
          const hasPostTax =
            Boolean(s(it.categoria_id)) ||
            (Array.isArray(it.subcategorias_ids) && it.subcategorias_ids.length > 0);
          if (
            s(it.tipo_postulacion) === "edicion_publicado" &&
            pub &&
            s(pub.categoria_id) &&
            (pub.subcategorias_ids?.length ?? 0) > 0 &&
            !hasPostTax
          ) {
            next[it.id] = {
              categoriaId: s(pub.categoria_id),
              subIds: [...(pub.subcategorias_ids ?? [])],
            };
          } else {
            next[it.id] = {
              categoriaId: s(it.categoria_id),
              subIds: [...(it.subcategorias_ids ?? [])],
            };
          }
        }
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!taxonomia) return;
    setClasificacion((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = sanitizeClasificacion(next[key], taxonomia);
      }
      return next;
    });
  }, [taxonomia]);

  useEffect(() => {
    setKeywordsEdit((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (next[it.id] === undefined) {
          next[it.id] = mergeKeywordsPreviewModeracion(it);
        }
      }
      for (const k of Object.keys(next)) {
        if (!items.some((i) => i.id === k)) {
          delete next[k];
        }
      }
      return next;
    });
  }, [items]);

  const addKeywordsToPost = useCallback((postId: string, raw: string) => {
    const parts = raw
      .split(/[,;\n]+/)
      .map((x) => s(x))
      .filter(Boolean);
    if (!parts.length) return;
    setKeywordsEdit((prev) => {
      const cur = [...(prev[postId] ?? [])];
      const seen = new Set(cur.map((x) => s(x)));
      for (const w of parts) {
        if (cur.length >= MAX_KEYWORDS_MODERACION) break;
        if (!seen.has(w)) {
          seen.add(w);
          cur.push(w);
        }
      }
      return { ...prev, [postId]: cur };
    });
    setKeywordDraft((d) => ({ ...d, [postId]: "" }));
  }, []);

  const removeKeywordAt = useCallback((postId: string, index: number) => {
    setKeywordsEdit((prev) => {
      const cur = [...(prev[postId] ?? [])];
      cur.splice(index, 1);
      return { ...prev, [postId]: cur };
    });
  }, []);

  const appendKeywordSuggestion = useCallback((postId: string, word: string) => {
    const w = s(word);
    if (!w) return;
    setKeywordsEdit((prev) => {
      const cur = [...(prev[postId] ?? [])];
      if (cur.length >= MAX_KEYWORDS_MODERACION) return prev;
      const lower = new Set(cur.map((x) => normalizarTokenKeyword(x)));
      if (lower.has(normalizarTokenKeyword(w))) return prev;
      return { ...prev, [postId]: [...cur, w] };
    });
  }, []);

  const setCategoriaPostulacion = useCallback(
    (postId: string, nuevaCategoriaId: string) => {
      setClasificacion((prev) => {
        const cur = prev[postId] ?? { categoriaId: "", subIds: [] };
        const catId = s(nuevaCategoriaId);
        if (!taxonomia) {
          return { ...prev, [postId]: { categoriaId: catId, subIds: [] } };
        }
        const allowed = new Set(
          taxonomia.subcategorias
            .filter((sc) => s(sc.categoria_id) === catId)
            .map((sc) => s(sc.id))
        );
        const subIds = cur.subIds.filter((id) => allowed.has(s(id)));
        return { ...prev, [postId]: { categoriaId: catId, subIds } };
      });
    },
    [taxonomia]
  );

  const toggleSubcategoria = useCallback((postId: string, subId: string) => {
    setClasificacion((prev) => {
      const cur = prev[postId] ?? { categoriaId: "", subIds: [] };
      const sid = s(subId);
      const has = cur.subIds.map((x) => s(x)).includes(sid);
      const subIds = has
        ? cur.subIds.filter((x) => s(x) !== sid)
        : [...cur.subIds.map((x) => s(x)), sid];
      return { ...prev, [postId]: { ...cur, subIds } };
    });
  }, []);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }

    let cancelled = false;
    (async () => {
      setListLoading(true);
      setMessage("");
      try {
        const res = await fetch(
          `/api/admin/postulaciones?estado=${encodeURIComponent(estadoFilter)}`,
          { cache: "no-store" }
        );
        const data = await parseJsonResponse(res);
        if (cancelled) return;
        if (!res.ok || data.ok === false) {
          setMessage(
            formatApiErrorMessage(
              data,
              "No se pudo cargar la lista."
            )
          );
          return;
        }
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setMessage("Error de red al cargar postulaciones.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [estadoFilter]);

  const filtered = useMemo(() => {
    const term = s(search).toLowerCase();
    return items.filter((item) => {
      if (!term) return true;
      const nombre = s(item.nombre_emprendimiento).toLowerCase();
      const comuna = s(item.comuna?.nombre).toLowerCase();
      const email = s(item.email).toLowerCase();
      const wa = s(item.whatsapp_principal).toLowerCase();
      const corto = textoCortoPostulacion(item).toLowerCase();
      const dl = s(item.descripcion_libre).toLowerCase();
      const kws = (keywordsEdit[item.id] ?? mergeKeywordsPreviewModeracion(item))
        .join(" ")
        .toLowerCase();
      return (
        nombre.includes(term) ||
        comuna.includes(term) ||
        email.includes(term) ||
        wa.includes(term) ||
        corto.includes(term) ||
        dl.includes(term) ||
        kws.includes(term)
      );
    });
  }, [items, search, keywordsEdit]);

  async function aprobar(postulacionId: string) {
    const post = items.find((p) => p.id === postulacionId);
    const row = clasificacion[postulacionId] ?? { categoriaId: "", subIds: [] };
    const tax = taxonomia;
    if (!post || !tax) {
      setMessage("No se pudo preparar la aprobación (taxonomía no lista).");
      return;
    }
    const eff = effectiveClasificacionRow(post, row, tax);
    const categoria_final = s(eff.categoriaId);
    const subcategorias_ids = eff.subIds.map((x) => s(x)).filter(Boolean);
    const etiquetas_finales =
      keywordsEdit[postulacionId] ??
      (post ? mergeKeywordsPreviewModeracion(post) : []);

    const validatePayload = { categoria_id: categoria_final, subcategorias_ids };
    const approvePayload = {
      categoria_final,
      subcategorias_ids,
      etiquetas_finales,
      etiquetas_finales_solo: true,
    };

    try {
      setLoadingId(postulacionId);
      setMessage("");

      const vres = await fetch("/api/admin/validate-categoria-subcategorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatePayload),
      });
      const vdata = await parseJsonResponse(vres);
      if (!vres.ok || vdata.ok === false) {
        logAdminJson("[admin/pendientes] validar clasificación falló", {
          status: vres.status,
          payload: validatePayload,
          response: vdata,
        });
        setMessage(
          formatApiErrorMessage(
            vdata,
            "La clasificación no cumple las reglas; revisa categoría y subcategorías."
          )
        );
        return;
      }

      const res = await fetch(
        `/api/admin/postulaciones/${encodeURIComponent(postulacionId)}/aprobar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(approvePayload),
        }
      );

      const data = await parseJsonResponse(res);

      if (!res.ok || data.ok === false) {
        logAdminJson("[admin/pendientes] aprobar falló", {
          status: res.status,
          payload: { postulacionId, ...approvePayload },
          response: data,
        });
        setMessage(
          formatApiErrorMessage(
            data,
            "No se pudo aprobar la postulación."
          )
        );
        return;
      }

      setItems((prev) => prev.filter((p) => p.id !== postulacionId));
      setClasificacion((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      setKeywordsEdit((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      setKeywordDraft((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      const slugPublicado = s(data.slug);
      setUltimaFichaAprobadaSlug(slugPublicado || null);
      setMessage("Aprobado. La ficha quedó publicada en el sitio.");
    } catch (error) {
      console.error("[admin/pendientes] aprobar excepción de red o parse", error);
      setMessage("Ocurrió un error al aprobar.");
    } finally {
      setLoadingId(null);
    }
  }

  async function rechazar(postulacionId: string, motivo: string) {
    const trimmed = s(motivo);
    if (!trimmed) {
      setMessage("El motivo de rechazo es obligatorio.");
      return;
    }

    try {
      setLoadingId(postulacionId);
      setMessage("");

      const res = await fetch(
        `/api/admin/postulaciones/${encodeURIComponent(postulacionId)}/rechazar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo_rechazo: trimmed }),
          cache: "no-store",
        }
      );

      const data = await parseJsonResponse(res);

      if (!res.ok || data.ok === false) {
        setMessage(
          formatApiErrorMessage(
            data,
            "No se pudo rechazar la postulación."
          )
        );
        return;
      }

      setItems((prev) => prev.filter((p) => p.id !== postulacionId));
      setApproveModalPostId((openId) =>
        openId === postulacionId ? null : openId
      );
      setRejectModalPostId((openId) =>
        openId === postulacionId ? null : openId
      );
      setClasificacion((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      setKeywordsEdit((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      setKeywordDraft((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      setMessage("Postulación rechazada.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Ocurrió un error al rechazar.");
    } finally {
      setLoadingId(null);
    }
  }

  const taxonomiaLista = taxonomia && !taxonomiaLoading && !taxonomiaError;

  const approveModalItem = approveModalPostId
    ? items.find((p) => p.id === approveModalPostId)
    : null;
  const approveModalRow = approveModalPostId
    ? clasificacion[approveModalPostId]
    : undefined;
  const approveModalRowEffective =
    approveModalPostId && approveModalItem && taxonomia && approveModalRow
      ? effectiveClasificacionRow(approveModalItem, approveModalRow, taxonomia)
      : undefined;
  const approveModalKw = approveModalPostId
    ? keywordsEdit[approveModalPostId] ??
      (approveModalItem
        ? mergeKeywordsPreviewModeracion(approveModalItem)
        : [])
    : [];
  const approveModalCatNombre =
    approveModalRowEffective && taxonomia
      ? taxonomia.categorias.find(
          (c) => s(c.id) === s(approveModalRowEffective.categoriaId)
        )?.nombre ?? "—"
      : "—";
  const approveModalSubNombres =
    approveModalRowEffective && taxonomia
      ? approveModalRowEffective.subIds
          .map(
            (id) =>
              taxonomia.subcategorias.find((sc) => s(sc.id) === s(id))?.nombre ??
              id
          )
          .filter(Boolean)
      : [];
  const approveModalCobertura = approveModalItem
    ? formatCoberturaPostulacion(approveModalItem)
    : "—";
  const approveModalNombre = approveModalItem
    ? s(approveModalItem.nombre_emprendimiento) || "Sin nombre"
    : "";
  const approveModalDescCorta = approveModalItem
    ? textoCortoPostulacion(approveModalItem) || "—"
    : "—";

  const rejectModalItem = rejectModalPostId
    ? items.find((p) => p.id === rejectModalPostId)
    : null;

  return (
    <div>
      {approveModalPostId && approveModalItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar aprobación"
          style={confirmModalBackdropStyle}
          onClick={() => setApproveModalPostId(null)}
        >
          <div
            style={confirmModalPanelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={confirmModalTitleStyle}>{approveModalNombre}</h3>
            <p style={confirmModalSubtitleStyle}>Confirmar aprobación</p>
            <p style={hintMutedStyle}>
              Revisá el resumen antes de publicar con esta clasificación y palabras de búsqueda.
            </p>
            <div style={approveModalSummaryBoxStyle}>
              <div style={approveModalSummaryLineStyle}>
                <span style={approveModalSummaryLabelStyle}>Nombre</span>
                <span>{approveModalNombre}</span>
              </div>
              <div style={approveModalSummaryLineStyle}>
                <span style={approveModalSummaryLabelStyle}>Cobertura</span>
                <span>{approveModalCobertura}</span>
              </div>
              <div style={approveModalSummaryLineStyle}>
                <span style={approveModalSummaryLabelStyle}>Descripción corta</span>
                <span style={approveModalSummaryTextStyle}>{approveModalDescCorta}</span>
              </div>
            </div>
            {(approveModalItem.posibles_duplicados ?? []).length > 0 ? (
              <div style={confirmModalDupWarnStyle}>
                <strong>Atención:</strong> hay ficha(s) publicada(s) con el mismo
                WhatsApp en esta comuna. ¿Seguro que quieres aprobar?
              </div>
            ) : null}
            <ul style={confirmModalListStyle}>
              <li>
                <strong>Categoría:</strong> {approveModalCatNombre}
              </li>
              <li>
                <strong>Subcategorías:</strong>{" "}
                {approveModalSubNombres.length
                  ? approveModalSubNombres.join(", ")
                  : "—"}
              </li>
              <li>
                <strong>Cobertura:</strong> {approveModalCobertura}
              </li>
              <li>
                <strong>Keywords ({approveModalKw.length}):</strong>{" "}
                {approveModalKw.length ? approveModalKw.join(", ") : "—"}
              </li>
            </ul>
            <div style={confirmModalActionsStyle}>
              <button
                type="button"
                onClick={() => setApproveModalPostId(null)}
                style={rejectButtonStyle}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={loadingId === approveModalPostId}
                onClick={() => {
                  const id = approveModalPostId;
                  setApproveModalPostId(null);
                  void aprobar(id);
                }}
                style={approveButtonStyle}
              >
                {loadingId === approveModalPostId
                  ? "Procesando…"
                  : "Confirmar y aprobar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectModalPostId && rejectModalItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rechazar postulación"
          style={confirmModalBackdropStyle}
          onClick={() => setRejectModalPostId(null)}
        >
          <div
            style={confirmModalPanelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={confirmModalTitleStyle}>Rechazar postulación</h3>
            <p style={hintMutedStyle}>
              <strong>{s(rejectModalItem.nombre_emprendimiento) || "Sin nombre"}</strong>
              <br />
              Elige un motivo; se guarda en la postulación como referencia interna.
            </p>
            <div style={rejectModalOptionsStyle}>
              <label style={rejectModalRadioRowStyle}>
                <input
                  type="radio"
                  name={`reject-motivo-${rejectModalPostId}`}
                  checked={rejectMotivoPreset === "falta_info"}
                  onChange={() => setRejectMotivoPreset("falta_info")}
                />
                <span>Falta información</span>
              </label>
              <label style={rejectModalRadioRowStyle}>
                <input
                  type="radio"
                  name={`reject-motivo-${rejectModalPostId}`}
                  checked={rejectMotivoPreset === "fotos"}
                  onChange={() => setRejectMotivoPreset("fotos")}
                />
                <span>Fotos no válidas</span>
              </label>
              <label style={rejectModalRadioRowStyle}>
                <input
                  type="radio"
                  name={`reject-motivo-${rejectModalPostId}`}
                  checked={rejectMotivoPreset === "no_corresponde"}
                  onChange={() => setRejectMotivoPreset("no_corresponde")}
                />
                <span>No corresponde</span>
              </label>
              <label style={rejectModalRadioRowStyle}>
                <input
                  type="radio"
                  name={`reject-motivo-${rejectModalPostId}`}
                  checked={rejectMotivoPreset === "otro"}
                  onChange={() => setRejectMotivoPreset("otro")}
                />
                <span>Otro</span>
              </label>
            </div>
            {rejectMotivoPreset === "otro" ? (
              <input
                type="text"
                value={rejectOtroTexto}
                onChange={(e) => setRejectOtroTexto(e.target.value)}
                placeholder="Describe brevemente el motivo"
                style={rejectModalOtroInputStyle}
                aria-label="Motivo de rechazo (otro)"
              />
            ) : null}
            <div style={confirmModalActionsStyle}>
              <button
                type="button"
                onClick={() => setRejectModalPostId(null)}
                style={rejectButtonStyle}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={loadingId === rejectModalPostId}
                onClick={() => {
                  const motivo = motivoRechazoDesdeModal(
                    rejectMotivoPreset,
                    rejectOtroTexto
                  );
                  if (!motivo) {
                    setMessage(
                      "Si elegís «Otro», escribí un motivo breve antes de confirmar."
                    );
                    return;
                  }
                  const id = rejectModalPostId;
                  setRejectModalPostId(null);
                  setRejectOtroTexto("");
                  void rechazar(id, motivo);
                }}
                style={{
                  ...rejectButtonStrongStyle,
                  ...(loadingId === rejectModalPostId ? disabledButtonStyle : {}),
                }}
              >
                {loadingId === rejectModalPostId
                  ? "Procesando…"
                  : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ultimaFichaAprobadaSlug ? (
        <div style={postApproveBannerStyle}>
          <span style={postApproveBannerTextStyle}>
            Ficha publicada correctamente.
          </span>
          <Link
            href={`/emprendedor/${encodeURIComponent(ultimaFichaAprobadaSlug)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={postApproveLinkStyle}
          >
            Ver ficha publicada
          </Link>
          <button
            type="button"
            onClick={() => setUltimaFichaAprobadaSlug(null)}
            style={postApproveDismissStyle}
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {message ? <div style={messageStyle}>{message}</div> : null}
      {taxonomiaError ? (
        <div style={{ ...messageStyle, background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>
          {taxonomiaError}
        </div>
      ) : null}

      <div style={filtersRowStyle}>
        <div style={filtersGroupStyle}>
          <label style={filterLabelStyle}>Estado</label>
          <select
            value={estadoFilter}
            onChange={(e) =>
              setEstadoFilter(e.target.value as EstadoPostulacionFiltro)
            }
            style={filterSelectStyle}
            disabled={listLoading}
          >
            <option value="todos">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="pendiente_revision">Pendiente revisión</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>

        <div style={filtersGroupStyle}>
          <label style={filterLabelStyle}>Buscar</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, textos, keywords, comuna, email o WhatsApp…"
            style={filterInputStyle}
          />
        </div>
      </div>

      {taxonomiaLoading ? (
        <div style={emptyStyle}>Cargando categorías para moderación…</div>
      ) : null}

      {listLoading ? (
        <div style={emptyStyle}>Cargando postulaciones…</div>
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>No hay postulaciones que coincidan con los filtros.</div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {filtered.map((item) => {
            const loading = loadingId === item.id;
            const puedeModerar = item.estado === "pendiente_revision";
            const subtituloFicha =
              textoCortoPostulacion(item) ||
              s(item.descripcion_libre) ||
              "—";
            const mainUrl = s(item.foto_principal_url);
            const galeriaRaw = galeriaUrlsModeracion(item);
            const galeria = mainUrl
              ? galeriaRaw.filter((u) => s(u) !== mainUrl)
              : galeriaRaw;
            const kwList =
              keywordsEdit[item.id] ?? mergeKeywordsPreviewModeracion(item);
            const mods = item.modalidades_atencion ?? [];
            const localesTextoModeracion = textoLocalesModeracion(item);
            const nFotos = (mainUrl ? 1 : 0) + galeria.length;
            const row = clasificacion[item.id];
            const calidadDetalle = detalleCalidadModeracion(item, kwList);
            const catSel = s(row?.categoriaId);
            const subsFiltradas =
              taxonomia?.subcategorias.filter(
                (sc) => s(sc.categoria_id) === catSel
              ) ?? [];
            const validClasificacion = clasificacionPermiteAprobar(
              row,
              taxonomia,
              item
            );
            const rowParaUi =
              taxonomiaLista && taxonomia
                ? effectiveClasificacionRow(
                    item,
                    row ?? { categoriaId: "", subIds: [] },
                    taxonomia
                  )
                : row ?? { categoriaId: "", subIds: [] };
            const puedeAprobar =
              puedeModerar && validClasificacion && taxonomiaLista && !loading;
            const faltaCategoriaPostulante =
              !s(item.categoria_id) &&
              s(item.tipo_postulacion) !== "edicion_publicado";
            const posiblesDup = item.posibles_duplicados ?? [];
            const hayPosibleDuplicado = posiblesDup.length > 0;
            const approveLabel =
              !puedeModerar
                ? "Aprobar"
                : validClasificacion && taxonomiaLista
                  ? hayPosibleDuplicado
                    ? "Aprobar igual"
                    : "Aprobar"
                  : "Completar clasificación";
            const dupAbierto = !!dupPanelOpen[item.id];

            return (
              <article key={item.id} style={cardStyle}>
                <div style={topMetaStyle}>
                  {faltaCategoriaPostulante ? (
                    <span style={badgeFaltaStyle}>Falta categoría (postulante)</span>
                  ) : null}
                  {hayPosibleDuplicado ? (
                    <span style={badgeDuplicadoStyle}>Posible duplicado</span>
                  ) : null}
                  {nFotos === 0 ? (
                    <span style={badgeSinFotosStyle}>
                      ⚠️ Baja confianza (sin fotos)
                    </span>
                  ) : null}
                  <span style={locationStyle}>
                    📍 {item.comuna?.nombre || "Sin comuna"}
                  </span>
                  <span style={statusStyle}>{item.estado || "—"}</span>
                  {item.tipo_postulacion ? (
                    <span style={tipoStyle}>{item.tipo_postulacion}</span>
                  ) : null}
                </div>

                <h2 style={titleStyle}>
                  {item.nombre_emprendimiento || "Sin nombre"}
                </h2>

                <p style={shortDescStyle}>{subtituloFicha}</p>

                {hayPosibleDuplicado ? (
                  <div style={dupOuterStyle}>
                    <button
                      type="button"
                      onClick={() => toggleDupPanel(item.id)}
                      style={dupToggleStyle}
                      aria-expanded={dupAbierto}
                    >
                      {dupAbierto ? "▼" : "▶"} Ficha(s) publicada(s) con mismo WhatsApp
                      en esta comuna ({posiblesDup.length})
                    </button>
                    {dupAbierto ? (
                      <ul style={dupListStyle}>
                        {posiblesDup.map((d) => (
                          <li key={d.id} style={dupLiStyle}>
                            <div style={dupLineTitleStyle}>{d.nombre_emprendimiento}</div>
                            <div style={dupLineMetaStyle}>
                              <span>
                                {d.comuna.nombre}
                                {d.comuna.slug ? ` · ${d.comuna.slug}` : ""}
                              </span>
                              {" · "}
                              <span style={{ fontFamily: "monospace" }}>
                                {d.whatsapp_mascarado}
                              </span>
                            </div>
                            {d.slug ? (
                              <Link
                                href={`/emprendedor/${encodeURIComponent(d.slug)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={dupLinkStyle}
                              >
                                Abrir ficha pública
                              </Link>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div style={previewSectionStyle}>
                  <ModeracionFichaPreview
                    item={item}
                    row={rowParaUi}
                    taxonomia={taxonomia}
                  />
                </div>

                <div style={calidadBlockStyle}>
                  <div style={calidadRowStyle}>
                    <span style={calidadLabelStyle}>Calidad:</span>
                    <span
                      style={{
                        ...calidadValorStyle,
                        ...(calidadDetalle.nivel === "Alta"
                          ? calidadAltaStyle
                          : calidadDetalle.nivel === "Media"
                            ? calidadMediaStyle
                            : calidadBajaStyle),
                      }}
                    >
                      {calidadDetalle.nivel}
                    </span>
                    <span style={hintMutedStyle}>
                      (foto, descripción, palabras de búsqueda, contacto extra)
                    </span>
                  </div>
                  <p style={calidadRecoStyle}>{calidadDetalle.recomendacion}</p>
                </div>

                {puedeModerar ? (
                  <div style={qualityAlertsBoxStyle}>
                    <div style={qualityAlertsTitleStyle}>Alertas de calidad (no bloquean aprobar)</div>
                    <ul style={qualityAlertsListStyle}>
                      {nFotos === 0 ? (
                        <li style={qualityAlertItemStyle}>
                          Sin fotos: menor confianza y visibilidad
                        </li>
                      ) : null}
                      {kwList.length === 0 ? (
                        <li style={qualityAlertItemStyle}>
                          La lista de palabras clave está vacía; conviene agregar términos de
                          búsqueda.
                        </li>
                      ) : null}
                      {(rowParaUi.subIds ?? []).length === 0 &&
                      s(item.tipo_postulacion) !== "edicion_publicado" ? (
                        <li style={qualityAlertItemStyle}>
                          Falta elegir al menos una subcategoría (requerido para habilitar
                          aprobar).
                        </li>
                      ) : null}
                      {s(item.tipo_postulacion) === "edicion_publicado" &&
                      item.clasificacion_publicada &&
                      (!s(item.categoria_id) &&
                        !(Array.isArray(item.subcategorias_ids) && item.subcategorias_ids.length > 0)) ? (
                        <li style={qualityAlertItemStyle}>
                          El borrador no trae rubro nuevo: al aprobar se mantiene la clasificación
                          publicada (podés cambiarla arriba si corresponde).
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                <div style={structuredBoxStyle}>
                  <div style={previewSectionTitleStyle}>Datos enviados</div>
                  <ul style={structuredListStyle}>
                    <li>
                      <strong>Cobertura (tipo):</strong>{" "}
                      {s(item.cobertura_tipo) || "—"}
                    </li>
                    <li>
                      <strong>Comunas (slugs):</strong>{" "}
                      {(item.comunas_cobertura ?? []).length
                        ? (item.comunas_cobertura ?? []).join(", ")
                        : "—"}
                    </li>
                    <li>
                      <strong>Regiones (slugs):</strong>{" "}
                      {(item.regiones_cobertura ?? []).length
                        ? (item.regiones_cobertura ?? []).join(", ")
                        : "—"}
                    </li>
                    <li>
                      <strong>Resumen cobertura:</strong>{" "}
                      {formatCoberturaPostulacion(item)}
                    </li>
                    <li>
                      <strong>Modalidades:</strong>{" "}
                      {mods.length
                        ? mods
                            .map((m) => etiquetaModalidadAtencion(m) || m)
                            .join(" · ")
                        : "—"}
                    </li>
                    {localesTextoModeracion ? (
                      <li>
                        <strong>Locales físicos:</strong>{" "}
                        <span
                          style={{
                            whiteSpace: "pre-wrap",
                            display: "inline-block",
                            verticalAlign: "top",
                            maxWidth: "100%",
                          }}
                        >
                          {localesTextoModeracion}
                        </span>
                      </li>
                    ) : null}
                    <li>
                      <strong>Contacto:</strong>{" "}
                      {[
                        item.email ? `email: ${item.email}` : "",
                        item.whatsapp_principal
                          ? `WhatsApp: ${item.whatsapp_principal}`
                          : "",
                        item.whatsapp_secundario
                          ? `WhatsApp 2: ${item.whatsapp_secundario}`
                          : "",
                        item.instagram ? `IG: @${item.instagram}` : "",
                        sitioWebModeracion(item)
                          ? `Web: ${sitioWebModeracion(item)}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </li>
                    {s(item.direccion) || s(item.direccion_referencia) ? (
                      <li>
                        <strong>Dirección:</strong>{" "}
                        {s(item.direccion)}
                        {s(item.direccion) && s(item.direccion_referencia)
                          ? " · "
                          : ""}
                        {s(item.direccion_referencia)}
                      </li>
                    ) : null}
                    <li>
                      <strong>Fotos:</strong> {nFotos} (principal + galería)
                    </li>
                    <li>
                      <strong>Creado:</strong>{" "}
                      {item.created_at
                        ? formatDateSafe(item.created_at)
                        : "—"}
                    </li>
                    <li>
                      <strong>Actualizado:</strong>{" "}
                      {item.updated_at
                        ? formatDateSafe(item.updated_at)
                        : "—"}
                    </li>
                  </ul>
                </div>

                <div style={keywordsBoxStyle}>
                  <div style={keywordsTitleStyle}>Palabras para el buscador</div>
                  <p style={keywordsContextNoteStyle}>
                    Son las que la gente escribe al buscar. Si encajan con el negocio, aparecerá
                    cuando corresponda.
                  </p>
                  <p style={hintMutedStyle}>
                    Hasta {MAX_KEYWORDS_MODERACION} términos. La lista que dejes aquí es la que se
                    guarda al aprobar. Si en la base no hay keywords aún, puedes partir de las
                    sugerencias o escribir las tuyas.
                  </p>
                  {(() => {
                    const sugerencias = sugerenciasKeywordsAutomaticas(item, kwList);
                    if (!sugerencias.length) return null;
                    return (
                      <div style={sugerenciasBlockStyle}>
                        <span style={sugerenciasLabelStyle}>
                          Ideas rápidas (clic para sumar a la lista)
                        </span>
                        <div style={chipWrapStyle}>
                          {sugerencias.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              disabled={
                                !puedeModerar ||
                                kwList.length >= MAX_KEYWORDS_MODERACION
                              }
                              onClick={() =>
                                appendKeywordSuggestion(item.id, sug)
                              }
                              style={suggestionChipButtonStyle}
                            >
                              + {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={chipWrapStyle}>
                    {kwList.length === 0 ? (
                      <span style={hintMutedStyle}>
                        Aún no hay términos; agrega al menos uno si puedes.
                      </span>
                    ) : (
                      kwList.map((kw, idx) => (
                        <span key={`${kw}-${idx}`} style={chipStyle}>
                          {kw}
                          <button
                            type="button"
                            disabled={!puedeModerar}
                            onClick={() => removeKeywordAt(item.id, idx)}
                            style={chipRemoveStyle}
                            aria-label={`Quitar ${kw}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div style={keywordAddRowStyle}>
                    <input
                      type="text"
                      value={keywordDraft[item.id] ?? ""}
                      onChange={(e) =>
                        setKeywordDraft((d) => ({
                          ...d,
                          [item.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeywordsToPost(
                            item.id,
                            keywordDraft[item.id] ?? ""
                          );
                        }
                      }}
                      placeholder="Ej: tortas, a domicilio, Maipú (varias separadas por coma)"
                      style={keywordInputStyle}
                      disabled={!puedeModerar || kwList.length >= MAX_KEYWORDS_MODERACION}
                    />
                    <button
                      type="button"
                      disabled={
                        !puedeModerar ||
                        kwList.length >= MAX_KEYWORDS_MODERACION
                      }
                      onClick={() =>
                        addKeywordsToPost(item.id, keywordDraft[item.id] ?? "")
                      }
                      style={keywordAddButtonStyle}
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {s(item.tipo_postulacion) === "edicion_publicado" &&
                item.clasificacion_publicada &&
                (s(item.clasificacion_publicada.categoria_id) ||
                  (item.clasificacion_publicada.subcategorias_nombres ?? []).length >
                    0) ? (
                  <div style={sugeridoBoxStyle}>
                    <div style={sugeridoTitleStyle}>Ficha publicada hoy (referencia)</div>
                    <p style={sugeridoLineStyle}>
                      <strong>Rubro:</strong>{" "}
                      {item.clasificacion_publicada.categoria?.nombre || "—"}
                    </p>
                    <p style={sugeridoLineStyle}>
                      <strong>Subrubros:</strong>{" "}
                      {item.clasificacion_publicada.subcategorias_nombres.length
                        ? item.clasificacion_publicada.subcategorias_nombres.join(", ")
                        : "—"}
                    </p>
                  </div>
                ) : null}

                <fieldset
                  style={clasificacionFieldsetStyle}
                  disabled={!taxonomiaLista || taxonomiaLoading}
                >
                  <legend style={clasificacionLegendStyle}>
                    {s(item.tipo_postulacion) === "edicion_publicado"
                      ? "Clasificación (referencia y ajuste opcional)"
                      : "Clasificación manual (obligatoria para aprobar)"}
                  </legend>
                  <p style={hintMutedStyle}>
                    {s(item.tipo_postulacion) === "edicion_publicado"
                      ? "Si no cambiás nada, se conserva el rubro vigente en la ficha publicada."
                      : "Define categoría y subcategorías finales; no dependen del postulante."}
                  </p>
                  <label style={clasificacionLabelStyle}>Categoría</label>
                  <select
                    value={catSel}
                    onChange={(e) =>
                      setCategoriaPostulacion(item.id, e.target.value)
                    }
                    style={clasificacionSelectStyle}
                  >
                    <option value="">Seleccionar categoría…</option>
                    {(taxonomia?.categorias ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>

                  <div style={{ marginTop: 12 }}>
                    <span style={clasificacionLabelStyle}>Subcategorías</span>
                    {!catSel ? (
                      <p style={hintMutedStyle}>
                        Elige una categoría para ver las subcategorías.
                      </p>
                    ) : subsFiltradas.length === 0 ? (
                      <p style={hintMutedStyle}>
                        No hay subcategorías en catálogo para esta categoría.
                      </p>
                    ) : (
                      <ul style={subListStyle}>
                        {subsFiltradas.map((sc) => {
                          const checked = (row?.subIds ?? [])
                            .map((x) => s(x))
                            .includes(s(sc.id));
                          return (
                            <li key={sc.id} style={subLiStyle}>
                              <label style={subLabelStyle}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleSubcategoria(item.id, sc.id)
                                  }
                                />
                                <span>{sc.nombre}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </fieldset>

                <div style={sugeridoBoxStyle}>
                  <div style={sugeridoTitleStyle}>Referencia: lo que eligió el postulante</div>
                  <p style={sugeridoLineStyle}>
                    <strong>Categoría:</strong>{" "}
                    {item.categoria?.nombre || "—"}
                  </p>
                  <p style={sugeridoLineStyle}>
                    <strong>Subcategorías:</strong>{" "}
                    {item.subcategorias_nombres.length
                      ? item.subcategorias_nombres.join(", ")
                      : "—"}
                  </p>
                </div>

                {s(item.categoria_ia) || s(item.subcategoria_ia) ? (
                  <div style={{ ...sugeridoBoxStyle, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                    <div style={sugeridoTitleStyle}>Referencia IA (legacy)</div>
                    {s(item.categoria_ia) ? (
                      <p style={sugeridoLineStyle}>
                        <strong>Categoría:</strong> {s(item.categoria_ia)}
                      </p>
                    ) : null}
                    {s(item.subcategoria_ia) ? (
                      <p style={sugeridoLineStyle}>
                        <strong>Subcategoría:</strong> {s(item.subcategoria_ia)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div style={actionsStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!puedeAprobar) return;
                      setApproveModalPostId(item.id);
                    }}
                    disabled={!puedeAprobar}
                    style={{
                      ...approveButtonStyle,
                      ...(puedeAprobar && hayPosibleDuplicado
                        ? approveButtonDuplicadoStyle
                        : {}),
                      ...(!puedeAprobar ? disabledButtonStyle : {}),
                    }}
                  >
                    {loading ? "Procesando…" : approveLabel}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalPostId(item.id);
                      setRejectMotivoPreset("falta_info");
                      setRejectOtroTexto("");
                      setMessage("");
                    }}
                    disabled={loading || !puedeModerar}
                    style={{
                      ...rejectButtonStyle,
                      ...(loading || !puedeModerar ? disabledButtonStyle : {}),
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const topMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 12,
  fontSize: 13,
};

const badgeFaltaStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
};

const badgeDuplicadoStyle: React.CSSProperties = {
  background: "#ffedd5",
  color: "#9a3412",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
};

const badgeSinFotosStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
};

const dupOuterStyle: React.CSSProperties = {
  marginBottom: 16,
  borderRadius: 14,
  border: "1px solid #fed7aa",
  background: "#fffbeb",
  overflow: "hidden",
};

const dupToggleStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "12px 14px",
  border: "none",
  background: "transparent",
  fontSize: 13,
  fontWeight: 800,
  color: "#9a3412",
  cursor: "pointer",
};

const dupListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: "0 14px 14px 14px",
  display: "grid",
  gap: 12,
};

const dupLiStyle: React.CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 10,
  background: "#fff",
  border: "1px solid #fde68a",
};

const dupLineTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
  color: "#1f2937",
  marginBottom: 6,
};

const dupLineMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 8,
};

const dupLinkStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#2563eb",
  textDecoration: "underline",
};

const locationStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 700,
};

const statusStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
};

const tipoStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 600,
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  lineHeight: 1.1,
  fontWeight: 900,
  margin: "0 0 8px 0",
  color: "#111827",
};

const shortDescStyle: React.CSSProperties = {
  margin: "0 0 16px 0",
  color: "#555",
  fontSize: 16,
};

const sugeridoBoxStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const sugeridoTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#6b7280",
  marginBottom: 8,
};

const sugeridoLineStyle: React.CSSProperties = {
  margin: "0 0 6px 0",
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.5,
};

const clasificacionFieldsetStyle: React.CSSProperties = {
  margin: "0 0 18px 0",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
};

const clasificacionLegendStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  color: "#3730a3",
  padding: "0 8px",
};

const clasificacionLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#4338ca",
  marginBottom: 6,
};

const clasificacionSelectStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  height: 40,
  borderRadius: 10,
  border: "1px solid #a5b4fc",
  padding: "0 12px",
  fontSize: 15,
  background: "#fff",
};

const hintMutedStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 13,
  color: "#6b7280",
};

const subListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: "10px 0 0 0",
  padding: 0,
  display: "grid",
  gap: 8,
  maxHeight: 220,
  overflowY: "auto",
};

const subLiStyle: React.CSSProperties = {
  margin: 0,
};

const subLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  cursor: "pointer",
  color: "#1f2937",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 18,
};

const approveButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "#10b981",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

/** Aprobación con posible duplicado (misma regla que el badge). */
const approveButtonDuplicadoStyle: React.CSSProperties = {
  background: "#ea580c",
};

const rejectButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  fontWeight: 800,
  cursor: "pointer",
};

const rejectButtonStrongStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "#b91c1c",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButtonStyle: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const emptyStyle: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 18,
  padding: 28,
  background: "#fff",
  color: "#6b7280",
  fontSize: 16,
};

const messageStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 14,
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  fontWeight: 700,
};

const filtersRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  alignItems: "flex-end",
  marginBottom: 18,
};

const filtersGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 220,
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#4b5563",
};

const filterSelectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  padding: "0 10px",
  fontSize: 14,
};

const filterInputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  padding: "0 10px",
  fontSize: 14,
  minWidth: 260,
};

const keywordsBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #fde68a",
  background: "#fffbeb",
};

const keywordsTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#92400e",
  marginBottom: 8,
};

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
  marginBottom: 12,
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#fff",
  border: "1px solid #fcd34d",
  fontSize: 14,
  fontWeight: 600,
  color: "#78350f",
};

const chipRemoveStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  padding: 0,
  color: "#b45309",
};

const keywordAddRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
};

const keywordInputStyle: React.CSSProperties = {
  flex: "1 1 220px",
  minWidth: 200,
  height: 40,
  borderRadius: 10,
  border: "1px solid #fcd34d",
  padding: "0 12px",
  fontSize: 15,
};

const keywordAddButtonStyle: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  background: "#d97706",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const previewSectionStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
};

const previewSectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#4b5563",
  marginBottom: 12,
};

const calidadBlockStyle: React.CSSProperties = {
  marginBottom: 18,
};

const calidadRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: 8,
  marginBottom: 8,
  fontSize: 14,
};

const calidadRecoStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.55,
  color: "#374151",
  fontWeight: 600,
};

const calidadLabelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#374151",
};

const calidadValorStyle: React.CSSProperties = {
  fontWeight: 800,
};

const calidadAltaStyle: React.CSSProperties = { color: "#15803d" };
const calidadMediaStyle: React.CSSProperties = { color: "#b45309" };
const calidadBajaStyle: React.CSSProperties = { color: "#b91c1c" };

const structuredBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  background: "#fff",
};

const structuredListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 14,
  lineHeight: 1.65,
  color: "#374151",
};

const qualityAlertsBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #fde68a",
  background: "#fffbeb",
};

const qualityAlertsTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#b45309",
  marginBottom: 8,
};

const qualityAlertsListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 14,
  lineHeight: 1.55,
  color: "#78350f",
};

const qualityAlertItemStyle: React.CSSProperties = {
  marginBottom: 4,
};

const keywordsContextNoteStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: 14,
  fontWeight: 700,
  color: "#92400e",
  lineHeight: 1.45,
};

const sugerenciasBlockStyle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 10,
};

const sugerenciasLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#78350f",
  marginBottom: 8,
};

const suggestionChipButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px dashed #d97706",
  background: "#fff",
  fontSize: 13,
  fontWeight: 700,
  color: "#b45309",
  cursor: "pointer",
};

const confirmModalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10001,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const confirmModalPanelStyle: React.CSSProperties = {
  maxWidth: 480,
  width: "100%",
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
};

const confirmModalTitleStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: 22,
  fontWeight: 900,
  color: "#111827",
};

const confirmModalSubtitleStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 13,
  fontWeight: 800,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const approveModalSummaryBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  display: "grid",
  gap: 10,
};

const approveModalSummaryLineStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 14,
  color: "#1f2937",
  lineHeight: 1.45,
};

const approveModalSummaryLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#6b7280",
};

const approveModalSummaryTextStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const rejectModalOptionsStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 14,
};

const rejectModalRadioRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 15,
  fontWeight: 600,
  color: "#374151",
  cursor: "pointer",
};

const rejectModalOtroInputStyle: React.CSSProperties = {
  width: "100%",
  marginBottom: 16,
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  padding: "0 12px",
  fontSize: 15,
  boxSizing: "border-box",
};

const postApproveBannerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
  padding: 14,
  borderRadius: 14,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
};

const postApproveBannerTextStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#065f46",
  fontSize: 15,
};

const postApproveLinkStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#047857",
  textDecoration: "underline",
  fontSize: 15,
};

const postApproveDismissStyle: React.CSSProperties = {
  marginLeft: "auto",
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #6ee7b7",
  background: "#fff",
  color: "#065f46",
  fontWeight: 700,
  cursor: "pointer",
};

const confirmModalDupWarnStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 12,
  borderRadius: 12,
  background: "#ffedd5",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontSize: 14,
  lineHeight: 1.5,
};

const confirmModalListStyle: React.CSSProperties = {
  margin: "0 0 20px 0",
  paddingLeft: 18,
  fontSize: 15,
  lineHeight: 1.65,
  color: "#374151",
};

const confirmModalActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};
