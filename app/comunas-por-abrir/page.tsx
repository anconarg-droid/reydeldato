import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 0;

type ComunaRow = {
  region_id?: string | number | null;
  region_nombre?: string | null;
  comuna_id?: string | number | null;
  comuna_nombre: string;
  comuna_slug: string;
  total_emprendedores: number | null;
  avance_porcentaje: number | null;
};

function getEstadoDesdeAvance(avance: number) {
  if (avance >= 100) {
    return {
      emoji: "🟢",
      label: "Activa",
      bg: "#ecfdf5",
      border: "#86efac",
      text: "#166534",
    };
  }

  if (avance >= 70) {
    return {
      emoji: "🟠",
      label: "Lista para abrir",
      bg: "#fff7ed",
      border: "#fdba74",
      text: "#9a3412",
    };
  }

  if (avance >= 15) {
    return {
      emoji: "🟡",
      label: "En proceso",
      bg: "#fefce8",
      border: "#fde047",
      text: "#854d0e",
    };
  }

  return {
    emoji: "🔒",
    label: "Sin movimiento",
    bg: "#f9fafb",
    border: "#d1d5db",
    text: "#4b5563",
  };
}

function groupByRegion(items: ComunaRow[]) {
  const map = new Map<
    string,
    { region_nombre: string; items: ComunaRow[] }
  >();

  for (const item of items) {
    const key =
      String(item.region_id ?? "") ||
      item.region_nombre ||
      "sin-region";

    const regionNombre = item.region_nombre || "Sin región";

    if (!map.has(key)) {
      map.set(key, {
        region_nombre: regionNombre,
        items: [],
      });
    }

    map.get(key)!.items.push(item);
  }

  return Array.from(map.entries())
    .map(([regionKey, value]) => ({
      region_key: regionKey,
      region_nombre: value.region_nombre,
      items: value.items.sort((a, b) => {
        const avanceA = Number(a.avance_porcentaje || 0);
        const avanceB = Number(b.avance_porcentaje || 0);

        if (avanceB !== avanceA) return avanceB - avanceA;

        const empA = Number(a.total_emprendedores || 0);
        const empB = Number(b.total_emprendedores || 0);

        if (empB !== empA) return empB - empA;

        return a.comuna_nombre.localeCompare(b.comuna_nombre, "es");
      }),
    }))
    .sort((a, b) => a.region_nombre.localeCompare(b.region_nombre, "es"));
}

function getWhatsappShareHref(comunaNombre: string, comunaSlug: string) {
  const url = `http://localhost:3000/abrir-comuna/${comunaSlug}`;
  const text = encodeURIComponent(
    `Ayúdanos a activar ${comunaNombre} en Rey del Dato. Mira el avance y comparte esta página: ${url}`
  );
  return `https://wa.me/?text=${text}`;
}

export default async function ComunasPorAbrirPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vw_regiones_comunas_detalle")
    .select("*")
    .order("avance_porcentaje", { ascending: false });

  if (error) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Comunas en activación</h1>

        <div style={errorStyle}>
          No se pudieron cargar las comunas por abrir: {error.message}
        </div>
      </main>
    );
  }

  const rows: ComunaRow[] = ((data as ComunaRow[] | null) || []).map((row) => ({
    ...row,
    total_emprendedores: Number(row.total_emprendedores || 0),
    avance_porcentaje: Number(row.avance_porcentaje || 0),
  }));

  const totalComunas = rows.length;
  const totalActivas = rows.filter(
    (x) => Number(x.avance_porcentaje || 0) >= 100
  ).length;
  const totalListas = rows.filter((x) => {
    const avance = Number(x.avance_porcentaje || 0);
    return avance >= 70 && avance < 100;
  }).length;
  const totalProceso = rows.filter((x) => {
    const avance = Number(x.avance_porcentaje || 0);
    return avance >= 15 && avance < 70;
  }).length;
  const totalEmprendedores = rows.reduce(
    (acc, row) => acc + Number(row.total_emprendedores || 0),
    0
  );

  const grouped = groupByRegion(rows);
  const topRows = [...rows].slice(0, 8);

  return (
    <main style={pageStyle}>
      <section style={{ marginBottom: 28 }}>
        <h1 style={titleStyle}>Comunas en activación</h1>

        <p style={subtitleStyle}>
          Rey del Dato se está expandiendo por comunas. Aquí puedes ver cuáles
          ya están activas, cuáles están cerca de abrir y cuáles todavía
          necesitan más movimiento.
        </p>
      </section>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{totalComunas}</div>
          <div style={summaryLabelStyle}>Comunas monitoreadas</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{totalActivas}</div>
          <div style={summaryLabelStyle}>Comunas activas</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{totalListas}</div>
          <div style={summaryLabelStyle}>Listas para abrir</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{totalProceso}</div>
          <div style={summaryLabelStyle}>En proceso</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{totalEmprendedores}</div>
          <div style={summaryLabelStyle}>Emprendedores registrados</div>
        </div>
      </section>

      <section style={{ marginBottom: 34 }}>
        <h2 style={sectionTitleStyle}>Más cerca de abrir</h2>

        <div style={{ display: "grid", gap: 14 }}>
          {topRows.map((row) => {
            const avance = Number(row.avance_porcentaje || 0);
            const estado = getEstadoDesdeAvance(avance);

            return (
              <article
                key={row.comuna_slug}
                style={{
                  ...cardStyle,
                  borderColor: estado.border,
                  background: estado.bg,
                }}
              >
                <div style={cardTopStyle}>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        color: estado.text,
                        fontWeight: 800,
                      }}
                    >
                      {estado.emoji} {estado.label}
                    </div>

                    <h3 style={cardTitleStyle}>{row.comuna_nombre}</h3>

                    <div style={cardMetaStyle}>
                      {row.region_nombre || "Sin región"}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={progressBigStyle}>{avance}%</div>
                    <div style={progressSmallStyle}>avance de activación</div>
                  </div>
                </div>

                <div style={trackStyle}>
                  <div
                    style={{
                      ...fillStyle,
                      width: `${Math.max(0, Math.min(100, avance))}%`,
                    }}
                  />
                </div>

                <div style={detailRowStyle}>
                  <span>{Number(row.total_emprendedores || 0)} emprendimientos</span>
                  <span>{avance >= 100 ? "comuna activa" : "comuna en expansión"}</span>
                </div>

                <div style={buttonRowStyle}>
                  <Link
                    href={`/abrir-comuna/${row.comuna_slug}`}
                    style={darkBtnStyle}
                  >
                    Ver avance
                  </Link>

                  <a
                    href={getWhatsappShareHref(row.comuna_nombre, row.comuna_slug)}
                    target="_blank"
                    rel="noreferrer"
                    style={greenBtnStyle}
                  >
                    Compartir
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 style={sectionTitleStyle}>Por región</h2>

        <div style={{ display: "grid", gap: 24 }}>
          {grouped.map((region) => (
            <section key={region.region_key} style={regionBoxStyle}>
              <div style={{ marginBottom: 14 }}>
                <h3 style={regionTitleStyle}>{region.region_nombre}</h3>
                <div style={regionMetaStyle}>
                  {region.items.length} comunas en seguimiento
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {region.items.map((row) => {
                  const avance = Number(row.avance_porcentaje || 0);
                  const estado = getEstadoDesdeAvance(avance);

                  return (
                    <article
                      key={row.comuna_slug}
                      style={{
                        ...miniRowStyle,
                        borderColor: estado.border,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: estado.text,
                            marginBottom: 2,
                          }}
                        >
                          {estado.emoji} {estado.label}
                        </div>

                        <div style={miniRowTitleStyle}>{row.comuna_nombre}</div>

                        <div style={miniRowMetaStyle}>
                          {Number(row.total_emprendedores || 0)} emprendimientos
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={miniRowPercentStyle}>{avance}%</div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            href={`/abrir-comuna/${row.comuna_slug}`}
                            style={miniDarkBtnStyle}
                          >
                            Ver
                          </Link>

                          <a
                            href={getWhatsappShareHref(
                              row.comuna_nombre,
                              row.comuna_slug
                            )}
                            target="_blank"
                            rel="noreferrer"
                            style={miniGreenBtnStyle}
                          >
                            Compartir
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "36px 20px 60px",
};

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  fontWeight: 900,
  lineHeight: 1.05,
  margin: "0 0 10px",
  color: "#111827",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.65,
  color: "#4b5563",
  maxWidth: 850,
  margin: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  margin: "0 0 16px",
  color: "#111827",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0,1fr))",
  gap: 14,
  marginBottom: 34,
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
};

const summaryNumberStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1,
};

const summaryLabelStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#6b7280",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 18,
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14,
};

const cardTitleStyle: React.CSSProperties = {
  margin: "4px 0 4px",
  fontSize: 24,
  fontWeight: 900,
  color: "#111827",
};

const cardMetaStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
};

const progressBigStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1,
};

const progressSmallStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#6b7280",
};

const trackStyle: React.CSSProperties = {
  width: "100%",
  height: 12,
  borderRadius: 999,
  background: "#e5e7eb",
  overflow: "hidden",
  marginBottom: 12,
};

const fillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "#111827",
};

const detailRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  fontSize: 14,
  color: "#4b5563",
  marginBottom: 14,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const darkBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
};

const greenBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
};

const regionBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 18,
  background: "#fff",
};

const regionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  margin: 0,
  color: "#111827",
};

const regionMetaStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  color: "#6b7280",
};

const miniRowStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  background: "#fafafa",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
};

const miniRowTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#111827",
};

const miniRowMetaStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  color: "#6b7280",
};

const miniRowPercentStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 8,
};

const miniDarkBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 10,
  background: "#111827",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
};

const miniGreenBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 10,
  background: "#22c55e",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 14,
  padding: 16,
};