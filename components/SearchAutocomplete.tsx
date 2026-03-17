"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ItemSlug = {
  nombre: string;
  slug: string;
};

type Props = {
  placeholder?: string;
  initialQuery?: string;
  onChange?: (payload: {
    raw: string;
    q: string;
    comuna?: string;
    categoria?: string;
    subcategoria?: string;
  }) => void;
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(s: string) {
  return norm(s)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function uniq(list: string[]) {
  return Array.from(new Set(list.filter(Boolean)));
}

function includesQuery(text: string, query: string) {
  return norm(text).includes(norm(query));
}

function scoreSuggestion(text: string, query: string) {
  const t = norm(text);
  const q = norm(query);

  if (!q) return 0;
  if (t === q) return 120;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 60;
  return 0;
}

function parseSuggestionValue(
  value: string,
  comunas: ItemSlug[],
  categorias: ItemSlug[],
  subcategorias: ItemSlug[]
) {
  const raw = value.trim();
  const rawNorm = norm(raw);

  let comuna: string | undefined;
  let categoria: string | undefined;
  let subcategoria: string | undefined;
  let q = raw;

  const comunaEncontrada = comunas.find((c) => {
    const nombre = norm(c.nombre);
    return rawNorm.endsWith(`en ${nombre}`) || rawNorm === nombre;
  });

  if (comunaEncontrada) {
    comuna = comunaEncontrada.slug;

    const patron = new RegExp(`\\s+en\\s+${norm(comunaEncontrada.nombre)}$`, "i");
    q = rawNorm.replace(patron, "").trim() || raw;
  }

  const subcatEncontrada = subcategorias.find((s) => norm(s.nombre) === norm(q));
  if (subcatEncontrada) {
    subcategoria = subcatEncontrada.slug;
  }

  const categoriaEncontrada = categorias.find((c) => norm(c.nombre) === norm(q));
  if (categoriaEncontrada) {
    categoria = categoriaEncontrada.slug;
  }

  return {
    raw,
    q: q.trim(),
    comuna,
    categoria,
    subcategoria,
  };
}

const INTENT_RULES: Array<{
  trigger: string[];
  suggestions: string[];
}> = [
  {
    trigger: ["gas", "gasf", "gasfit", "gasfiter", "plom", "plomero", "calefont"],
    suggestions: [
      "gasfiter",
      "gasfiter a domicilio",
      "gasfiter calefont",
      "gasfiter cerca",
      "gasfiter en maipú",
    ],
  },
  {
    trigger: ["dent", "dentista", "dental", "odont"],
    suggestions: [
      "dentista",
      "dentista urgencia",
      "dentista cerca",
      "dentista en buin",
      "limpieza dental",
    ],
  },
  {
    trigger: ["emp", "empan", "empanada", "empanadas"],
    suggestions: [
      "empanadas",
      "empanadas cerca",
      "empanadas hoy",
      "empanadas en talagante",
      "empanadas a domicilio",
    ],
  },
  {
    trigger: ["mec", "mecan", "mecanico", "mecanica", "taller"],
    suggestions: [
      "mecánico",
      "mecánico a domicilio",
      "mecánico cerca",
      "mecánico en san bernardo",
      "taller mecánico",
    ],
  },
  {
    trigger: ["vet", "veter", "veterin", "mascota", "perro", "gato"],
    suggestions: [
      "veterinaria",
      "veterinaria cerca",
      "veterinaria 24 horas",
      "veterinaria en maipú",
      "veterinaria a domicilio",
    ],
  },
  {
    trigger: ["abog", "legal", "jurid", "contrato", "familia"],
    suggestions: [
      "abogado",
      "abogado familia",
      "abogado laboral",
      "abogado en padre hurtado",
      "asesoría legal",
    ],
  },
  {
    trigger: ["flet", "mud", "traslado", "camion"],
    suggestions: [
      "fletes",
      "fletes cerca",
      "mudanzas",
      "mudanzas en maipú",
      "fletes baratos",
    ],
  },
  {
    trigger: ["psico", "terapia", "emocional", "ansiedad"],
    suggestions: [
      "psicólogo",
      "psicólogo en buin",
      "terapia de pareja",
      "salud mental",
      "psicólogo adolescentes",
    ],
  },
  {
    trigger: ["clas", "ingles", "matemat", "profe", "particular"],
    suggestions: [
      "clases",
      "clases de inglés",
      "clases de matemáticas",
      "clases particulares",
      "profesor particular",
    ],
  },
];

const EXTRA_CONTEXT_SUGGESTIONS = [
  "cerca",
  "a domicilio",
  "urgencia",
  "24 horas",
  "hoy",
  "barato",
];

export default function SearchAutocomplete({
  placeholder = "Ej: gasfiter, dentista, empanadas...",
  initialQuery = "",
  onChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);

  const [comunas, setComunas] = useState<ItemSlug[]>([]);
  const [categorias, setCategorias] = useState<ItemSlug[]>([]);
  const [subcategorias, setSubcategorias] = useState<ItemSlug[]>([]);

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  useEffect(() => {
    async function loadCatalogoBusqueda() {
      try {
        const res = await fetch("/api/catalogo/busqueda", {
          cache: "force-cache",
        });

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "No se pudo cargar el catálogo.");
        }

        setComunas(Array.isArray(data?.items?.comunas) ? data.items.comunas : []);
        setCategorias(Array.isArray(data?.items?.categorias) ? data.items.categorias : []);
        setSubcategorias(
          Array.isArray(data?.items?.subcategorias) ? data.items.subcategorias : []
        );
      } catch {
        setComunas([]);
        setCategorias([]);
        setSubcategorias([]);
      }
    }

    loadCatalogoBusqueda();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    const qNorm = norm(q);

    const subcatMatches = subcategorias
      .filter((s) => includesQuery(s.nombre, qNorm) || includesQuery(s.slug, qNorm))
      .map((s) => s.nombre);

    const catMatches = categorias
      .filter((c) => includesQuery(c.nombre, qNorm) || includesQuery(c.slug, qNorm))
      .map((c) => c.nombre);

    const comunaMatches = comunas
      .filter((c) => includesQuery(c.nombre, qNorm) || includesQuery(c.slug, qNorm))
      .map((c) => c.nombre);

    const combosSubcatComuna = subcategorias.flatMap((s) =>
      comunas
        .filter(
          (c) =>
            includesQuery(s.nombre, qNorm) ||
            includesQuery(c.nombre, qNorm) ||
            includesQuery(`${s.nombre} en ${c.nombre}`, qNorm)
        )
        .slice(0, 3)
        .map((c) => `${s.nombre} en ${c.nombre}`)
    );

    const combosCategoriaComuna = categorias.flatMap((cat) =>
      comunas
        .filter(
          (c) =>
            includesQuery(cat.nombre, qNorm) ||
            includesQuery(c.nombre, qNorm) ||
            includesQuery(`${cat.nombre} en ${c.nombre}`, qNorm)
        )
        .slice(0, 2)
        .map((c) => `${cat.nombre} en ${c.nombre}`)
    );

    const contextMatches = INTENT_RULES.flatMap((rule) => {
      const triggered = rule.trigger.some((t) => qNorm.includes(norm(t)));
      return triggered ? rule.suggestions : [];
    });

    const freeContextMatches = EXTRA_CONTEXT_SUGGESTIONS
      .filter((x) => includesQuery(x, qNorm) || includesQuery(qNorm, x))
      .flatMap((x) => {
        if (x === "cerca") return ["gasfiter cerca", "dentista cerca", "empanadas cerca"];
        if (x === "a domicilio") {
          return [
            "gasfiter a domicilio",
            "mecánico a domicilio",
            "veterinaria a domicilio",
          ];
        }
        if (x === "urgencia") return ["dentista urgencia", "veterinaria urgencia"];
        if (x === "24 horas") return ["veterinaria 24 horas", "farmacia 24 horas"];
        if (x === "hoy") return ["empanadas hoy", "fletes hoy"];
        if (x === "barato") return ["fletes baratos", "gasfiter económico"];
        return [];
      });

    const all = uniq([
      ...subcatMatches,
      ...catMatches,
      ...comunaMatches.map((c) => `servicios en ${c}`),
      ...combosSubcatComuna,
      ...combosCategoriaComuna,
      ...contextMatches,
      ...freeContextMatches,
    ]);

    return all
      .map((text) => ({
        text,
        score: scoreSuggestion(text, qNorm),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text, "es"))
      .slice(0, 8)
      .map((x) => x.text);
  }, [query, comunas, categorias, subcategorias]);

  function emitFreeText(value: string) {
    onChange?.({
      raw: value,
      q: value,
    });
  }

  function selectSuggestion(value: string) {
    const parsed = parseSuggestionValue(value, comunas, categorias, subcategorias);

    setQuery(value);
    onChange?.(parsed);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          emitFreeText(value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 46,
          borderRadius: 12,
          border: "1px solid #d1d5db",
          padding: "0 14px",
          fontSize: 14,
          color: "#111827",
          background: "#fff",
        }}
      />

      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 800,
              color: "#6b7280",
              borderBottom: "1px solid #f3f4f6",
              background: "#fafafa",
            }}
          >
            Sugerencias de búsqueda
          </div>

          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                color: "#111827",
                borderBottom: "1px solid #f9fafb",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}