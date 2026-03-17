type ItemSlug = {
  id: number | string;
  nombre: string;
  slug: string;
  categoria_id?: number | string;
};

type ParseInput = {
  query: string;
  comunas: ItemSlug[];
  categorias: ItemSlug[];
  subcategorias: ItemSlug[];
};

export function parseBusqueda({
  query,
  comunas,
  categorias,
  subcategorias,
}: ParseInput) {

  const q = (query || "").toLowerCase().trim();

  let comunaDetectada: ItemSlug | null = null;
  let categoriaDetectada: ItemSlug | null = null;
  let subcategoriaDetectada: ItemSlug | null = null;

  for (const comuna of comunas) {
    if (q.includes(comuna.slug) || q.includes(comuna.nombre.toLowerCase())) {
      comunaDetectada = comuna;
      break;
    }
  }

  for (const categoria of categorias) {
    if (q.includes(categoria.slug) || q.includes(categoria.nombre.toLowerCase())) {
      categoriaDetectada = categoria;
      break;
    }
  }

  for (const sub of subcategorias) {
    if (q.includes(sub.slug) || q.includes(sub.nombre.toLowerCase())) {
      subcategoriaDetectada = sub;
      break;
    }
  }

  return {
    comunaDetectada,
    categoriaDetectada,
    subcategoriaDetectada,
    textoLibre: q
  };
}