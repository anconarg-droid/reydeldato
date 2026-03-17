import Link from "next/link";
import HoverCard from "@/components/HoverCard";

type Item = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta?: string;
  foto_principal_url?: string;
  logo_path?: string;
  comuna_base_slug?: string;
  categoria_slug?: string;
  whatsapp?: string;
};

function pretty(s?: string) {
  return (s ?? "")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function PreviewCard({ item }: { item: Item }) {
  const img = item.foto_principal_url || item.logo_path || "";

  return (
    <Link
      href={`/emprendedor/${item.slug}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <article
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: 110,
            background: img
              ? `center/cover no-repeat url(${img})`
              : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {!img ? "Sin foto" : null}
        </div>

        <div style={{ padding: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#2563eb",
              marginBottom: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pretty(item.categoria_slug)} • {pretty(item.comuna_base_slug)}
          </div>

          <div
            style={{
              fontSize: 17,
              lineHeight: 1.1,
              fontWeight: 900,
              color: "#111827",
              marginBottom: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.nombre}
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: "#4b5563",
              minHeight: 38,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {item.descripcion_corta || "Sin descripción"}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function SearchSection({
  title,
  icon,
  items,
  defaultOpen = false,
  helperText,
}: {
  title: string;
  icon: string;
  items: Item[];
  defaultOpen?: boolean;
  helperText?: string;
}) {
  if (!items.length) return null;

  const previewItems = items.slice(0, 3);

  return (
    <section style={{ marginBottom: 28 }}>
      <details
        open={defaultOpen}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            listStyle: "none",
            cursor: "pointer",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            fontWeight: 900,
            fontSize: 24,
            color: "#111827",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{icon}</span>
            <span>{title}</span>
          </span>

          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 999,
              padding: "6px 10px",
              background: "#f9fafb",
            }}
          >
            {items.length}
          </span>
        </summary>

        <div style={{ padding: "0 20px 20px" }}>
          {helperText ? (
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#6b7280",
              }}
            >
              {helperText}
            </p>
          ) : null}

          {!defaultOpen ? (
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                {previewItems.map((item) => (
                  <PreviewCard key={item.id} item={item} />
                ))}
              </div>

              {items.length > 3 ? (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#6b7280",
                  }}
                >
                  + {items.length - 3} resultado{items.length - 3 === 1 ? "" : "s"} más al expandir
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 20,
            }}
          >
            {items.map((item) => (
              <HoverCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}