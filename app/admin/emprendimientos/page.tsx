import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AdminEmprendimientosClient from "@/components/admin/AdminEmprendimientosClient";
import { adminPlanUiFromEmpRow } from "@/lib/adminEmprendimientoPlanUi";
import {
  categoriaIdEmprendedorRow,
  mapCategoriasByIdForEmprendedorRows,
  mapComunasByIdForEmprendedorRows,
} from "@/lib/adminEmprendedoresComunaLookup";
import { mapEmprendedorIdToRevisionPostulacionId } from "@/lib/loadAdminRevision";

export const dynamic = "force-dynamic";

type EstadoFiltroPage = "todos" | "en_revision" | "publicado" | "suspendido";

function parseEstadoFiltro(raw: string | string[] | undefined): EstadoFiltroPage {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "en_revision" || s === "publicado" || s === "suspendido") return s;
  return "todos";
}

/** SELECT actual de esta página (sin embeds; comunas/categorías en 2ª query). */
const EMPRENDEDORES_ADMIN_SELECT = `
      id,
      nombre_emprendimiento,
      slug,
      estado_publicacion,
      updated_at,
      categoria_id,
      comuna_id
    ` as const;

/** Esta BD no expone `emprendedores.comuna_base_id`; solo `comuna_id`. */
function comunaIdDesdeRowAdmin(r: Record<string, unknown>): string | null {
  const raw = r.comuna_id;
  if (raw == null || raw === "") return null;
  return String(raw);
}

function createSupabaseAdminForServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    );
  }
  return getSupabaseAdmin({ supabaseUrl: url, serviceRoleKey: key });
}

function serializePostgrestError(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== "object") {
    return { raw: String(err) };
  }
  const e = err as Record<string, unknown>;
  return {
    message: e.message ?? null,
    details: e.details ?? null,
    hint: e.hint ?? null,
    code: e.code ?? null,
  };
}

type PageProps = {
  searchParams?: Promise<{ estado?: string }>;
};

export default async function AdminEmprendimientosPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const estadoFiltro = parseEstadoFiltro(sp.estado);

  const supabase = createSupabaseAdminForServer();

  let q = supabase
    .from("emprendedores")
    .select(EMPRENDEDORES_ADMIN_SELECT)
    .order("updated_at", { ascending: false });

  if (estadoFiltro === "todos") {
    q = q.in("estado_publicacion", [
      "publicado",
      "suspendido",
      "en_revision",
      "borrador",
      "rechazado",
    ]);
  } else {
    q = q.eq("estado_publicacion", estadoFiltro);
  }

  const { data, error } = await q;

  if (error) {
    const diag = serializePostgrestError(error);
    console.error(
      "[admin/emprendimientos] PostgREST error — SELECT emprendedores:",
      EMPRENDEDORES_ADMIN_SELECT.trim(),
      "\nParsed:",
      JSON.stringify(diag, null, 2)
    );
  }

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const comunaMap = await mapComunasByIdForEmprendedorRows(supabase, rawRows);
  const categoriaMap = await mapCategoriasByIdForEmprendedorRows(
    supabase,
    rawRows
  );

  const enRevisionIds = rawRows
    .filter((r) => String(r.estado_publicacion ?? "").trim() === "en_revision")
    .map((r) => String(r.id ?? "").trim())
    .filter(Boolean);
  const revisionPostMap = await mapEmprendedorIdToRevisionPostulacionId(supabase, enRevisionIds);

  const items = rawRows.map((r) => {
    const cid = comunaIdDesdeRowAdmin(r);
    const comunaRow = cid ? comunaMap.get(cid) : undefined;
    const comunasForUi = comunaRow
      ? { nombre: comunaRow.nombre, slug: comunaRow.slug }
      : null;

    const catId = categoriaIdEmprendedorRow(r);
    const catRow = catId ? categoriaMap.get(catId) : undefined;
    const categoriasForUi = catRow
      ? { nombre: catRow.nombre, slug: catRow.slug }
      : null;

    const empId = String(r.id ?? "").trim();
    const revPid =
      String(r.estado_publicacion ?? "").trim() === "en_revision"
        ? revisionPostMap.get(empId) ?? null
        : null;

    return {
      id: empId,
      nombre: String(r.nombre_emprendimiento ?? "").trim() || "—",
      slug: String(r.slug ?? "").trim(),
      estado_publicacion:
        r.estado_publicacion != null ? String(r.estado_publicacion) : null,
      plan: adminPlanUiFromEmpRow(r),
      updated_at: r.updated_at != null ? String(r.updated_at) : null,
      comunas: comunasForUi,
      categorias: categoriasForUi,
      revisionPostulacionId: revPid,
    };
  });

  if (estadoFiltro === "en_revision") {
    items.sort((a, b) => {
      const aHas = a.revisionPostulacionId ? 1 : 0;
      const bHas = b.revisionPostulacionId ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
  }

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1
          style={{
            margin: "0 0 20px 0",
            fontSize: 34,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Admin · Emprendimientos
        </h1>

        {error ? (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 16,
              padding: 16,
              fontFamily: "ui-monospace, monospace",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Error cargando emprendedores (PostgREST)
            </div>
            <div style={{ marginBottom: 10 }}>{error.message}</div>
            <div style={{ opacity: 0.85, marginBottom: 8 }}>SELECT usado:</div>
            <pre
              style={{
                margin: "0 0 12px",
                padding: 10,
                background: "#fff",
                borderRadius: 8,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {EMPRENDEDORES_ADMIN_SELECT.trim()}
            </pre>
            <div style={{ opacity: 0.85, marginBottom: 8 }}>Detalle parseado:</div>
            <pre
              style={{
                margin: 0,
                padding: 10,
                background: "#fff",
                borderRadius: 8,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(serializePostgrestError(error), null, 2)}
            </pre>
            <p style={{ margin: "12px 0 0", fontFamily: "inherit", color: "#7f1d1d" }}>
              Revisa la terminal del servidor: log{" "}
              <code>[admin/emprendimientos] PostgREST error</code>.
            </p>
          </div>
        ) : (
          <AdminEmprendimientosClient initialItems={items} estadoFiltro={estadoFiltro} />
        )}
      </section>
    </main>
  );
}
