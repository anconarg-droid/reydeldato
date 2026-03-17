import PanelClient from "./PanelClient";

export default async function PanelPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const id = sp?.id || "";

  return <PanelClient id={id} />;
}