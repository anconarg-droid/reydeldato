import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminIndexPage() {
  const links = [
    { href: "/admin/pendientes", label: "Negocios pendientes" },
    { href: "/admin/emprendimientos", label: "Emprendimientos publicados" },
    { href: "/admin/comunas", label: "Comunas" },
    { href: "/admin/comuna-interes", label: "Interés por comuna" },
    { href: "/admin/keywords-rubro", label: "Keywords por rubro" },
    { href: "/admin/sinonimos", label: "Sinónimos de búsqueda" },
  ];

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1
          style={{
            margin: "0 0 20px 0",
            fontSize: 34,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Panel admin · Rey del Dato
        </h1>

        <p
          style={{
            margin: "0 0 18px 0",
            fontSize: 15,
            color: "#4b5563",
          }}
        >
          Accesos rápidos a las secciones principales de administración del marketplace.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                background: "#fff",
                padding: 18,
                textDecoration: "none",
                color: "#111827",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  marginBottom: 6,
                }}
              >
                {link.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                }}
              >
                Ir a {link.href}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

