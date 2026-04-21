import type { Metadata } from "next";
import PreviewFichaClient from "./PreviewFichaClient";

export const metadata: Metadata = {
  title: "Vista previa de ficha | Rey del Dato",
  robots: { index: false, follow: false },
};

function firstQuery(
  v: string | string[] | undefined,
): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    const hit = v.find((x) => String(x ?? "").trim());
    return hit != null ? String(hit).trim() : "";
  }
  return String(v).trim();
}

export default async function PreviewFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const token = firstQuery(sp.token) || firstQuery(sp.access_token);

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4">
      <PreviewFichaClient emprendedorId={String(id ?? "").trim()} initialToken={token} />
    </main>
  );
}
