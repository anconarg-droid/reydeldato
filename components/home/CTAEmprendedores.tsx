import Link from "next/link";

export default function CTAEmprendedores() {
  return (
    <section
      style={{
        padding: "60px 20px",
        background: "#111827",
        textAlign: "center",
        color: "#ffffff",
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginBottom: 16,
        }}
      >
        ¿Tienes un emprendimiento?
      </h2>

      <p
        style={{
          fontSize: 18,
          marginBottom: 28,
          opacity: 0.9,
        }}
      >
        Crea tu ficha y comienza a aparecer en las búsquedas de tu comuna.
      </p>

      <Link
        href="/publicar"
        style={{
          padding: "16px 28px",
          borderRadius: 14,
          background: "#22c55e",
          color: "#ffffff",
          fontWeight: 800,
          textDecoration: "none",
          fontSize: 16,
        }}
      >
        Publicar mi emprendimiento
      </Link>
    </section>
  );
}