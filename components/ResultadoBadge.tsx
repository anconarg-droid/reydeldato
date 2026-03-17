type Props = {
  bucket?: string
  motivo?: string
}

export default function ResultadoBadge({ bucket, motivo }: Props) {
  if (!bucket) return null

  let bg = "#e5e7eb"
  let color = "#111827"
  let icon = "📍"

  if (bucket === "local") {
    bg = "#dcfce7"
    color = "#166534"
    icon = "🏪"
  }

  if (bucket === "exacta") {
    bg = "#dcfce7"
    color = "#166534"
    icon = "⭐"
  }

  if (bucket === "cobertura_comuna") {
    bg = "#e0f2fe"
    color = "#075985"
    icon = "📍"
  }

  if (bucket === "regional") {
    bg = "#fef3c7"
    color = "#92400e"
    icon = "🌎"
  }

  if (bucket === "nacional") {
    bg = "#f3e8ff"
    color = "#6b21a8"
    icon = "🇨🇱"
  }

  return (
    <div
      style={{
        background: bg,
        color: color,
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }}
    >
      <span>{icon}</span>
      {motivo}
    </div>
  )
}