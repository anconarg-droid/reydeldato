import EstadisticasClient from "./EstadisticasClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await params;
  return <EstadisticasClient slug={p.slug} />;
}