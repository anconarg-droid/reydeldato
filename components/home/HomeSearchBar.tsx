"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ComunaItem = {
  slug: string;
  nombre: string;
  region: string;
};

type Props = {
  comunas: ComunaItem[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function HomeSearchBar({ comunas }: Props) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [comunaTexto, setComunaTexto] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");
  const [comunaRegion, setComunaRegion] = useState("");
  const [open, setOpen] = useState(false);

  const term = normalizeText(comunaTexto);
  const qClean = q.trim();

  const filtered = useMemo(() => {
    if (term.length < 2) return [];

    return comunas
      .filter((c) => {
        const nombre = normalizeText(c.nombre);
        const region = normalizeText(c.region);
        return nombre.includes(term) || region.includes(term);
      })
      .slice(0, 8);
  }, [comunas, term]);

  const shouldShowSuggestions =
    open && term.length >= 2 && filtered.length > 0 && !comunaSlug;

  function selectComuna(item: ComunaItem) {
    setComunaTexto(item.nombre);
    setComunaSlug(item.slug);
    setComunaRegion(item.region);
    setOpen(false);
  }

  function clearComuna() {
    setComunaTexto("");
    setComunaSlug("");
    setComunaRegion("");
    setOpen(false);
  }

  function resolveTypedComuna() {
    if (comunaSlug) {
      return {
        slug: comunaSlug,
        nombre: comunaTexto,
        region: comunaRegion,
      };
    }

    const typed = normalizeText(comunaTexto);
    if (!typed) return null;

    const exactMatch = comunas.find(
      (item) => normalizeText(item.nombre) === typed
    );

    return exactMatch || null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const qValue = qClean;
    const comunaResolved = resolveTypedComuna();

    if (comunaResolved && !qValue) {
      setOpen(false);
      router.push(`/${comunaResolved.slug}`);
      return;
    }

    const params = new URLSearchParams();

    if (qValue) params.set("q", qValue);
    if (comunaResolved?.slug) params.set("comuna", comunaResolved.slug);

    setOpen(false);

    const query = params.toString();
    router.push(query ? `/buscar?${query}` : "/buscar");
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: 24,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.95fr) auto",
          alignItems: "stretch",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          overflow: "visible",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderRight: "1px solid #eef2f7",
          }}
        >
          <label
            htmlFor="q"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 6,
              letterSpacing: "0.01em",
            }}
          >
            ¿Qué necesitas?
          </label>

          <input
            id="q"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: gasfitería, empanadas, fletes, dentista..."
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 16,
              background: "transparent",
              color: "#111827",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            padding: "14px 18px",
            borderRight: "1px solid #eef2f7",
          }}
        >
          <label
            htmlFor="comuna-input"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 6,
              letterSpacing: "0.01em",
            }}
          >
            Comuna
          </label>

          <div style={{ position: "relative" }}>
            <input
              id="comuna-input"
              type="text"
              value={comunaTexto}
              onChange={(e) => {
                const value = e.target.value;
                setComunaTexto(value);
                setComunaSlug("");
                setComunaRegion("");
                setOpen(true);
              }}
              onFocus={() => {
                if (comunaTexto.trim().length >= 2 && !comunaSlug) {
                  setOpen(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setOpen(false), 160);
              }}
              placeholder="Escribe una comuna..."
              autoComplete="off"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: 16,
                background: "transparent",
                color: "#111827",
                paddingRight: comunaSlug ? 28 : 0,
              }}
            />

            {comunaSlug && (
              <button
                type="button"
                onClick={clearComuna}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 0,
                  transform: "translateY(-50%)",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: "none",
                  background: "#e5e7eb",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#374151",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>

          {comunaSlug && comunaRegion && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#6b7280",
                lineHeight: 1.2,
              }}
            >
              {comunaRegion}
            </div>
          )}

          {shouldShowSuggestions && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                background: "#fff",
                boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
                zIndex: 40,
                maxHeight: 340,
                overflowY: "auto",
              }}
            >
              {filtered.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectComuna(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#111827",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.nombre}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "#6b7280",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.region}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="submit"
            style={{
              minHeight: 56,
              padding: "0 24px",
              borderRadius: 16,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Buscar
          </button>
        </div>
      </div>
    </form>
  );
}