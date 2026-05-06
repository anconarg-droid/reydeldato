import Link from "next/link";
import AdminPagosClient from "./AdminPagosClient";

export const dynamic = "force-dynamic";

export default function AdminPagosPage() {
  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: "0",
              fontSize: 34,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            Pagos (transferencia) · Admin
          </h1>
          <Link
            href="/admin"
            style={{
              marginLeft: "auto",
              textDecoration: "none",
              color: "#0f766e",
              fontWeight: 900,
            }}
          >
            Volver al admin
          </Link>
        </div>

        <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#4b5563" }}>
          MVP: valida pagos por transferencia. Al aprobar, se activa/renueva el plan con la
          misma lógica que Webpay (respeta trial e inicio diferido).
        </p>

        <AdminPagosClient />
      </section>
    </main>
  );
}

