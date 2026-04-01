import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * @deprecated (legacy)
 * UI legacy para “abrir comuna” (v1). Se mantiene solo por compatibilidad y
 * redirige a la página canónica `/abrir-comuna/[slug]` (v2).
 */
export default async function AbrirComunaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/abrir-comuna/${encodeURIComponent(String(slug || "").trim())}`);
}

