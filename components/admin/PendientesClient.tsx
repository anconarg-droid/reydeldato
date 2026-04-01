"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostulacionModeracionItem } from "@/lib/loadPostulacionesModeracion";
import { formatDateSafe } from "@/lib/formatDateTimeEsCL";

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

function s(v: unknown) {
  return String(v ?? "").trim();
}

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
    if (
      blob.includes("categoria_slug_final") ||
      blob.includes("subcategoria_slug_final") ||
      blob.includes("keywords_finales")
    ) {
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

function clasificacionPermiteAprobar(
  row: ClasificacionRow | undefined,
  taxonomia: TaxonomiaMod | null
): boolean {
  if (!taxonomia || !row) return false;
  const catId = s(row.categoriaId);
  const subIds = row.subIds.map((x) => s(x)).filter(Boolean);
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
          next[it.id] = {
            categoriaId: s(it.categoria_id),
            subIds: [...(it.subcategorias_ids ?? [])],
          };
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
      return (
        nombre.includes(term) ||
        comuna.includes(term) ||
        email.includes(term) ||
        wa.includes(term)
      );
    });
  }, [items, search]);

  async function aprobar(postulacionId: string) {
    const row = clasificacion[postulacionId];
    const categoria_final = s(row?.categoriaId);
    const subcategorias_ids = (row?.subIds ?? []).map((x) => s(x)).filter(Boolean);
    const validatePayload = { categoria_id: categoria_final, subcategorias_ids };
    const approvePayload = { categoria_final, subcategorias_ids };

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
      setMessage(
        "Postulación aprobada; el emprendimiento quedó publicado según la ruta de aprobación."
      );
    } catch (error) {
      console.error("[admin/pendientes] aprobar excepción de red o parse", error);
      setMessage("Ocurrió un error al aprobar.");
    } finally {
      setLoadingId(null);
    }
  }

  async function rechazar(postulacionId: string) {
    const motivo = window.prompt("Motivo del rechazo (obligatorio):");
    if (motivo == null) return;
    const trimmed = motivo.trim();
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
      setClasificacion((prev) => {
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

  return (
    <div>
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
            placeholder="Nombre, comuna, email o WhatsApp…"
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
            const descripcionBase =
              s(item.frase_negocio) || s(item.descripcion_libre) || "—";
            const row = clasificacion[item.id];
            const catSel = s(row?.categoriaId);
            const subsFiltradas =
              taxonomia?.subcategorias.filter(
                (sc) => s(sc.categoria_id) === catSel
              ) ?? [];
            const validClasificacion = clasificacionPermiteAprobar(row, taxonomia);
            const puedeAprobar =
              puedeModerar && validClasificacion && taxonomiaLista && !loading;
            const faltaCategoriaPostulante = !s(item.categoria_id);
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
                {/* A. Estructura tarjeta: meta + sugerido + IA + clasificación + detalle + acciones */}
                <div style={topMetaStyle}>
                  {faltaCategoriaPostulante ? (
                    <span style={badgeFaltaStyle}>Falta categoría</span>
                  ) : null}
                  {hayPosibleDuplicado ? (
                    <span style={badgeDuplicadoStyle}>Posible duplicado</span>
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

                <p style={shortDescStyle}>{descripcionBase}</p>

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

                <div style={sugeridoBoxStyle}>
                  <div style={sugeridoTitleStyle}>Sugerido por el postulante</div>
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
                    <div style={sugeridoTitleStyle}>Sugerido (IA)</div>
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

                {/* B. Bloque clasificación rápida (categoría + multiselect subs filtradas) */}
                <fieldset
                  style={clasificacionFieldsetStyle}
                  disabled={!taxonomiaLista || taxonomiaLoading}
                >
                  <legend style={clasificacionLegendStyle}>Clasificación rápida</legend>
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

                <div style={contentGridStyle}>
                  <div>
                    {item.email ? (
                      <p style={infoLineStyle}>
                        <strong>Email:</strong> {item.email}
                      </p>
                    ) : null}
                    {item.sitio_web ? (
                      <p style={infoLineStyle}>
                        <strong>Sitio:</strong> {item.sitio_web}
                      </p>
                    ) : null}
                    {item.descripcion_libre && s(item.frase_negocio) ? (
                      <p style={infoLineMutedStyle}>
                        <strong>Descripción:</strong> {s(item.descripcion_libre)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    {item.whatsapp_principal ? (
                      <p style={infoLineStyle}>
                        <strong>WhatsApp:</strong> {item.whatsapp_principal}
                      </p>
                    ) : null}
                    {item.instagram ? (
                      <p style={infoLineStyle}>
                        <strong>Instagram:</strong> @{item.instagram}
                      </p>
                    ) : null}
                    <p style={infoLineStyle}>
                      <strong>Cobertura:</strong>{" "}
                      {formatCoberturaPostulacion(item)}
                    </p>
                    {item.updated_at ? (
                      <p style={infoLineMutedStyle}>
                        Actualizado: {formatDateSafe(item.updated_at)}
                      </p>
                    ) : null}
                    {item.created_at ? (
                      <p style={infoLineMutedStyle}>
                        Creado: {formatDateSafe(item.created_at)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {item.foto_principal_url ? (
                  <div style={imageBoxStyle}>
                    <img
                      src={item.foto_principal_url}
                      alt={item.nombre_emprendimiento || "Foto"}
                      style={imageStyle}
                    />
                  </div>
                ) : null}

                <div style={actionsStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!puedeAprobar) return;

                      if (hayPosibleDuplicado) {
                        const ok = window.confirm(
                          "Se detectó un posible duplicado.\n\n¿Aprobar igual?"
                        );
                        if (!ok) return;
                      }

                      aprobar(item.id);
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
                    onClick={() => rechazar(item.id)}
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

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
  marginBottom: 16,
};

const infoLineStyle: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: 15,
  lineHeight: 1.5,
  color: "#222",
};

const infoLineMutedStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#6b7280",
};

const imageBoxStyle: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  maxWidth: 320,
};

const imageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  objectFit: "cover",
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
