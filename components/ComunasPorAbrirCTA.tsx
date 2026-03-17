import Link from "next/link";

export default function ComunasPorAbrirCTA() {
  return (
    <section
      style={{
        marginTop: 30,
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        padding: 20,
        background: "#fff",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        ¿Tu comuna aún no está activa?
      </h2>

      <p
        style={{
          marginBottom: 14,
          color: "#4b5563",
        }}
      >
        Mira qué comunas están más cerca de abrir y ayuda a activar la tuya.
      </p>

      <Link
        href="/comunas-por-abrir"
        style={{
          background: "#111827",
          color: "#fff",
          padding: "12px 18px",
          borderRadius: 12,
          fontWeight: 800,
          textDecoration: "none",
          display: "inline-flex",
        }}
      >
        Ver comunas por abrir
      </Link>
    </section>
  );
}