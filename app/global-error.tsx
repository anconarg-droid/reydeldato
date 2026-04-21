"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Mostrar el error real en producción (sin romper el layout).
  // El digest ayuda a correlacionar con logs de Vercel.
  const msg = String(error?.message || "Error interno");
  const digest = (error as { digest?: string } | null)?.digest;

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        <main
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 860,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Error interno
            </h1>
            <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#475569" }}>
              Si estás debuggeando un 500, este mensaje es el error real del server.
            </p>

            <pre
              style={{
                margin: "14px 0 0 0",
                padding: 12,
                background: "#0b1220",
                color: "#e2e8f0",
                borderRadius: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
{msg}
{digest ? `\n\ndigest: ${digest}` : ""}
            </pre>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  borderRadius: 12,
                  border: "1px solid #10b981",
                  background: "#10b981",
                  color: "#052e2b",
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Reintentar
              </button>
              <a
                href="/"
                style={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "10px 14px",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Ir a inicio
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

