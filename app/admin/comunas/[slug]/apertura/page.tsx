import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Ruta canónica: `/admin/apertura-comuna/[slug]` */
export default async function AdminComunaAperturaLegacyRedirect({ params }: PageProps) {
  const { slug } = await params;
  const s = String(slug || "").trim().toLowerCase();
  if (!s) {
    redirect("/admin/apertura-comunas");
  }
  redirect(`/admin/apertura-comuna/${encodeURIComponent(s)}`);
}
