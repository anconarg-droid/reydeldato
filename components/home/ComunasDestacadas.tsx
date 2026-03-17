import Link from "next/link";

const comunas = [
  "Talagante",
  "Peñaflor",
  "Padre Hurtado",
  "Calera de Tango",
  "Buin",
  "San Bernardo",
  "Maipú",
];

export default function ComunasDestacadas() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "50px 20px",
      }}
    >
      <h2
        style={{
          fontSize: 26,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        Busca por comuna
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {comunas.map((comuna) => (
          <Link
            key={comuna}
            href={`/buscar?comuna=${encodeURIComponent(comuna)}`}
            style={{
              border: "1px solid #d1d5db",
              padding: "10px 14px",
              borderRadius: 999,
              textDecoration: "none",
              fontWeight: 700,
              color: "#111827",
              background: "#ffffff",
            }}
          >
            {comuna}
          </Link>
        ))}
      </div>
    </section>
  );
}