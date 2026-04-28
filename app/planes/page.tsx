import PlanesPublicosClient from "./PlanesPublicosClient";

export const dynamic = "force-static";

export default function PlanesPublicosPage() {
  return (
    <main className="min-h-screen" style={{ background: "#fff" }}>
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "1.75rem 1rem 3rem",
        }}
      >
        <header>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-tertiary, #64748b)",
              }}
            >
              Rey del Dato
            </div>
            <a
              href="/"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-secondary, #334155)",
                textDecoration: "none",
              }}
            >
              ← Volver
            </a>
          </div>
          <hr
            style={{
              marginTop: "0.9rem",
              border: "none",
              borderTop: "0.5px solid var(--color-border-tertiary)",
            }}
          />

          <h1 style={{ marginTop: "1rem", fontSize: 28, fontWeight: 600 }}>
            Planes para emprendedores
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              marginBottom: "2rem",
              maxWidth: 640,
              fontSize: 14,
              color: "var(--color-text-secondary, #475569)",
              lineHeight: 1.5,
            }}
          >
            Publicar tu negocio es gratis en esta etapa. Si quieres mejorar cómo
            se ve, hay planes opcionales.
          </p>
        </header>

        <section
          style={{
            background:
              "linear-gradient(135deg, #eaf6f2 0%, #f7f8f6 100%)",
            border: "0.5px solid #b2ddd0",
            borderRadius: "0.75rem",
            padding: "1.5rem 1.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              background: "#fff",
              border: "0.5px solid rgba(13,122,95,0.18)",
              color: "#0d7a5f",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "0.35rem 0.6rem",
            }}
          >
            AL PUBLICAR
          </span>
          <h2 style={{ marginTop: "0.75rem", fontSize: 18, fontWeight: 600 }}>
            Primeros 90 días con ficha completa gratis
          </h2>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: 13,
              color: "var(--color-text-secondary, #475569)",
              lineHeight: 1.55,
              maxWidth: 760,
              whiteSpace: "pre-line",
            }}
          >
            Apenas publicas tu negocio, partes con todas las ventajas de una
            ficha pagada: galería, Instagram, descripción completa, locales y
            estadísticas. Sin tarjeta, sin compromiso.
          </p>
        </section>

        <section
          style={{
            background: "#fff",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "0.75rem",
            padding: "1.25rem 1.75rem",
            marginBottom: "2.5rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              background: "rgba(148,163,184,0.18)",
              border: "0.5px solid rgba(148,163,184,0.32)",
              color: "var(--color-text-secondary, #475569)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "0.35rem 0.6rem",
            }}
          >
            DÍA 91 EN ADELANTE
          </span>
          <h2 style={{ marginTop: "0.75rem", fontSize: 15, fontWeight: 500 }}>
            Si no continúas, tu negocio sigue publicado
          </h2>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: 13,
              color: "var(--color-text-secondary, #475569)",
              lineHeight: 1.55,
              maxWidth: 760,
              whiteSpace: "pre-line",
            }}
          >
            Si no continúas, tu negocio sigue publicado.{"\n"}
            Tu ficha pasa a básica (solo WhatsApp y datos).{"\n"}
            Sigues apareciendo en tu comuna.
          </p>
        </section>

        <section>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-tertiary, #64748b)",
            }}
          >
            SI QUIERES MÁS
          </div>
          <h2 style={{ marginTop: "0.5rem", fontSize: 24, fontWeight: 600 }}>
            Ficha completa
          </h2>
          <p
            style={{
              marginTop: "0.6rem",
              marginBottom: "1.5rem",
              maxWidth: 640,
              fontSize: 14,
              color: "var(--color-text-secondary, #475569)",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          >
            Mejora cómo se ve tu negocio para generar más confianza.
          </p>
          <p
            style={{
              marginTop: "-0.75rem",
              marginBottom: "1.5rem",
              maxWidth: 640,
              fontSize: 14,
              color: "var(--color-text-secondary, #475569)",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
              fontWeight: 600,
            }}
          >
            No cambia tu posición en los resultados.{"\n"}Apareces igual, pero
            con mejor presentación.
          </p>

          <PlanesPublicosClient />
        </section>
      </div>
    </main>
  );
}

