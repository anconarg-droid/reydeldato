import Link from "next/link";
import type { AdminAperturaComunaDetalle } from "@/lib/loadAdminAperturaComuna";

function badgeEstado(estado: "completo" | "faltante") {
  const ok = estado === "completo";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b",
      }}
    >
      {ok ? "Completo" : "Faltante"}
    </span>
  );
}

export default function AdminAperturaComunaDetalleView({
  data,
}: {
  data: AdminAperturaComunaDetalle;
}) {
  const pct =
    data.porcentaje_apertura != null ? `${data.porcentaje_apertura.toFixed(1)}%` : "—";
  const metaLine =
    data.total_cumplido != null && data.total_requerido != null
      ? `${data.total_cumplido} / ${data.total_requerido} — rubros de apertura con mínimo cumplido vs rubros requeridos (vista pública)`
      : "—";

  const nListado = data.emprendedores.length;
  const zSinRubroClave = data.emprendedores_sin_rubro_apertura.length;
  const yConRubroClave = nListado - zSinRubroClave;
  const xTotalVista = data.total_cumplido;
  const listadoCoincideConVista =
    xTotalVista == null || nListado === xTotalVista || nListado === 0;

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/admin/apertura-comunas"
            style={{ fontSize: 14, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
          >
            ← Todas las comunas
          </Link>
          <Link
            href="/admin/comunas"
            style={{ fontSize: 14, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
          >
            Admin comunas
          </Link>
          <Link href="/admin" style={{ fontSize: 14, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            Panel admin
          </Link>
        </div>

        <h1
          style={{
            margin: "0 0 8px 0",
            fontSize: 32,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Apertura · {data.comuna_nombre}
        </h1>
        <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#6b7280" }}>
          Slug: <code>{data.comuna_slug}</code>
          {data.region_slug ? (
            <>
              {" "}
              · Región: <code>{data.region_slug}</code>
            </>
          ) : null}
        </p>

        <div
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#fff",
            display: "grid",
            gap: 10,
            maxWidth: 640,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Resumen agregado</div>
          <div style={{ fontSize: 15, color: "#374151" }}>
            Porcentaje (vista pública): <strong>{pct}</strong>
          </div>
          <div style={{ fontSize: 15, color: "#374151" }}>
            <strong>{metaLine}</strong>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.55 }}>
            El porcentaje y la fracción de la vista pública miden <strong>rubros cumplidos / rubros requeridos</strong>{" "}
            (mínimo territorial por rubro de apertura). La tabla inferior desglosa cada rubro. El listado de
            emprendedores muestra <strong>oferta territorial</strong> (base, cobertura, regional, nacional): puede
            haber muchas fichas sin que el resumen X/Y suba, si aún faltan rubros por completar.
          </p>
        </div>

        {data.error ? (
          <div
            style={{
              border: "1px solid #fcd34d",
              background: "#fffbeb",
              color: "#92400e",
              borderRadius: 16,
              padding: 14,
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            Aviso al cargar datos: {data.error}
          </div>
        ) : null}

        <div
          style={{
            marginBottom: 22,
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid #e0e7ff",
            background: "#f5f7ff",
            maxWidth: 720,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a8a", marginBottom: 8 }}>
            Desglose rápido (sobre el listado cargado en esta página)
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.65,
            }}
          >
            <li>
              <strong>Total que atienden la comuna</strong> (vista pública):{" "}
              {xTotalVista != null ? <strong>{xTotalVista}</strong> : "—"}
            </li>
            <li>
              <strong>Cuentan para al menos un rubro clave</strong> (tienen subcategoría en{" "}
              <code>rubros_apertura</code>): <strong>{yConRubroClave}</strong>
            </li>
            <li>
              <strong>Atienden la comuna pero no aportan a ningún rubro clave</strong>:{" "}
              <strong>{zSinRubroClave}</strong>
            </li>
          </ul>
          {!listadoCoincideConVista ? (
            <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>
              Las dos últimas cifras salen del listado admin (máximo 500 filas). Si no suman exactamente el
              total de la vista, puede haber más emprendimientos fuera de ese listado.
            </p>
          ) : null}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px 0" }}>
          Rubros clave (meta de apertura)
        </h2>
        <p style={{ margin: "0 0 14px 0", fontSize: 14, color: "#6b7280", maxWidth: 720, lineHeight: 1.55 }}>
          Los rubros clave muestran solo los emprendimientos que sí cuentan para la meta de apertura, porque
          tienen subcategorías válidas dentro de los rubros definidos en la tabla{" "}
          <code>rubros_apertura</code>. Cada fila es un rubro distinto: el <strong>mínimo</strong> es cuántos
          negocios de ese tipo se piden, no una fracción del total global.
        </p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            background: "#fff",
            borderRadius: 18,
            overflow: "auto",
            marginBottom: 28,
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Rubro</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Actual</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Mínimo</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Faltan</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.rubros.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "#6b7280" }}>
                    Sin filas. Aplicá la migración <code>vw_admin_apertura_rubro_por_comuna</code> y
                    revisá <code>rubros_apertura</code>.
                  </td>
                </tr>
              ) : (
                data.rubros.map((r) => (
                  <tr key={r.subcategoria_slug} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                      {r.subcategoria_nombre}
                      <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, marginTop: 2 }}>
                        <code>{r.subcategoria_slug}</code>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>{r.empresas_con_este_rubro}</td>
                    <td style={{ padding: "10px 14px" }}>{r.minimo_requerido}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700 }}>{r.faltantes}</td>
                    <td style={{ padding: "10px 14px" }}>{badgeEstado(r.estado)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px 0" }}>
          Por rubro: emprendimientos que cuentan
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#6b7280", maxWidth: 720 }}>
          Solo aparecen negocios que <strong>atienden la comuna</strong> (misma regla que el listado
          público) <strong>y</strong> tienen esa subcategoría en la ficha.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {data.rubros.map((r) => (
            <div
              key={r.subcategoria_slug}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#fff",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "space-between",
                  background: "#fafafa",
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: "#111827" }}>{r.subcategoria_nombre}</span>
                  <span style={{ marginLeft: 8, fontSize: 13, color: "#6b7280" }}>
                    {r.empresas_con_este_rubro} actual / {r.minimo_requerido} mín. · {badgeEstado(r.estado)}
                  </span>
                </div>
              </div>
              {r.emprendedores.length === 0 ? (
                <div style={{ padding: 14, fontSize: 14, color: "#6b7280" }}>
                  Ningún emprendimiento con este rubro cuenta aún para esta comuna.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#fff", textAlign: "left" }}>
                      <th style={{ padding: "8px 14px", fontWeight: 700, color: "#374151" }}>Nombre</th>
                      <th style={{ padding: "8px 14px", fontWeight: 700, color: "#374151" }}>Slug</th>
                      <th style={{ padding: "8px 14px", fontWeight: 700, color: "#374151" }}>Cobertura (tipo)</th>
                      <th style={{ padding: "8px 14px", fontWeight: 700, color: "#374151" }}>
                        Por qué cuenta en la comuna
                      </th>
                      <th style={{ padding: "8px 14px", fontWeight: 700, color: "#374151" }}>Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.emprendedores.map((e) => (
                      <tr key={e.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 14px", fontWeight: 600 }}>{e.nombre}</td>
                        <td style={{ padding: "8px 14px", fontSize: 13, color: "#6b7280" }}>
                          {e.slug ? <code>{e.slug}</code> : "—"}
                        </td>
                        <td style={{ padding: "8px 14px", fontSize: 13 }}>{e.cobertura_tipo_declarada}</td>
                        <td style={{ padding: "8px 14px", maxWidth: 320, fontSize: 13 }}>{e.motivos_label}</td>
                        <td style={{ padding: "8px 14px" }}>
                          {e.slug ? (
                            <Link
                              href={`/emprendedor/${encodeURIComponent(e.slug)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                            >
                              Ver →
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#111827",
            margin: "36px 0 12px 0",
          }}
        >
          Cuentan para la comuna pero no para ningún rubro de apertura
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#6b7280", maxWidth: 720, lineHeight: 1.55 }}>
          Estos negocios <strong>sí atienden la comuna</strong> y por eso entran en el total general de la
          parte superior, pero <strong>no ayudan a completar la meta por rubros</strong> porque sus
          subcategorías no coinciden con ninguno de los rubros clave en <code>rubros_apertura</code>. Así se
          explica la diferencia entre el total territorial y el avance rubro por rubro (y por eso el
          porcentaje público puede subir sin completar cada rubro).
        </p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            background: "#fff",
            borderRadius: 18,
            overflow: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Nombre</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Slug</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Cobertura (tipo)</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Por qué cuenta en la comuna</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {data.emprendedores_sin_rubro_apertura.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "#6b7280" }}>
                    No hay casos en el listado actual (o todos calzan al menos un rubro clave).
                  </td>
                </tr>
              ) : (
                data.emprendedores_sin_rubro_apertura.map((e) => (
                  <tr key={e.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
                      {e.slug ? <code>{e.slug}</code> : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>{e.cobertura_tipo_declarada}</td>
                    <td style={{ padding: "10px 14px", maxWidth: 360, fontSize: 13 }}>{e.motivos_label}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {e.slug ? (
                        <Link
                          href={`/emprendedor/${encodeURIComponent(e.slug)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                        >
                          Ver →
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#6b7280",
            margin: "32px 0 12px 0",
          }}
        >
          Todos los que atienden la comuna (hasta 500)
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#9ca3af" }}>
          Misma lista que usa el RPC <code>list_emprendedores_abrir_comuna_activacion_admin</code>.
        </p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            background: "#fff",
            borderRadius: 18,
            overflow: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Nombre</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Slug</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Cobertura (tipo)</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Por qué cuenta en la comuna</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {data.emprendedores.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "#6b7280" }}>
                    Ninguno listado.
                  </td>
                </tr>
              ) : (
                data.emprendedores.map((e) => (
                  <tr key={`all-${e.id}`} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 13 }}>
                      {e.slug ? <code>{e.slug}</code> : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>{e.cobertura_tipo_declarada}</td>
                    <td style={{ padding: "10px 14px", maxWidth: 400, fontSize: 13 }}>{e.motivos_label}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {e.slug ? (
                        <Link
                          href={`/emprendedor/${encodeURIComponent(e.slug)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                        >
                          Ver →
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
