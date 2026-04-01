import PanelClient from "./PanelClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; id?: string }>;
}) {
  const params = await searchParams;
  const slug = String(params.slug || "").trim();
  const idParam = String(params.id || "").trim();
  let emprendedorId = idParam;
  const supabase = createSupabaseServerClient();

  if (!emprendedorId && slug) {
    const { data: empBySlug } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    emprendedorId =
      empBySlug && typeof (empBySlug as { id?: unknown }).id === "string"
        ? (empBySlug as { id: string }).id
        : "";
  }

  return (
    <main className="w-full">
      <PanelClient id={emprendedorId} slug={slug} esPremium={false} />
    </main>
  );
}