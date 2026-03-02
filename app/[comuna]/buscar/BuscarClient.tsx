"use client";

import { useEffect, useState } from "react";

type Item = any;

function prioridad(item: Item, comunaSlug: string, regionId: string | null) {
  // 1) Base exacta en la comuna buscada
  if (item.comuna_base_slug === comunaSlug) return 1;

  // 2) Cobertura por comunas
  if (
    item.nivel_cobertura === "varias_comunas" &&
    Array.isArray(item.cobertura_comunas_slugs) &&
    item.cobertura_comunas_slugs.includes(comunaSlug)
  ) {
    return 2;
  }

  // 3) Cobertura por regiones
  if (
    item.nivel_cobertura === "varias_regiones" &&
    regionId &&
    Array.isArray(item.region_ids) &&
    item.region_ids.includes(regionId)
  ) {
    return 3;
  }

  // 4) Nacional
  if (item.nivel_cobertura === "nacional") return 4;

  return 9;
}

function ordenarResultados(
  items: Item[],
  comunaSlug: string,
  regionId: string | null
) {
  return [...items].sort(
    (a, b) =>
      prioridad(a, comunaSlug, regionId) -
      prioridad(b, comunaSlug, regionId)
  );
}

export default function BuscarClient({
  comuna,
  q,
}: {
  comuna: string;
  q: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        `/api/buscar?comuna=${encodeURIComponent(
          comuna
        )}&q=${encodeURIComponent(q)}`
      );
      const json = await res.json();
      setData(json);
      setLoading(false);
    }

    fetchData();
  }, [comuna, q]);

  if (loading) return <p>Cargando...</p>;

  if (!data?.ok || !data?.data?.base?.length) {
    return <p>No hay resultados.</p>;
  }

  const regionId = data.regionId ?? null;

  const ordenados = ordenarResultados(
    data.data.base,
    comuna,
    regionId
  );

  return (
    <div style={{ padding: 40 }}>
      <h1>Resultados en {comuna}</h1>

      {ordenados.map((item: any) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
            borderRadius: 10,
          }}
        >
          <h2>{item.nombre}</h2>
          <p>{item.descripcion_corta}</p>
          <p>Categoría: {item.categoria_nombre}</p>
          <p>Nivel cobertura: {item.nivel_cobertura}</p>
        </div>
      ))}
    </div>
  );
}