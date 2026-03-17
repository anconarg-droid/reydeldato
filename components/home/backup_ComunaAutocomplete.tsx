"use client";

import { useEffect, useState } from "react";

type Item = {
  slug: string;
  nombre: string;
};

export default function ComunaAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (text.length < 2) {
      setItems([]);
      return;
    }

    const t = setTimeout(async () => {
      const res = await fetch(`/api/suggest/comunas?q=${text}`);
      const data = await res.json();

      if (data.ok) {
        setItems(data.items || []);
        setOpen(true);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [text]);

  function seleccionar(item: Item) {
    setText(item.nombre);
    setOpen(false);
    onChange(item.slug);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comuna"
        style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ccc",
          width: "100%",
        }}
      />

      {open && items.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 45,
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 10,
            zIndex: 10,
          }}
        >
          {items.map((i) => (
            <div
              key={i.slug}
              onClick={() => seleccionar(i)}
              style={{
                padding: 10,
                cursor: "pointer",
              }}
            >
              {i.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}