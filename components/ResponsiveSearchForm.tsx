"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import SearchComunaAutocomplete from "@/components/SearchComunaAutocomplete";

type Suggestion = {
  label: string;
  q?: string;
  comuna?: string;
  categoria?: string;
  subcategoria?: string;
};

type ComunaOption = {
  slug: string;
  nombre: string;
  region?: string;
};

type SimpleOption = {
  nombre: string;
  slug: string;
};

function useViewport() {
  const [width, setWidth] = useState<number>(1200);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

export default function ResponsiveSearchForm({
  q,
  comuna,
  categoria,
  subcategoria,
  suggestions,
  comunaOptions,
  categorias,
  subcategorias,
}: {
  q: string;
  comuna: string;
  categoria: string;
  subcategoria: string;
  suggestions: Suggestion[];
  comunaOptions: ComunaOption[];
  categorias: SimpleOption[];
  subcategorias: SimpleOption[];
}) {
  const width = useViewport();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const [showMoreFilters, setShowMoreFilters] = useState(
    Boolean(categoria || subcategoria)
  );

  const hasAnyFilter = Boolean(q || comuna || categoria || subcategoria);

  const desktopGridStyle: React.CSSProperties = isTablet
    ? {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        alignItems: "end",
      }
    : {
        display: "grid",
        gridTemplateColumns:
          "minmax(0,1.5fr) minmax(220px,1fr) minmax(180px,1fr) minmax(180px,1fr) auto auto",
        gap: 12,
        alignItems: "end",
      };

  if (isMobile) {
    return (
      <form
        id="search-form"
        method="get"
        action="/buscar"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <label
            htmlFor="q"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 6,
            }}
          >
            ¿Qué necesitas?
          </label>

          <SearchAutocomplete initialValue={q} suggestions={suggestions} />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 6,
            }}
          >
            Comuna
          </label>

          <SearchComunaAutocomplete
            initialValue={comuna}
            options={comunaOptions}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#111827",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {showMoreFilters ? "Ocultar filtros" : "Más filtros"}
        </button>

        {showMoreFilters ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              padding: 14,
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              background: "#f9fafb",
            }}
          >
            <div>
              <label
                htmlFor="categoria"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 6,
                }}
              >
                Categoría
              </label>

              <input
                id="categoria"
                name="categoria"
                defaultValue={categoria}
                placeholder="ej: hogar-construccion"
                list="categorias-list"
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  padding: "0 14px",
                  fontSize: 15,
                  background: "#fff",
                }}
              />

              <datalist id="categorias-list">
                {categorias.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.nombre}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="subcategoria"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 6,
                }}
              >
                Subcategoría
              </label>

              <input
                id="subcategoria"
                name="subcategoria"
                defaultValue={subcategoria}
                placeholder="ej: gasfiteria"
                list="subcategorias-list"
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  padding: "0 14px",
                  fontSize: 15,
                  background: "#fff",
                }}
              />

              <datalist id="subcategorias-list">
                {subcategorias.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.nombre}
                  </option>
                ))}
              </datalist>
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <button
            type="submit"
            style={{
              height: 48,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Buscar
          </button>

          <Link
            href="/buscar"
            style={{
              height: 48,
              padding: "0 18px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              textDecoration: "none",
              color: "#111827",
              background: "#fff",
            }}
          >
            Limpiar
          </Link>
        </div>

        {hasAnyFilter ? (
          <Link
            href="/buscar"
            style={{
              height: 44,
              borderRadius: 12,
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#991b1b",
              fontWeight: 800,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Limpiar todo
          </Link>
        ) : null}
      </form>
    );
  }

  return (
    <form
      id="search-form"
      method="get"
      action="/buscar"
      style={desktopGridStyle}
    >
      <div style={isTablet ? { gridColumn: "1 / -1" } : undefined}>
        <label
          htmlFor="q"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          ¿Qué necesitas?
        </label>

        <SearchAutocomplete initialValue={q} suggestions={suggestions} />
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Comuna
        </label>

        <SearchComunaAutocomplete initialValue={comuna} options={comunaOptions} />
      </div>

      <div>
        <label
          htmlFor="categoria"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Categoría
        </label>

        <input
          id="categoria"
          name="categoria"
          defaultValue={categoria}
          placeholder="ej: hogar-construccion"
          list="categorias-list"
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            border: "1px solid #d1d5db",
            padding: "0 14px",
            fontSize: 15,
            background: "#fff",
          }}
        />

        <datalist id="categorias-list">
          {categorias.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.nombre}
            </option>
          ))}
        </datalist>
      </div>

      <div>
        <label
          htmlFor="subcategoria"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Subcategoría
        </label>

        <input
          id="subcategoria"
          name="subcategoria"
          defaultValue={subcategoria}
          placeholder="ej: gasfiteria"
          list="subcategorias-list"
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            border: "1px solid #d1d5db",
            padding: "0 14px",
            fontSize: 15,
            background: "#fff",
          }}
        />

        <datalist id="subcategorias-list">
          {subcategorias.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.nombre}
            </option>
          ))}
        </datalist>
      </div>

      <button
        type="submit"
        style={{
          height: 48,
          padding: "0 18px",
          borderRadius: 12,
          border: "none",
          background: "#111827",
          color: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Buscar
      </button>

      <Link
        href="/buscar"
        style={{
          height: 48,
          padding: "0 18px",
          borderRadius: 12,
          border: "1px solid #d1d5db",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          textDecoration: "none",
          color: "#111827",
          background: "#fff",
        }}
      >
        Limpiar
      </Link>
    </form>
  );
}