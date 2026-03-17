import Link from "next/link";
import ComunaAutocompleteClient from "@/components/ComunaAutocompleteClient";
import HoverCard from "@/components/HoverCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CategoriaSearchBox from "@/components/CategoriaSearchBox";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
};

type Subcategoria = {
  id: string;
  categoria_id: string;
  nombre: string;
  slug: string;
};

type ComunaOption = {
  slug: string;
  nombre: string;
  region_nombre?: string | null;
};

type Emprendedor = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta?: string | null;
  foto_principal_url?: string | null;
  comuna_base_slug?: string | null;
  categoria_slug?: string | null;
  subcategorias_slugs?: string | null;
  comunas_cobertura_slugs?: string | null;
  nivel_cobertura?: string | null;
  _bucket?: "exacta" | "cobertura_comuna" | "regional" | "nacional" | "general";
  _motivo?: string;
};

function norm(s?: string | null) {
  return (s ?? "").toString().trim().toLowerCase();
}

function pretty(s?: string | null) {
  return (s ?? "")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function parseTextList(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((x) => norm(x))
    .filter(Boolean);
}

function matchesFreeText(item: Emprendedor, q: string) {
  if (!q) return true;

  const text = [
    item.nombre,
    item.descripcion_corta,
    item.categoria_slug,
    item.subcategorias_slugs,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes(q);
}

function getBucket(item: Emprendedor, comunaBuscada: string): Emprendedor["_bucket"] {
  const comunaBase = norm(item.comuna_base_slug);
  const nivel = norm(item.nivel_cobertura);
  const comunasCobertura = parseTextList(item.comunas_cobertura_slugs);

  if (comunaBuscada && comunaBase === comunaBuscada) return "exacta";

  if (comunaBuscada && comunasCobertura.includes(comunaBuscada)) {
    return "cobertura_comuna";
  }

  if (
    nivel === "regional" ||
    nivel === "toda_la_region" ||
    nivel === "varias_regiones"
  ) {
    return "regional";
  }

  if (nivel === "nacional") return "nacional";

  return "general";
}

function getMotivo(bucket?: Emprendedor["_bucket"]) {
  if (bucket === "exacta") return "Está en tu comuna";
  if (bucket === "cobertura_comuna") return "Atiende tu comuna";
  if (bucket === "regional") return "Cobertura regional";
  if (bucket === "nacional") return "Cobertura nacional";
  return "Resultado general";
}

function SectionBlock({
  title,
  helper,
  items,
}: {
  title: string;
  helper?: string;
  items: Emprendedor[];
}) {
  if (!items.length) return null;

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 26,
        padding: "22px 22px 24px",
        marginBottom: 22,
        boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 32,
              lineHeight: 1.05,
              fontWeight: 900,
              color: "#111827",
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </h3>

          {helper ? (
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              {helper}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 38,
            height: 38,
            padding: "0 12px",
            borderRadius: 999,
            background: "#f8fafc",
            border: "1px solid #d1d5db",
            color: "#111827",
            fontSize: 14,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {items.length}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 20,
        }}
      >
        {items.map((item) => (
          <HoverCard
            key={item.id}
            item={{
              id: item.id,
              slug: item.slug,
              nombre: item.nombre,
              descripcion_corta: item.descripcion_corta || undefined,
              foto_principal_url: item.foto_principal_url || undefined,
              comuna_base_slug: item.comuna_base_slug || undefined,
              categoria_slug: item.categoria_slug || undefined,
              _bucket: item._bucket,
              _motivo: item._motivo,
            }}
          />
        ))}
      </div>
    </section>
  );
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    subcategoria?: string;
    comuna?: string;
    q?: string;
  }>;
};

export default async function CategoriaPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

  const subcategoriaActiva = norm(resolvedSearch?.subcategoria || "");
  const comuna = norm(resolvedSearch?.comuna || "");
  const q = norm(resolvedSearch?.q || "");

  const supabase = createSupabaseServerClient();

  const [
    { data: categoriasRaw, error: categoriasError },
    { data: categoriaActualRaw, error: categoriaActualError },
    { data: subcategoriasRaw, error: subcategoriasError },
    { data: emprendedoresRaw, error: emprendedoresError },
    { data: comunasRaw, error: comunasError },
  ] = await Promise.all([
    supabase.from("categorias").select("id,nombre,slug").order("nombre"),
    supabase.from("categorias").select("id,nombre,slug").eq("slug", slug).maybeSingle(),
    supabase.from("subcategorias").select("id,categoria_id,nombre,slug").order("nombre"),
    supabase
      .from("vw_emprendedores_algolia_final")
      .select(`
        id,
        slug,
        nombre,
        descripcion_corta,
        foto_principal_url,
        comuna_base_slug,
        categoria_slug,
        subcategorias_slugs,
        comunas_cobertura_slugs,
        nivel_cobertura
      `)
      .eq("categoria_slug", slug)
      .limit(1000),
    supabase
      .from("vw_comunas_busqueda")
      .select("slug,nombre,region_nombre")
      .order("nombre"),
  ]);

  if (categoriasError || categoriaActualError || subcategoriasError || comunasError) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 28,
          }}
        >
          <h1 style={{ margin: "0 0 10px", fontSize: 34, fontWeight: 900, color: "#111827" }}>
            Error cargando categoría
          </h1>
          <p style={{ margin: 0, color: "#4b5563", fontSize: 16, lineHeight: 1.6 }}>
            Hubo un problema cargando la estructura de esta categoría.
          </p>
        </div>
      </main>
    );
  }

  const categoriasRawList = (categoriasRaw as Categoria[] | null) || [];
  // Taxonomía v1: no mostrar "Otros" en listado público de categorías
  const categorias = categoriasRawList.filter((c) => norm(c.slug) !== "otros");
  const categoriaActualRawData = categoriaActualRaw as Categoria | null;
  const categoriaActual =
    categoriaActualRawData && norm(categoriaActualRawData.slug) === "otros" ? null : categoriaActualRawData;
  const subcategorias = (subcategoriasRaw as Subcategoria[] | null) || [];
  const comunas = (comunasRaw as ComunaOption[] | null) || [];

  const comunasPopulares = comunas.filter((c) =>
    [
      "maipu",
      "padre-hurtado",
      "calera-de-tango",
      "san-bernardo",
      "talagante",
      "penaflor",
      "buin",
    ].includes(norm(c.slug))
  );

  if (!categoriaActual) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 28,
          }}
        >
          <h1 style={{ margin: "0 0 10px", fontSize: 34, fontWeight: 900, color: "#111827" }}>
            Categoría no encontrada
          </h1>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              textDecoration: "none",
              fontWeight: 800,
              color: "#111827",
              background: "#fff",
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  if (emprendedoresError) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 28,
          }}
        >
          <h1 style={{ margin: "0 0 10px", fontSize: 34, fontWeight: 900, color: "#111827" }}>
            Error cargando resultados
          </h1>

          <p style={{ margin: 0, color: "#4b5563", fontSize: 16, lineHeight: 1.6 }}>
            No se pudieron cargar los negocios.
          </p>

          <p style={{ marginTop: 10, color: "#991b1b", fontSize: 14 }}>
            {emprendedoresError.message}
          </p>
        </div>
      </main>
    );
  }

  let items = ((emprendedoresRaw as Emprendedor[] | null) || []).filter(
    (item) => norm(item.categoria_slug) === norm(categoriaActual.slug)
  );

  if (subcategoriaActiva) {
    items = items.filter((item) =>
      parseTextList(item.subcategorias_slugs).includes(subcategoriaActiva)
    );
  }

  if (q) {
    items = items.filter((item) => matchesFreeText(item, q));
  }

  const itemsConBucket = items
    .map((item) => {
      const bucket = comuna ? getBucket(item, comuna) : "general";

      return {
        ...item,
        _bucket: bucket,
        _motivo: getMotivo(bucket),
      };
    })
    .sort((a, b) => {
      const order = {
        exacta: 1,
        cobertura_comuna: 2,
        regional: 3,
        nacional: 4,
        general: 5,
      };

      const bucketA = order[a._bucket || "general"];
      const bucketB = order[b._bucket || "general"];

      if (bucketA !== bucketB) return bucketA - bucketB;
      return norm(a.nombre).localeCompare(norm(b.nombre));
    });

  const bucket1 = itemsConBucket.filter((x) => x._bucket === "exacta");
  const bucket2 = itemsConBucket.filter((x) => x._bucket === "cobertura_comuna");
  const bucket3 = itemsConBucket.filter((x) => x._bucket === "regional");
  const bucket4 = itemsConBucket.filter((x) => x._bucket === "nacional");
  const noComunaItems = !comuna ? itemsConBucket : [];

  const titleRight = subcategoriaActiva
    ? `${pretty(subcategoriaActiva)} en ${categoriaActual.nombre}`
    : `Todos los negocios de ${categoriaActual.nombre}`;

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "#111827",
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: "-0.02em",
            }}
          >
            Rey del Dato
          </Link>

          <Link
            href="/publicar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              padding: "0 16px",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Publicar emprendimiento
          </Link>
        </div>
      </header>

      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 20px 48px",
        }}
      >
        <div style={{ marginBottom: 20, fontSize: 13, color: "#64748b", fontWeight: 700 }}>
          <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>
            Inicio
          </Link>
          {" / "}
          <span>Categorías</span>
          {" / "}
          <span>{categoriaActual.nombre}</span>
        </div>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 26,
            padding: "26px 24px",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontSize: 13,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            Categoría activa: {categoriaActual.nombre}
          </div>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 44,
              lineHeight: 1.02,
              fontWeight: 900,
              color: "#111827",
              letterSpacing: "-0.04em",
            }}
          >
            {categoriaActual.nombre}
          </h1>

          <p
            style={{
              margin: "0 0 20px",
              color: "#4b5563",
              fontSize: 17,
              lineHeight: 1.7,
              maxWidth: 900,
            }}
          >
            Explora negocios y servicios de esta categoría. Puedes buscar algo específico, elegir una subcategoría a la izquierda y, si quieres priorizar tu zona, escribir tu comuna.
          </p>

          <form
            method="get"
            action={`/categoria/${categoriaActual.slug}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
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
                  fontWeight: 900,
                  marginBottom: 6,
                  color: "#111827",
                }}
              >
                Busca dentro de esta categoría
              </label>

              <CategoriaSearchBox
  actionBase={`/categoria/${categoriaActual.slug}`}
  initialQ={q}
  comuna={comuna}
  subcategoria={subcategoriaActiva}
/>
            </div>

            <div>
              <ComunaAutocompleteClient
                name="comuna"
                defaultValue={comuna}
                options={comunas}
                popularOptions={comunasPopulares}
                placeholder="Escribe tu comuna (ej: Maipú, Calera de Tango)"
                label="Si quieres ordenar mejor, escribe tu comuna"
              />

              {subcategoriaActiva ? (
                <input type="hidden" name="subcategoria" value={subcategoriaActiva} />
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="submit"
                style={{
                  height: 52,
                  padding: "0 18px",
                  border: "none",
                  borderRadius: 14,
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Filtrar
              </button>

              <Link
                href={`/categoria/${categoriaActual.slug}${
                  subcategoriaActiva
                    ? `?subcategoria=${encodeURIComponent(subcategoriaActiva)}`
                    : ""
                }`}
                style={{
                  height: 52,
                  padding: "0 18px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  fontWeight: 800,
                  color: "#111827",
                  background: "#fff",
                }}
              >
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "360px minmax(0,1fr)",
            gap: 22,
            alignItems: "start",
          }}
        >
          <aside
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 24,
              padding: 18,
              position: "sticky",
              top: 84,
              maxHeight: "calc(100vh - 110px)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                marginBottom: 16,
                fontSize: 12,
                color: "#64748b",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Categorías
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
                maxHeight: "calc(100vh - 180px)",
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {categorias.map((cat) => {
                const activeCategoria = norm(cat.slug) === norm(categoriaActual.slug);
                const subs = subcategorias.filter((s) => s.categoria_id === cat.id);

                return (
                  <div
                    key={cat.id}
                    style={{
                      border: activeCategoria ? "2px solid #93c5fd" : "1px solid #e5e7eb",
                      background: activeCategoria ? "#eff6ff" : "#fff",
                      borderRadius: 18,
                      overflow: "hidden",
                      boxShadow: activeCategoria
                        ? "0 8px 22px rgba(37,99,235,0.10)"
                        : "none",
                    }}
                  >
                    <Link
                      href={`/categoria/${cat.slug}${
                        comuna ? `?comuna=${encodeURIComponent(comuna)}` : ""
                      }${q ? `${comuna ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
                      style={{
                        display: "block",
                        padding: "14px 16px",
                        textDecoration: "none",
                        fontWeight: 900,
                        fontSize: 17,
                        lineHeight: 1.2,
                        color: "#2563eb",
                        textTransform: activeCategoria ? "uppercase" : "none",
                        letterSpacing: activeCategoria ? "0.01em" : "normal",
                      }}
                    >
                      {cat.nombre}
                    </Link>

                    {activeCategoria ? (
                      <div
                        style={{
                          borderTop: "1px solid #dbeafe",
                          padding: 12,
                          display: "grid",
                          gap: 10,
                          background: "#f8fbff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.10em",
                            padding: "0 2px 2px",
                          }}
                        >
                          Subcategorías
                        </div>

                        <Link
                          href={`/categoria/${cat.slug}${
                            comuna ? `?comuna=${encodeURIComponent(comuna)}` : ""
                          }${q ? `${comuna ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 36,
                            padding: "0 12px",
                            borderRadius: 999,
                            textDecoration: "none",
                            fontWeight: 800,
                            fontSize: 14,
                            border: !subcategoriaActiva
                              ? "1px solid #93c5fd"
                              : "1px solid #dbeafe",
                            background: !subcategoriaActiva ? "#dbeafe" : "#fff",
                            color: "#2563eb",
                            width: "fit-content",
                          }}
                        >
                          Todas
                        </Link>

                        {subs.length ? (
                          subs.map((sub) => {
                            const activeSub = norm(sub.slug) === subcategoriaActiva;

                            const params = new URLSearchParams();
                            params.set("subcategoria", sub.slug);
                            if (comuna) params.set("comuna", comuna);
                            if (q) params.set("q", q);

                            return (
                              <Link
                                key={sub.id}
                                href={`/categoria/${cat.slug}?${params.toString()}`}
                                style={{
                                  display: "block",
                                  padding: "11px 12px",
                                  borderRadius: 12,
                                  textDecoration: "none",
                                  fontWeight: activeSub ? 800 : 700,
                                  fontSize: 15,
                                  border: activeSub
                                    ? "1px solid #93c5fd"
                                    : "1px solid #e5e7eb",
                                  background: activeSub ? "#dbeafe" : "#fff",
                                  color: "#2563eb",
                                }}
                              >
                                • {sub.nombre}
                              </Link>
                            );
                          })
                        ) : (
                          <div
                            style={{
                              padding: "12px 12px",
                              borderRadius: 12,
                              border: "1px dashed #cbd5e1",
                              color: "#6b7280",
                              fontSize: 14,
                              lineHeight: 1.5,
                              background: "#fff",
                            }}
                          >
                            Esta categoría aún no tiene subcategorías visibles.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>

          <div>
            <section
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 26,
                padding: "22px 22px 24px",
                marginBottom: 20,
                boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 34,
                    padding: "0 12px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  {categoriaActual.nombre}
                </span>

                {subcategoriaActiva ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 34,
                      padding: "0 12px",
                      borderRadius: 999,
                      background: "#f8fafc",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    • {pretty(subcategoriaActiva)}
                  </span>
                ) : null}

                {comuna ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 34,
                      padding: "0 12px",
                      borderRadius: 999,
                      background: "#f8fafc",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    Comuna: {pretty(comuna)}
                  </span>
                ) : null}

                {q ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 34,
                      padding: "0 12px",
                      borderRadius: 999,
                      background: "#f8fafc",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    Búsqueda: {q}
                  </span>
                ) : null}
              </div>

              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: 34,
                  lineHeight: 1.05,
                  fontWeight: 900,
                  color: "#111827",
                  letterSpacing: "-0.03em",
                }}
              >
                {titleRight}
              </h2>

              <p
                style={{
                  margin: "0 0 10px",
                  color: "#4b5563",
                  fontSize: 16,
                  lineHeight: 1.65,
                  maxWidth: 860,
                }}
              >
                {comuna
                  ? `Mostramos primero negocios de ${pretty(comuna)}, luego los que atienden esa comuna y después coberturas más amplias.`
                  : `Aquí ves todos los negocios publicados en ${categoriaActual.nombre}. Si quieres afinar mejor, usa búsqueda libre o escribe tu comuna.`}
              </p>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                {itemsConBucket.length} resultado{itemsConBucket.length === 1 ? "" : "s"}
              </div>
            </section>

            {!itemsConBucket.length ? (
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 24,
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  No encontramos resultados
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#4b5563",
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  Prueba otra subcategoría, cambia la comuna o usa una búsqueda más amplia.
                </p>
              </section>
            ) : comuna ? (
              <>
                <SectionBlock
                  title="⭐ En tu comuna"
                  helper="Negocios ubicados directamente en la comuna que escribiste."
                  items={bucket1}
                />

                <SectionBlock
                  title="📍 Atienden tu comuna"
                  helper="Negocios de otras comunas que también atienden la comuna que escribiste."
                  items={bucket2}
                />

                <SectionBlock
                  title="🌎 Cobertura regional"
                  helper="Negocios con cobertura más amplia dentro de la región."
                  items={bucket3}
                />

                <SectionBlock
                  title="🇨🇱 Cobertura nacional"
                  helper="Negocios con atención nacional."
                  items={bucket4}
                />
              </>
            ) : (
              <SectionBlock
                title={titleRight}
                helper="Aquí ves todos los negocios de esta categoría o subcategoría."
                items={noComunaItems}
              />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}