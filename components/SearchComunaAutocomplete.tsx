"use client";

import { useEffect, useMemo, useState } from "react";

type ComunaItem = {
  nombre: string;
  slug: string;
};

export default function SearchComunaAutocomplete({
  value,
  onSelect,
  placeholder = "Ej: maipu",
}: {
  value: string;
  onSelect: (item: ComunaItem | null, rawValue: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState(value || "");
  const [items, setItems] = useState<ComunaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const normalized = useMemo(() => input.trim(), [input]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!normalized || normalized.length < 2) {
        setItems([]);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `/api/comunas?query=${encodeURIComponent(normalized)}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!active) return;

        setItems(Array.isArray(json?.items) ? json.items : []);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [normalized]);

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => {
          const raw = e.target.value;
          setInput(raw);
          setOpen(true);
          onSelect(null, raw);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-12 rounded-xl border border-gray-300 px-4 text-sm"
      />

      {open && (loading || items.length > 0) && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Buscando comunas...</div>
          )}

          {!loading &&
            items.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setInput(item.nombre);
                  setOpen(false);
                  onSelect(item, item.nombre);
                }}
                className="block w-full px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="text-sm font-semibold text-gray-900">{item.nombre}</div>
                <div className="text-xs text-gray-500">{item.slug}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}