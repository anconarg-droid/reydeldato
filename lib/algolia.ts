import algoliasearch from "algoliasearch";

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

export const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME!);

export async function indexarEmprendedor(emprendedor:any) {

  const record = {
    objectID: emprendedor.slug,
    slug: emprendedor.slug,
    nombre: emprendedor.nombre,
    categoria: emprendedor.categoria_nombre,
    subcategorias: emprendedor.subcategorias_nombres,
    comuna: emprendedor.comuna_nombre,
    cobertura: emprendedor.cobertura_tipo,
    comunas: emprendedor.cobertura_comunas_arr,
    modalidades: emprendedor.modalidades_arr,
    whatsapp: emprendedor.whatsapp,
    instagram: emprendedor.instagram,
    web: emprendedor.sitio_web
  };

  await index.saveObject(record);
}