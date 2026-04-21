"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  AdminRevisionFieldDisplay,
  AdminRevisionFieldRow,
} from "@/lib/buildAdminRevisionFieldRows";

type Props = {
  postulacionId: string;
  nombrePostulacion: string;
  estadoPostulacion: string;
  tipoPostulacion: string;
  emprendedorId: string | null;
  emprendedorSlug: string | null;
  fields: AdminRevisionFieldRow[];
  resumenCambios: string[];
  tieneCambiosCriticos: boolean;
  initialCategoriaId: string;
  initialSubcategoriaIds: string[];
  referenciaCategoriaNombre: string | null;
  referenciaSubcategoriasTexto: string | null;
};

function str(v: unknown) {
  return String(v ?? "").trim();
}

type CategoriaMod = { id: string; nombre: string; slug: string };
type SubcategoriaMod = { id: string; nombre: string; slug: string; categoria_id: string };
type TaxonomiaMod = { categorias: CategoriaMod[]; subcategorias: SubcategoriaMod[] };

function sanitizeRevisionClasificacion(
  categoriaId: string,
  subIds: string[],
  taxonomia: TaxonomiaMod
): { categoriaId: string; subIds: string[] } {
  const catId = str(categoriaId);
  if (!catId) return { categoriaId: "", subIds: [] };
  const allowed = new Set(
    taxonomia.subcategorias
      .filter((sc) => str(sc.categoria_id) === catId)
      .map((sc) => str(sc.id))
  );
  return {
    categoriaId: catId,
    subIds: subIds.map((x) => str(x)).filter((id) => allowed.has(id)),
  };
}

const SIZE_THUMB_GALLERY = 112;
const SIZE_FOTO_COMPARE = 220;
const SIZE_FOTO_SINGLE = 260;

/**
 * Miniatura fija para moderación: rounded, borde según tono, object-cover, sin mostrar URL.
 * Cualquier string no vacío se intenta como `src`; si falla la carga → placeholder.
 */
function RevisionThumbnail({
  url,
  tone,
  size,
}: {
  url: string;
  tone: "removed" | "added" | "neutral";
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();
  const border =
    tone === "removed"
      ? "2px solid #f87171"
      : tone === "added"
        ? "2px solid #4ade80"
        : "1px solid #e2e8f0";
  const bg =
    tone === "removed" ? "#fef2f2" : tone === "added" ? "#f0fdf4" : "#ffffff";

  const showImg = trimmed.length > 0 && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        border,
        background: bg,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#64748b",
            padding: 10,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          {!trimmed ? "Sin imagen" : "No se pudo cargar imagen"}
        </span>
      )}
    </div>
  );
}

function ThumbnailGrid({
  urls,
  tone,
  size,
}: {
  urls: string[];
  tone: "removed" | "added" | "neutral";
  size: number;
}) {
  if (!urls.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {urls.map((u, i) => (
        <RevisionThumbnail key={`${tone}-${i}-${u.slice(0, 40)}`} url={u} tone={tone} size={size} />
      ))}
    </div>
  );
}

function ListDiffChips({ removed, added }: { removed: string[]; added: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {removed.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>
            Quitan
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {removed.map((x, i) => (
              <span
                key={`r-${i}-${x}`}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#fee2e2",
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                }}
              >
                − {x}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {added.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", marginBottom: 6 }}>
            Agregan
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {added.map((x, i) => (
              <span
                key={`a-${i}-${x}`}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                }}
              >
                + {x}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldBlock({ row }: { row: AdminRevisionFieldRow }) {
  const title = (
    <div style={{ fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 10 }}>
      {row.label}
      {row.isDeletion ? (
        <span style={{ color: "#b45309", fontWeight: 900, marginLeft: 6 }}>⚠ eliminación</span>
      ) : null}
    </div>
  );

  const d: AdminRevisionFieldDisplay = row.display;

  if (d.type === "unchanged") {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 14,
          background: "#fafafa",
        }}
      >
        {title}
        <div
          style={{
            fontSize: 13,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#374151",
            lineHeight: 1.45,
          }}
        >
          {d.text}
        </div>
      </div>
    );
  }

  if (d.type === "list") {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 14,
          background: "#fafafa",
        }}
      >
        {title}
        <ListDiffChips removed={d.removed} added={d.added} />
      </div>
    );
  }

  if (d.type === "foto_principal") {
    if (d.variant === "single") {
      return (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#fafafa",
          }}
        >
          {title}
          <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>
            Sin cambios — foto actual
          </div>
          <RevisionThumbnail
            url={d.url || ""}
            tone="neutral"
            size={SIZE_FOTO_SINGLE}
          />
        </div>
      );
    }
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "#fafafa",
        }}
      >
        {title}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 28,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.04em",
                color: "#64748b",
                marginBottom: 10,
              }}
            >
              ANTES
            </div>
            <RevisionThumbnail
              url={d.antesUrl || ""}
              tone="removed"
              size={SIZE_FOTO_COMPARE}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.04em",
                color: "#166534",
                marginBottom: 10,
              }}
            >
              AHORA
            </div>
            <RevisionThumbnail
              url={d.ahoraUrl || ""}
              tone="added"
              size={SIZE_FOTO_COMPARE}
            />
          </div>
        </div>
      </div>
    );
  }

  if (d.type === "galeria") {
    if (d.variant === "unchanged") {
      return (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
            background: "#fafafa",
          }}
        >
          {title}
          <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>
            Sin cambios en la galería
          </div>
          {d.urls.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Sin fotos en galería</div>
          ) : (
            <ThumbnailGrid urls={d.urls} tone="neutral" size={SIZE_THUMB_GALLERY} />
          )}
        </div>
      );
    }
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 14,
          background: "#fafafa",
        }}
      >
        {title}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {d.removed.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#b91c1c",
                  marginBottom: 10,
                  letterSpacing: "0.02em",
                }}
              >
                Quitadas
              </div>
              <ThumbnailGrid urls={d.removed} tone="removed" size={SIZE_THUMB_GALLERY} />
            </div>
          ) : null}
          {d.added.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#166534",
                  marginBottom: 10,
                  letterSpacing: "0.02em",
                }}
              >
                Agregadas
              </div>
              <ThumbnailGrid urls={d.added} tone="added" size={SIZE_THUMB_GALLERY} />
            </div>
          ) : null}
          {d.kept.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#475569",
                  marginBottom: 10,
                  letterSpacing: "0.02em",
                }}
              >
                Se mantienen
              </div>
              <ThumbnailGrid urls={d.kept} tone="neutral" size={SIZE_THUMB_GALLERY} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  /* scalar */
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        background: "#fafafa",
      }}
    >
      {title}
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        <div style={{ color: "#6b7280", fontWeight: 700, marginBottom: 4 }}>Antes</div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#374151",
            lineHeight: 1.45,
          }}
        >
          {d.antes}
        </div>
      </div>
      <div style={{ fontSize: 13 }}>
        <div style={{ color: "#166534", fontWeight: 700, marginBottom: 4 }}>Ahora</div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            lineHeight: 1.45,
            background: "#ecfdf5",
            border: "1px solid #86efac",
            borderRadius: 8,
            padding: 10,
            color: "#14532d",
          }}
        >
          {d.ahora}
        </div>
      </div>
    </div>
  );
}

const BTN_PRIMARY: CSSProperties = {
  height: 40,
  padding: "0 18px",
  borderRadius: 999,
  border: "none",
  fontWeight: 800,
  fontSize: 14,
};

const BTN_DANGER: CSSProperties = {
  height: 40,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid #fca5a5",
  background: "#fef2f2",
  color: "#b91c1c",
  fontWeight: 800,
  fontSize: 14,
};

function RevisionActions({
  puedePublicar,
  puedeRechazar,
  approveLabel,
  approveLoadingLabel,
  loading,
  onAprobar,
  onRechazar,
  publicarBloqueadoDetalle,
  mostrarNotaRechazar,
}: {
  puedePublicar: boolean;
  puedeRechazar: boolean;
  approveLabel: string;
  approveLoadingLabel: string;
  loading: "aprobar" | "rechazar" | null;
  onAprobar: () => void;
  onRechazar: () => void;
  publicarBloqueadoDetalle: ReactNode;
  mostrarNotaRechazar: boolean;
}) {
  const busy = loading !== null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          disabled={!puedePublicar || busy}
          onClick={onAprobar}
          style={{
            ...BTN_PRIMARY,
            background: puedePublicar ? "#059669" : "#d1d5db",
            color: "#fff",
            cursor: puedePublicar && !busy ? "pointer" : "not-allowed",
          }}
        >
          {loading === "aprobar" ? approveLoadingLabel : approveLabel}
        </button>
        <button
          type="button"
          disabled={!puedeRechazar || busy}
          onClick={onRechazar}
          style={{
            ...BTN_DANGER,
            opacity: puedeRechazar ? 1 : 0.65,
            cursor: puedeRechazar && !busy ? "pointer" : "not-allowed",
          }}
        >
          {loading === "rechazar" ? "Procesando…" : "Rechazar revisión"}
        </button>
      </div>
      {!puedePublicar && publicarBloqueadoDetalle ? (
        <div
          role="status"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            color: "#78350f",
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          {publicarBloqueadoDetalle}
        </div>
      ) : null}
      {puedePublicar && !puedeRechazar && mostrarNotaRechazar ? (
        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          <strong>Rechazar revisión</strong> solo aplica a postulaciones de tipo{" "}
          <code>edicion_publicado</code> con emprendedor vinculado y ficha en revisión. En altas nuevas
          aprobadas usá publicar o volvé al listado.
        </div>
      ) : null}
    </div>
  );
}

export default function AdminRevisionClient({
  postulacionId,
  nombrePostulacion,
  estadoPostulacion,
  tipoPostulacion,
  emprendedorId,
  emprendedorSlug,
  fields,
  resumenCambios,
  tieneCambiosCriticos,
  initialCategoriaId,
  initialSubcategoriaIds,
  referenciaCategoriaNombre,
  referenciaSubcategoriasTexto,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aprobar" | "rechazar" | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [taxonomia, setTaxonomia] = useState<TaxonomiaMod | null>(null);
  const [taxonomiaLoading, setTaxonomiaLoading] = useState(true);
  const [taxonomiaError, setTaxonomiaError] = useState("");
  const [categoriaId, setCategoriaId] = useState(() => str(initialCategoriaId));
  const [subIds, setSubIds] = useState<string[]>(() => [...initialSubcategoriaIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTaxonomiaLoading(true);
      setTaxonomiaError("");
      try {
        const res = await fetch("/api/admin/taxonomia-moderacion");
        const data = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        if (!res.ok || data.ok === false) {
          setTaxonomiaError(str(data.error) || "No se pudo cargar la taxonomía.");
          setTaxonomia(null);
          return;
        }
        setTaxonomia({
          categorias: Array.isArray(data.categorias) ? (data.categorias as CategoriaMod[]) : [],
          subcategorias: Array.isArray(data.subcategorias)
            ? (data.subcategorias as SubcategoriaMod[])
            : [],
        });
      } catch {
        if (!cancelled) setTaxonomiaError("Error de red al cargar taxonomía.");
      } finally {
        if (!cancelled) setTaxonomiaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!taxonomia) return;
    const next = sanitizeRevisionClasificacion(initialCategoriaId, initialSubcategoriaIds, taxonomia);
    setCategoriaId(next.categoriaId);
    setSubIds(next.subIds);
    // Solo al cargar el catálogo: alinear borrador con subcategorías válidas para la categoría.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial* fijos para esta vista
  }, [taxonomia]);

  const onCategoriaChange = useCallback(
    (nueva: string) => {
      const cat = str(nueva);
      setCategoriaId(cat);
      if (!taxonomia) {
        setSubIds([]);
        return;
      }
      const allowed = new Set(
        taxonomia.subcategorias
          .filter((sc) => str(sc.categoria_id) === cat)
          .map((sc) => str(sc.id))
      );
      setSubIds((prev) => prev.map((x) => str(x)).filter((id) => allowed.has(id)));
    },
    [taxonomia]
  );

  const toggleSubcategoria = useCallback((subId: string) => {
    const sid = str(subId);
    setSubIds((prev) => {
      const norm = prev.map((x) => str(x));
      return norm.includes(sid) ? norm.filter((x) => x !== sid) : [...norm, sid];
    });
  }, []);

  const subsFiltradas = useMemo(() => {
    if (!taxonomia || !str(categoriaId)) return [];
    return taxonomia.subcategorias.filter((sc) => str(sc.categoria_id) === str(categoriaId));
  }, [taxonomia, categoriaId]);

  async function aprobar() {
    setLoading("aprobar");
    setMessage("");
    setError("");
    try {
      const selectedSubcategoriaIds = subIds.map((x) => str(x)).filter(Boolean);
      if (process.env.NEXT_PUBLIC_REVISION_TAXONOMIA_DEBUG === "1") {
        // eslint-disable-next-line no-console
        console.log("[revision-taxonomia-debug] submit cliente", {
          postulacionId,
          categoria_final: str(categoriaId),
          selectedSubcategoriaIds,
        });
      }
      if (process.env.NEXT_PUBLIC_REVISION_LOCAL_DEBUG === "1") {
        // eslint-disable-next-line no-console
        console.log("[revision-local-debug][client]", {
          postulacionId,
          payload_enviado: {
            revision_publicar: true,
            categoria_final: str(categoriaId),
            subcategorias_ids: selectedSubcategoriaIds,
          },
          nota: "Esta vista no edita modalidades; no se envían modalidades_atencion en el submit.",
        });
      }
      const res = await fetch(`/api/admin/postulaciones/${encodeURIComponent(postulacionId)}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision_publicar: true,
          categoria_final: str(categoriaId),
          subcategorias_ids: selectedSubcategoriaIds,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "No se pudo aprobar.");
      }
      setMessage(data.message || "Aprobado. La ficha quedó publicada en el sitio.");
      router.push("/admin/emprendimientos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aprobar.");
    } finally {
      setLoading(null);
    }
  }

  async function rechazar() {
    if (
      !window.confirm(
        "¿Rechazar esta revisión? La ficha volverá a estado publicado sin aplicar otra vez los datos del borrador."
      )
    ) {
      return;
    }
    setLoading("rechazar");
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/admin/revision/${encodeURIComponent(postulacionId)}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "No se pudo rechazar.");
      }
      setMessage(data.message || "Revisión rechazada.");
      router.push("/admin/emprendimientos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al rechazar.");
    } finally {
      setLoading(null);
    }
  }

  const estadoOk = estadoPostulacion === "aprobada";
  const tipoNuevo = tipoPostulacion === "nuevo";
  const tipoEdicion = tipoPostulacion === "edicion_publicado";
  const tieneEmp = Boolean(emprendedorId);

  const basePublicar = estadoOk && (tipoNuevo || (tipoEdicion && tieneEmp));
  const taxonomiaLista = Boolean(taxonomia) && !taxonomiaLoading && !taxonomiaError;
  const categoriaAsignada = Boolean(str(categoriaId));
  const tieneSubcategorias = subIds.map((x) => str(x)).filter(Boolean).length > 0;

  const puedePublicar =
    basePublicar && taxonomiaLista && categoriaAsignada && tieneSubcategorias;
  const puedeRechazar = estadoOk && tipoEdicion && tieneEmp;

  const approveLabel = tipoNuevo ? "Publicar emprendimiento" : "Aprobar cambios y publicar";
  const approveLoadingLabel = tipoNuevo ? "Publicando…" : "Aprobando…";

  let publicarBloqueadoDetalle: ReactNode = null;
  if (!puedePublicar) {
    if (!basePublicar) {
      if (!estadoOk) {
        publicarBloqueadoDetalle = (
          <>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              La postulación aún no está aprobada.
            </div>
            <div style={{ fontSize: 13, color: "#92400e" }}>
              Cuando el estado sea <strong>aprobada</strong>, podrás publicar el emprendimiento nuevo o aplicar y
              publicar una edición desde esta pantalla. La aprobación inicial se gestiona en{" "}
              <Link href="/admin/pendientes" style={{ fontWeight: 800, color: "#b45309", textDecoration: "underline" }}>
                Moderación de postulaciones
              </Link>
              .
            </div>
          </>
        );
      } else if (tipoEdicion && !tieneEmp) {
        publicarBloqueadoDetalle = (
          <>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              No se puede publicar esta edición sin emprendedor vinculado.
            </div>
            <div style={{ fontSize: 13, color: "#92400e" }}>
              El tipo <strong>edicion_publicado</strong> requiere un <code>emprendedor_id</code> en la postulación
              para aplicar cambios a la ficha existente. Revisá los datos en administración o en base de datos.
            </div>
          </>
        );
      } else {
        publicarBloqueadoDetalle = (
          <>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Este tipo de postulación no se publica desde revisión de cambios.
            </div>
            <div style={{ fontSize: 13, color: "#92400e" }}>
              Tipo actual: <code>{tipoPostulacion || "—"}</code>. Solo <strong>nuevo</strong> (aprobada) o{" "}
              <strong>edicion_publicado</strong> (aprobada, con emprendedor) pueden publicarse acá.
            </div>
          </>
        );
      }
    } else if (taxonomiaLoading) {
      publicarBloqueadoDetalle = (
        <div style={{ fontWeight: 700 }}>Cargando catálogo de categorías y subcategorías…</div>
      );
    } else if (taxonomiaError) {
      publicarBloqueadoDetalle = (
        <>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>No se pudo cargar la taxonomía.</div>
          <div style={{ fontSize: 13, color: "#92400e" }}>{taxonomiaError}</div>
        </>
      );
    } else if (!categoriaAsignada) {
      publicarBloqueadoDetalle = (
        <div style={{ fontWeight: 800 }}>Debes asignar una categoría antes de publicar.</div>
      );
    } else if (!tieneSubcategorias) {
      publicarBloqueadoDetalle = (
        <div style={{ fontWeight: 800 }}>
          Debes elegir al menos una subcategoría de la categoría seleccionada antes de publicar.
        </div>
      );
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => router.push("/admin/emprendimientos")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 700,
            color: "#1e40af",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 10,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          ← Volver a emprendimientos
        </button>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 20,
          background: "#fff",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#111827" }}>
          {nombrePostulacion || "Sin nombre"}
        </h2>
        <div style={{ fontSize: 13, color: "#6b7280", display: "grid", gap: 4, marginBottom: 20 }}>
          <div>
            Postulación (borrador): <code>{postulacionId}</code>
          </div>
          <div>Estado postulación: {estadoPostulacion || "—"}</div>
          <div>Tipo: {tipoPostulacion || "—"}</div>
          {emprendedorId ? (
            <div>
              Emprendedor: <code>{emprendedorId}</code>
              {emprendedorSlug ? (
                <>
                  {" "}
                  (slug: <code>{emprendedorSlug}</code>)
                </>
              ) : null}
            </div>
          ) : (
            <div>Sin emprendedor vinculado (alta nueva)</div>
          )}
        </div>

        <fieldset
          disabled={!taxonomiaLista || taxonomiaLoading}
          style={{
            margin: "0 0 20px 0",
            padding: 16,
            borderRadius: 14,
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
          }}
        >
          <legend
            style={{
              fontWeight: 800,
              fontSize: 13,
              color: "#3730a3",
              padding: "0 8px",
            }}
          >
            Clasificación (admin)
          </legend>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4c1d95", lineHeight: 1.5 }}>
            Definí la categoría y las subcategorías que se guardarán al publicar. Solo se listan subcategorías del
            rubro elegido.
          </p>

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "#4338ca",
              marginBottom: 6,
            }}
          >
            Categoría <span style={{ color: "#b91c1c" }}>*</span>
          </label>
          <select
            value={categoriaId}
            onChange={(e) => onCategoriaChange(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 420,
              height: 40,
              borderRadius: 10,
              border: "1px solid #a5b4fc",
              padding: "0 12px",
              fontSize: 15,
              background: "#fff",
            }}
          >
            <option value="">Seleccionar categoría…</option>
            {(taxonomia?.categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 14 }}>
            <span
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#4338ca",
                marginBottom: 6,
              }}
            >
              Subcategorías <span style={{ color: "#b91c1c" }}>*</span>
            </span>
            {!str(categoriaId) ? (
              <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                Elige una categoría para ver las subcategorías.
              </p>
            ) : subsFiltradas.length === 0 ? (
              <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                No hay subcategorías en catálogo para esta categoría.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  margin: "10px 0 0 0",
                  padding: 0,
                  display: "grid",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {subsFiltradas.map((sc) => {
                  const checked = subIds.map((x) => str(x)).includes(str(sc.id));
                  return (
                    <li key={sc.id} style={{ margin: 0 }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSubcategoria(sc.id)}
                        />
                        <span>{sc.nombre}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#3730a3",
                  marginBottom: 8,
                }}
              >
                Seleccionadas
              </div>
              {subIds.map((x) => str(x)).filter(Boolean).length === 0 ? (
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Aún no seleccionaste subcategorías
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {subIds
                    .map((x) => str(x))
                    .filter(Boolean)
                    .map((id) => {
                      const nombre =
                        taxonomia?.subcategorias?.find((sc) => str(sc.id) === id)?.nombre ??
                        "Subcategoría";
                      return (
                        <span
                          key={id}
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "5px 10px",
                            borderRadius: 999,
                            background: "#e0e7ff",
                            color: "#3730a3",
                            border: "1px solid #c7d2fe",
                          }}
                        >
                          {nombre}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fff",
              border: "1px solid #e0e7ff",
              fontSize: 13,
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6, color: "#334155" }}>Referencia</div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              Lo propuesto en el borrador; si ahí no viene rubro, se muestra la clasificación vigente en la ficha
              publicada.
            </p>
            <div>
              <strong>Categoría:</strong> {referenciaCategoriaNombre || "—"}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>Subcategorías:</strong> {referenciaSubcategoriasTexto || "—"}
            </div>
          </div>
        </fieldset>

        <RevisionActions
          puedePublicar={puedePublicar}
          puedeRechazar={puedeRechazar}
          approveLabel={approveLabel}
          approveLoadingLabel={approveLoadingLabel}
          loading={loading}
          onAprobar={() => void aprobar()}
          onRechazar={() => void rechazar()}
          publicarBloqueadoDetalle={publicarBloqueadoDetalle}
          mostrarNotaRechazar
        />
      </div>

      {message ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {tieneCambiosCriticos ? (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 12,
            background: "#fffbeb",
            border: "2px solid #f59e0b",
            color: "#92400e",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>Cambios detectados</div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            Hay modificaciones en <strong>categoría</strong>, <strong>galería</strong> y/o{" "}
            <strong>WhatsApp</strong>. Revisá con prioridad antes de aprobar.
          </div>
        </div>
      ) : null}

      {resumenCambios.length > 0 ? (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 14, color: "#1e293b", marginBottom: 10 }}>
            Cambios detectados:
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#334155", fontSize: 13, lineHeight: 1.6 }}>
            {resumenCambios.map((label, idx) => (
              <li key={`${idx}-${label}`}>{label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 12,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          No se registran diferencias respecto a la ficha actual en los campos comparados.
        </div>
      )}

      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: "#111827" }}>
        Detalle por campo
      </h3>

      <div style={{ display: "grid", gap: 16 }}>
        {fields.map((row) => (
          <FieldBlock key={row.key} row={row} />
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: "#64748b", marginBottom: 12 }}>
          Acciones
        </div>
        <RevisionActions
          puedePublicar={puedePublicar}
          puedeRechazar={puedeRechazar}
          approveLabel={approveLabel}
          approveLoadingLabel={approveLoadingLabel}
          loading={loading}
          onAprobar={() => void aprobar()}
          onRechazar={() => void rechazar()}
          publicarBloqueadoDetalle={publicarBloqueadoDetalle}
          mostrarNotaRechazar={false}
        />
      </div>
    </div>
  );
}
