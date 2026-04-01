import { createSupabaseServerClient } from "@/lib/supabase/server";
import NegocioForm from "@/app/components/panel/NegocioForm";
import Link from "next/link";

export type MejorarFichaFocus = "fotos" | "descripcion" | "redes";

const FOCUS_KEYS: MejorarFichaFocus[] = ["fotos", "descripcion", "redes"];

function parseMejorarFichaFocus(raw: string | undefined): MejorarFichaFocus | null {
  const v = String(raw || "").trim().toLowerCase();
  return FOCUS_KEYS.includes(v as MejorarFichaFocus) ? (v as MejorarFichaFocus) : null;
}

type PageProps = {
  searchParams?: Promise<{ id?: string; slug?: string; focus?: string }>;
};

export default async function MejorarFichaPage({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const idParam = String(params.id || "").trim();
  const slug = String(params.slug || "").trim();
  const focus = parseMejorarFichaFocus(params.focus);

  const supabase = createSupabaseServerClient();
  let emprendedorId = idParam;

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

  if (!emprendedorId) {
    return (
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            No encontramos tu emprendimiento
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Abre esta vista desde el panel de tu emprendimiento para editar tu ficha.
          </p>
          <Link
            href="/panel"
            className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            Ir al panel
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NegocioForm id={emprendedorId} mode="upgrade" focus={focus} />
    </main>
  );
}