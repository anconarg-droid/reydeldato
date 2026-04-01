import { redirect } from "next/navigation";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ comuna: string; slug: string }>;
};

export default async function ComunaSlugRedirectPage({ params }: PageProps) {
  const { comuna, slug } = await params;
  const comunaSlug = slugify(comuna);
  const raw = decodeURIComponent(slug).trim();
  const slugNorm = slugify(raw);

  const db = supabaseAdmin ?? supabase;
  const { data: sub } = await db
    .from("subcategorias")
    .select("slug")
    .eq("slug", slugNorm.toLowerCase())
    .maybeSingle();

  if (sub?.slug) {
    // URL pública canónica: /[comuna]?subcategoria=...
    redirect(
      `/${encodeURIComponent(comunaSlug)}?subcategoria=${encodeURIComponent(slugNorm)}`
    );
  }

  // URL pública canónica: /[comuna]?q=...
  redirect(`/${encodeURIComponent(comunaSlug)}?q=${encodeURIComponent(raw)}`);
}

