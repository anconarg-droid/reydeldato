"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CategoriaCard = {
  nombre: string;
  slug: string;
  icono: string;
  ejemplos: string[];
};

type ComunaDestacada = {
  nombre: string;
  slug: string;
};

type SuggestResponse = {
  ok: boolean;
  suggestions?: string[];
  error?: string;
  message?: string;
};

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

type ComunasResponse = {
  ok: boolean;
  comunas?: ComunaSuggestion[];
  error?: string;
  message?: string;
};

const CATEGORIAS: CategoriaCard[] = [
  {
    nombre: "Hogar y Construcción",
    slug: "hogar-construccion",
    icono: "🏠",
    ejemplos: ["gasfitería", "electricidad", "pintura"],
  },
  {
    nombre: "Mascotas",
    slug: "mascotas",
    icono: "🐶",
    ejemplos: ["veterinaria", "peluquería", "pet shop"],
  },
  {
    nombre: "Gastronomía y Alimentos",
    slug: "gastronomia-alimentos",
    icono: "🍔",
    ejemplos: ["panadería", "cafetería", "empanadas"],
  },
  {
    nombre: "Eventos y Celebraciones",
    slug: "eventos-celebraciones",
    icono: "🎉",
    ejemplos: ["banquetería", "decoración", "arriendos"],
  },
  {
    nombre: "Belleza y Estética",
    slug: "belleza-estetica",
    icono: "💅",
    ejemplos: ["peluquería", "uñas", "masajes"],
  },
  {
    nombre: "Educación y Clases",
    slug: "educacion-clases",
    icono: "📚",
    ejemplos: ["matemáticas", "inglés", "reforzamiento"],
  },
  {
    nombre: "Tecnología y Reparaciones",
    slug: "tecnologia-reparaciones",
    icono: "💻",
    ejemplos: ["computación", "soporte", "cámaras"],
  },
  {
    nombre: "Transporte y Logística",
    slug: "transporte-logistica",
    icono: "🚚",
    ejemplos: ["fletes", "mudanzas", "encomiendas"],
  },
];

const COMUNAS_DESTACADAS: ComunaDestacada[] = [
  { nombre: "Calera de Tango", slug: "calera-de-tango" },
  { nombre: "Padre Hurtado", slug: "padre-hurtado" },
  { nombre: "Talagante", slug: "talagante" },
  { nombre: "Peñaflor", slug: "penaflor" },
  { nombre: "Maipú", slug: "maipu" },
  { nombre: "San Bernardo", slug: "san-bernardo" },
  { nombre: "Buin", slug: "buin" },
  { nombre: "Santiago", slug: "santiago" },
];

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export default function HomeClient() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [comunaInput, setComunaInput] = useState("");

  const [querySuggestions, setQuerySuggestions] = useState<string[]>([]);
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);

  const [showQuerySuggestions, setShowQuerySuggestions] = useState(false);
  const [showComunaSuggestions, setShowComunaSuggestions] = useState(false);

  const [loadingQuerySuggestions, setLoadingQuerySuggestions] = useState(false);
  const [loadingComunaSuggestions, setLoadingComunaSuggestions] = useState(false);

  const [selectedComunaSlug, setSelectedComunaSlug] = useState("");
  const [selectedComunaNombre, setSelectedComunaNombre] = useState("");
  const [selectedRegionNombre, setSelectedRegionNombre] = useState("");

  const [activeQueryIndex, setActiveQueryIndex] = useState(-1);
  const [activeComunaIndex, setActiveComunaIndex] = useState(-1);

  const [comunaTouched, setComunaTouched] = useState(false);

  const queryBoxRef = useRef<HTMLDivElement | null>(null);
  const comunaBoxRef = useRef<HTMLDivElement | null>(null);

  const canSearch = useMemo(() => {
    return query.trim().length > 0 || selectedComunaSlug.length > 0;
  }, [query, selectedComunaSlug]);

  const comunaInvalida =
    comunaTouched &&
    comunaInput.trim().length > 0 &&
    selectedComunaSlug.length === 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (queryBoxRef.current && !queryBoxRef.current.contains(target)) {
        setShowQuerySuggestions(false);
        setActiveQueryIndex(-1);
      }

      if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) {
        setShowComunaSuggestions(false);
        setActiveComunaIndex(-1);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setQuerySuggestions([]);
      setActiveQueryIndex(-1);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoadingQuerySuggestions(true);

        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const data: SuggestResponse = await res.json();

        if (data.ok && Array.isArray(data.suggestions)) {
          setQuerySuggestions(data.suggestions);
        } else {
          setQuerySuggestions([]);
        }
      } catch {
        setQuerySuggestions([]);
      } finally {
        setLoadingQuerySuggestions(false);
        setActiveQueryIndex(-1);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const q = comunaInput.trim();

    if (q.length < 2) {
      setComunaSuggestions([]);
      setActiveComunaIndex(-1);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoadingComunaSuggestions(true);

        const res = await fetch(`/api/comunas?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const data: ComunasResponse = await res.json();

        if (data.ok && Array.isArray(data.comunas)) {
          setComunaSuggestions(data.comunas);
        } else {
          setComunaSuggestions([]);
        }
      } catch {
        setComunaSuggestions([]);
      } finally {
        setLoadingComunaSuggestions(false);
        setActiveComunaIndex(-1);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [comunaInput]);

  function goBuscar(options?: {
    customQuery?: string;
    customComunaSlug?: string;
    categoriaSlug?: string;
  }) {
    const params = new URLSearchParams();

    const finalQuery = s(options?.customQuery ?? query);
    const finalComunaSlug = s(options?.customComunaSlug ?? selectedComunaSlug);
    const categoriaSlug = s(options?.categoriaSlug);

    if (finalQuery) params.set("q", finalQuery);
    if (finalComunaSlug) params.set("comuna", finalComunaSlug);
    if (categoriaSlug) params.set("categoria", categoriaSlug);

    router.push(`/buscar?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (comunaInput.trim() && !selectedComunaSlug) {
      setComunaTouched(true);
      setShowComunaSuggestions(true);
      return;
    }

    if (!canSearch) return;

    goBuscar();
  }

  function selectQuerySuggestion(value: string) {
    setQuery(value);
    setShowQuerySuggestions(false);
    setActiveQueryIndex(-1);
  }

  function selectComunaSuggestion(item: ComunaSuggestion) {
    setComunaInput(item.nombre);
    setSelectedComunaSlug(item.slug);
    setSelectedComunaNombre(item.nombre);
    setSelectedRegionNombre(s(item.region_nombre));
    setComunaTouched(true);
    setShowComunaSuggestions(false);
    setActiveComunaIndex(-1);
  }

  function clearSelectedComunaIfEdited(nextValue: string) {
    const normalizedNext = nextValue.trim().toLowerCase();
    const normalizedSelected = selectedComunaNombre.trim().toLowerCase();

    setComunaInput(nextValue);
    setComunaTouched(true);
    setShowComunaSuggestions(true);

    if (!normalizedSelected || normalizedNext !== normalizedSelected) {
      setSelectedComunaSlug("");
      setSelectedComunaNombre("");
      setSelectedRegionNombre("");
    }
  }

  function handleQueryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = querySuggestions.length;

    if (!showQuerySuggestions && total > 0 && e.key === "ArrowDown") {
      setShowQuerySuggestions(true);
      setActiveQueryIndex(0);
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowDown" && total > 0) {
      setShowQuerySuggestions(true);
      setActiveQueryIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowUp" && total > 0) {
      setActiveQueryIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      e.preventDefault();
      return;
    }

    if (e.key === "Enter" && showQuerySuggestions && activeQueryIndex >= 0) {
      e.preventDefault();
      selectQuerySuggestion(querySuggestions[activeQueryIndex]);
      return;
    }

    if (e.key === "Escape") {
      setShowQuerySuggestions(false);
      setActiveQueryIndex(-1);
    }
  }

  function handleComunaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = comunaSuggestions.length;

    if (!showComunaSuggestions && total > 0 && e.key === "ArrowDown") {
      setShowComunaSuggestions(true);
      setActiveComunaIndex(0);
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowDown" && total > 0) {
      setShowComunaSuggestions(true);
      setActiveComunaIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowUp" && total > 0) {
      setActiveComunaIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      e.preventDefault();
      return;
    }

    if (e.key === "Enter" && showComunaSuggestions && activeComunaIndex >= 0) {
      e.preventDefault();
      selectComunaSuggestion(comunaSuggestions[activeComunaIndex]);
      return;
    }

    if (e.key === "Escape") {
      setShowComunaSuggestions(false);
      setActiveComunaIndex(-1);
    }
  }

  function clickCategoria(cat: CategoriaCard) {
    goBuscar({ categoriaSlug: cat.slug });
  }

  function clickComuna(comuna: ComunaDestacada) {
    router.push(`/buscar?comuna=${comuna.slug}`);
  }

  return (
    <main
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "28px 20px 70px",
      }}
    >
      <section style={{ marginBottom: 30 }}>
        <h1
          style={{
            fontSize: 64,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            margin: "0 0 18px 0",
            fontWeight: 900,
            maxWidth: 900,
          }}
        >
          Encuentra emprendimientos, servicios y datos rápido.
        </h1>

        <p
          style={{
            margin: "0 0 24px 0",
            color: "#4b5563",
            fontSize: 22,
            lineHeight: 1.45,
            maxWidth: 900,
          }}
        >
          Busca por texto libre y comuna, o explora por categorías para descubrir opciones útiles cerca de ti.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div ref={queryBoxRef} style={{ position: "relative" }}>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowQuerySuggestions(true);
                }}
                onFocus={() => setShowQuerySuggestions(true)}
                onKeyDown={handleQueryKeyDown}
                placeholder="¿Qué necesitas? Ej: gasfiter, torta, veterinario, wifi..."
                style={{
                  width: "100%",
                  height: 62,
                  borderRadius: 18,
                  border: "1px solid #d1d5db",
                  padding: "0 18px",
                  fontSize: 18,
                  outline: "none",
                  background: "#fff",
                }}
              />

              {showQuerySuggestions &&
                (querySuggestions.length > 0 || loadingQuerySuggestions) && (
                  <div
                    style={{
                      position: "absolute",
                      top: 68,
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                      zIndex: 30,
                    }}
                  >
                    {loadingQuerySuggestions && (
                      <div
                        style={{
                          padding: 14,
                          color: "#6b7280",
                          fontSize: 14,
                        }}
                      >
                        Buscando sugerencias...
                      </div>
                    )}

                    {!loadingQuerySuggestions &&
                      querySuggestions.map((item, index) => (
                        <button
                          key={`${item}-${index}`}
                          type="button"
                          onClick={() => selectQuerySuggestion(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background:
                              activeQueryIndex === index ? "#f9fafb" : "#fff",
                            border: "none",
                            borderBottom: "1px solid #f3f4f6",
                            padding: "14px 16px",
                            cursor: "pointer",
                            fontSize: 15,
                            fontWeight: activeQueryIndex === index ? 700 : 400,
                          }}
                        >
                          {item}
                        </button>
                      ))}
                  </div>
                )}
            </div>

            <div ref={comunaBoxRef} style={{ position: "relative" }}>
              <input
                value={comunaInput}
                onChange={(e) => clearSelectedComunaIfEdited(e.target.value)}
                onFocus={() => setShowComunaSuggestions(true)}
                onKeyDown={handleComunaKeyDown}
                placeholder="Escribe y selecciona una comuna"
                style={{
                  width: "100%",
                  height: 62,
                  borderRadius: 18,
                  border: comunaInvalida ? "1px solid #dc2626" : "1px solid #d1d5db",
                  padding: "0 18px",
                  fontSize: 18,
                  outline: "none",
                  background: "#fff",
                }}
              />

              {showComunaSuggestions &&
                (comunaSuggestions.length > 0 || loadingComunaSuggestions) && (
                  <div
                    style={{
                      position: "absolute",
                      top: 68,
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                      zIndex: 30,
                    }}
                  >
                    {loadingComunaSuggestions && (
                      <div
                        style={{
                          padding: 14,
                          color: "#6b7280",
                          fontSize: 14,
                        }}
                      >
                        Buscando comunas...
                      </div>
                    )}

                    {!loadingComunaSuggestions &&
                      comunaSuggestions.map((item, index) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => selectComunaSuggestion(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background:
                              activeComunaIndex === index ? "#f9fafb" : "#fff",
                            border: "none",
                            borderBottom: "1px solid #f3f4f6",
                            padding: "14px 16px",
                            cursor: "pointer",
                            fontSize: 15,
                            fontWeight: activeComunaIndex === index ? 700 : 400,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <span style={{ fontSize: 15 }}>{item.nombre}</span>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              {item.region_nombre || ""}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
            </div>

            <button
              type="submit"
              disabled={!canSearch}
              style={{
                height: 62,
                borderRadius: 18,
                padding: "0 22px",
                border: "none",
                background: canSearch ? "#0f172a" : "#94a3b8",
                color: "#fff",
                fontSize: 17,
                fontWeight: 800,
                cursor: canSearch ? "pointer" : "not-allowed",
                minWidth: 140,
              }}
            >
              Buscar
            </button>
          </div>
        </form>

        {selectedComunaNombre && (
          <p
            style={{
              margin: "12px 0 0 0",
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Comuna seleccionada: <strong>{selectedComunaNombre}</strong>
            {selectedRegionNombre ? ` · ${selectedRegionNombre}` : ""}
          </p>
        )}

        {comunaInvalida && (
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 14,
              color: "#b91c1c",
            }}
          >
            Debes seleccionar una comuna válida desde la lista.
          </p>
        )}
      </section>

      <section
        style={{
          background: "#fffbea",
          border: "1px solid #f4df9b",
          borderRadius: 18,
          padding: 18,
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 18,
            fontWeight: 900,
            color: "#8a5a00",
          }}
        >
          Cómo se muestran los resultados
        </h2>

        <p
          style={{
            margin: 0,
            color: "#6b4f1d",
            fontSize: 16,
            lineHeight: 1.5,
          }}
        >
          Primero verás emprendimientos con base en tu comuna. Luego los que atienden tu comuna. Después servicios con cobertura regional o nacional.
        </p>

        <p
          style={{
            margin: "8px 0 0 0",
            color: "#8b6a2b",
            fontSize: 14,
          }}
        >
          Dentro de cada grupo, el orden rota automáticamente para dar visibilidad justa a todos los emprendimientos.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontSize: 44,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            margin: "0 0 8px 0",
            fontWeight: 900,
          }}
        >
          Explora por categorías
        </h2>

        <p
          style={{
            margin: "0 0 20px 0",
            color: "#6b7280",
            fontSize: 18,
          }}
        >
          Navega por rubros y descubre opciones relacionadas en tu comuna.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => clickCategoria(cat)}
              style={{
                textAlign: "left",
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 22,
                padding: 20,
                cursor: "pointer",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 12 }}>{cat.icono}</div>

              <h3
                style={{
                  margin: "0 0 8px 0",
                  fontSize: 22,
                  lineHeight: 1.1,
                  fontWeight: 900,
                }}
              >
                {cat.nombre}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              >
                {cat.ejemplos.join(" · ")}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 34 }}>
        <h2
          style={{
            fontSize: 44,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            margin: "0 0 8px 0",
            fontWeight: 900,
          }}
        >
          Explora por comuna
        </h2>

        <p
          style={{
            margin: "0 0 18px 0",
            color: "#6b7280",
            fontSize: 18,
          }}
        >
          Selecciona una comuna destacada o escribe una comuna específica en el buscador de arriba.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {COMUNAS_DESTACADAS.map((comuna) => (
            <button
              key={comuna.slug}
              type="button"
              onClick={() => clickComuna(comuna)}
              style={{
                border: "1px solid #d1d5db",
                background: "#fff",
                borderRadius: 999,
                padding: "12px 16px",
                fontSize: 15,
                cursor: "pointer",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
              }}
            >
              {comuna.nombre}
            </button>
          ))}
        </div>

        <p
          style={{
            marginTop: 14,
            color: "#6b7280",
            fontSize: 15,
          }}
        >
          ¿Buscas una comuna más exacta? Escríbela y selecciónala en el buscador principal.
        </p>
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: 26,
          padding: 24,
        }}
      >
        <h2
          style={{
            margin: "0 0 10px 0",
            fontSize: 46,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            fontWeight: 900,
          }}
        >
          Primero aparecen los emprendimientos de tu comuna
        </h2>

        <p
          style={{
            margin: "0 0 20px 0",
            color: "#4b5563",
            fontSize: 18,
            lineHeight: 1.55,
            maxWidth: 920,
          }}
        >
          Rey del Dato prioriza lo local. Si no encontramos resultados con base en tu comuna, te mostraremos emprendimientos que sí atienden tu comuna y luego opciones con cobertura más amplia.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              border: "1px solid #f3d47f",
              background: "#fff8e7",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>⭐ De tu comuna</div>
            <p style={{ margin: 0, color: "#7a5a0d", fontSize: 15 }}>
              Base en la comuna buscada
            </p>
          </div>

          <div
            style={{
              border: "1px solid #b7dbff",
              background: "#eef7ff",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>
              📍 Atiende tu comuna
            </div>
            <p style={{ margin: 0, color: "#0b5cab", fontSize: 15 }}>
              Base en otra comuna, pero te atiende
            </p>
          </div>

          <div
            style={{
              border: "1px solid #bce5c8",
              background: "#eefaf1",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>
              🌎 Cobertura amplia
            </div>
            <p style={{ margin: 0, color: "#1d6b37", fontSize: 15 }}>
              Regional o nacional
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}