// app/[comuna]/page.tsx
import Link from "next/link";

export default async function Page({
  params,
}: {
  params: Promise<{ comuna: string }>;
}) {
  const { comuna } = await params;

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 8 }}>
        Comuna dinámica
      </h1>

      <div style={{ opacity: 0.85, marginBottom: 16 }}>
        params.comuna: <b>{comuna}</b>
      </div>

      <div
        style={{
          padding: 14,
          background: "#f5f7fa",
          borderRadius: 10,
          border: "1px solid #e6eaf0",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          Ir a búsqueda en esta comuna
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/${comuna}/buscar?q=gasfiter`}
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              textDecoration: "none",
              fontWeight: 900,
              color: "inherit",
              background: "white",
            }}
          >
            Probar: gasfiter
          </Link>

          <Link
            href={`/${comuna}/buscar?q=veterinario`}
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              textDecoration: "none",
              fontWeight: 900,
              color: "inherit",
              background: "white",
            }}
          >
            Probar: veterinario
          </Link>
        </div>
      </div>
    </div>
  );
}