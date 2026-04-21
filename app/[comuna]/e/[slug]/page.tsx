import { redirect } from "next/navigation";

type Params = { comuna: string; slug: string };

/**
 * URL amigable /{comuna}/e/{slug} → ficha canónica /emprendedor/{slug}.
 */
export default async function ComunaEmprendedorAliasPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const s = String(slug ?? "").trim();
  if (!s) {
    redirect("/");
  }
  redirect(`/emprendedor/${encodeURIComponent(s)}`);
}
