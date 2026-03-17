"use client";

import { useEffect, useState } from "react";

export default function ActivitySlider({ items }: { items: any[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!items.length) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 3200);

    return () => clearInterval(interval);
  }, [items]);

  if (!items.length) return null;

  const item = items[index];

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 22,
        padding: 22,
        background: "#fafafa",
        transition: "all .3s ease",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: "#111827",
          marginBottom: 6,
        }}
      >
        {item.nombre_emprendimiento}
      </div>

      <div
        style={{
          color: "#4b5563",
          fontSize: 15,
          marginBottom: 6,
        }}
      >
        {item.categoria_referencial || "Sin categoría referencial"}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        {item.comuna_nombre}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 8,
        }}
      >
        {items.slice(0, Math.min(items.length, 8)).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: i === index ? "#111827" : "#d1d5db",
            }}
          />
        ))}
      </div>
    </div>
  );
}