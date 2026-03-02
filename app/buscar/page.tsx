// app/buscar/page.tsx
import Link from "next/link";

type SearchParams = {
  q?: string;
  comuna?: string;
  regionId?: string;
  page?: string;
  k?: string;
  onlyLocal?: string;
  allowRegional?: string;
  allowNational?: string;
  debug?: string;
};

function toBool(v: string | undefined, fallback: boolean) {
  if (v === undefined) return fallback;
  return v === "1" || v === "true";
}

function buildQS(sp: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (v === "") continue;
    params.set(k, v);
  }
  return params.toString();
}

function badgeForTier(tier: string | null | undefined) {
  // tier viene por item como: local_base | atiende_comuna | regional | nacional
  const t = tier ?? "";
  if (t === "local_base") return { label: "Local", className: "bg-green-100 text-green-800" };
  if (t === "atiende_comuna") return { label: "Cubre tu comuna", className: "bg-emerald-100 text-emerald-800" };
  if (t === "regional") return { label: "Regional", className: "bg-blue-100 text-blue-800" };
  if (t === "nacional") return { label: "Nacional", className: "bg-purple-100 text-purple-800" };
  return { label: "Otro", className: "bg-gray-100 text-gray-800" };
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q = sp.q ?? "";
  const comuna = sp.comuna ?? "";
  const regionId = sp.regionId ?? "";

  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);
  const k = Math.max(1, Math.min(48, parseInt(sp.k ?? "12", 10) || 12));

  // Toggles (defaults pensados para etapa inicial)
  const onlyLocal = toBool(sp.onlyLocal, false);
  const allowRegional = toBool(sp.allowRegional, true);
  const allowNational = toBool(sp.allowNational, true);

  const debug = sp.debug ?? "0";

  const apiQS = buildQS({
    q,
    comuna,
    regionId,
    page: String(page),
    k: String(k),
    onlyLocal: onlyLocal ? "1" : "0",
    allowRegional: allowRegional ? "1" : "0",
    allowNational: allowNational ? "1" : "0",
    debug, // déjalo en 0 para usuario final
  });

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/buscar?${apiQS}`, {
    cache: "no-store",
  });

  const data = await res.json();

  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const total: number = typeof data?.total === "number" ? data.total : items.length;

  const hasPrev = page > 0;
  const hasNext = (page + 1) * k < total;

  const baseQS = (overrides: Partial<Record<keyof SearchParams, string>>) =>
    buildQS({
      q,
      comuna,
      regionId,
      k: String(k),
      onlyLocal: onlyLocal ? "1" : "0",
      allowRegional: allowRegional ? "1" : "0",
      allowNational: allowNational ? "1" : "0",
      debug,
      ...overrides,
    });

  return (
    <main style={{ padding: 28, fontFamily: "system-ui", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>Búsqueda</h1>

      {/* CONTROLES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          padding: 14,
          border: "1px solid #eee",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <form style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Qué buscas (ej: gasfiter)"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
          <input
            name="comuna"
            defaultValue={comuna}
            placeholder="comuna (slug) ej: calera-de-tango"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
          <input
            name="regionId"
            defaultValue={regionId}
            placeholder="regionId (uuid)"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />

          {/* Mantener toggles/paginación al buscar */}
          <input type="hidden" name="k" value={String(k)} />
          <input type="hidden" name="page" value="0" />
          <input type="hidden" name="onlyLocal" value={onlyLocal ? "1" : "0"} />
          <input type="hidden" name="allowRegional" value={allowRegional ? "1" : "0"} />
          <input type="hidden" name="allowNational" value={allowNational ? "1" : "0"} />
          <input type="hidden" name="debug" value={debug} />

          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Buscar
          </button>
        </form>

        {/* TOGGLES */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href={`/buscar?${baseQS({ onlyLocal: onlyLocal ? "0" : "1", page: "0" })}`}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              textDecoration: "none",
              color: "black",
              background: onlyLocal ? "#111" : "white",
              colorScheme: "light",
              color: onlyLocal ? "white" : "black",
            }}
          >
            {onlyLocal ? "✅ Solo local" : "⬜ Solo local"}
          </Link>

          <Link
            href={`/buscar?${baseQS({ allowRegional: allowRegional ? "0" : "1", page: "0" })}`}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              textDecoration: "none",
              background: allowRegional ? "#111" : "white",
              color: allowRegional ? "white" : "black",
            }}
          >
            {allowRegional ? "✅ Incluir regional" : "⬜ Incluir regional"}
          </Link>

          <Link
            href={`/buscar?${baseQS({ allowNational: allowNational ? "0" : "1", page: "0" })}`}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              textDecoration: "none",
              background: allowNational ? "#111" : "white",
              color: allowNational ? "white" : "black",
            }}
          >
            {allowNational ? "✅ Incluir nacional" : "⬜ Incluir nacional"}
          </Link>

          <span style={{ opacity: 0.7 }}>
            Mostrando <b>{items.length}</b> de <b>{total}</b> (página {page + 1})
          </span>

          <span style={{ opacity: 0.7 }}>
            Capa usada: <b>{String(data?.scope_used ?? "-")}</b>
          </span>
        </div>
      </div>

      {/* GRID 12 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {items.map((it, idx) => {
          const b = badgeForTier(it?.tier);
          return (
            <div
              key={it?.id ?? it?.objectID ?? idx}
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 12,
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {it?.nombre ?? it?.name ?? "Sin nombre"}
                </div>
                <span
                  className=""
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: b.className.includes("bg-green-100")
                      ? "#dcfce7"
                      : b.className.includes("bg-emerald-100")
                      ? "#d1fae5"
                      : b.className.includes("bg-blue-100")
                      ? "#dbeafe"
                      : b.className.includes("bg-purple-100")
                      ? "#ede9fe"
                      : "#f3f4f6",
                    color: b.className.includes("text-green-800")
                      ? "#166534"
                      : b.className.includes("text-emerald-800")
                      ? "#065f46"
                      : b.className.includes("text-blue-800")
                      ? "#1e40af"
                      : b.className.includes("text-purple-100") || b.className.includes("text-purple-800")
                      ? "#5b21b6"
                      : "#374151",
                  }}
                >
                  {b.label}
                </span>
              </div>

              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {it?.descripcion_corta ?? it?.descripcion ?? it?.descripcion_larga ?? ""}
              </div>

              <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.7 }}>
                comuna base: <b>{it?.comuna_base_slug ?? "-"}</b> · región:{" "}
                <b>{Array.isArray(it?.region_nombres) ? it.region_nombres.join(", ") : "-"}</b>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINACIÓN */}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <Link
          href={`/buscar?${baseQS({ page: String(Math.max(0, page - 1)) })}`}
          style={{
            pointerEvents: hasPrev ? "auto" : "none",
            opacity: hasPrev ? 1 : 0.35,
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 10,
            textDecoration: "none",
            color: "black",
          }}
        >
          ← Anterior
        </Link>

        <Link
          href={`/buscar?${baseQS({ page: String(page + 1) })}`}
          style={{
            pointerEvents: hasNext ? "auto" : "none",
            opacity: hasNext ? 1 : 0.35,
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 10,
            textDecoration: "none",
            color: "black",
          }}
        >
          Siguiente →
        </Link>
      </div>

      {/* DEBUG opcional */}
      {debug === "1" ? (
        <pre style={{ marginTop: 18, padding: 12, background: "#f8fafc", borderRadius: 12, overflow: "auto" }}>
          {JSON.stringify(data?.debug ?? data, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}