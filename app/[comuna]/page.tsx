import Link from "next/link";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { comunaPublicaAbierta } from "@/lib/comunaPublicaAbierta";
import { normalizeText } from "@/lib/search/normalizeText";
import {
  createSupabaseServerClient,
  createSupabaseServerPublicClient,
} from "@/lib/supabase/server";
import ResultadosClient from "@/app/resultados/ResultadosClient";

type PageProps = {
  params: Promise<{ comuna: string }>;
  searchParams?:
    | Promise<{ q?: string; subcategoria?: string; subcategoria_id?: string }>
    | { q?: string; subcategoria?: string; subcategoria_id?: string };
};

export default async function ComunaPage({ params, searchParams }: PageProps) {
  const { comuna } = await params;
  const canonical = slugify(comuna);

  const sb = createSupabaseServerClient();

  const { data: comunaRow } = await sb
    .from("comunas")
    .select("id, slug, nombre, forzar_abierta, motivo_apertura_override")
    .eq("slug", canonical)
    .maybeSingle();

  if (!comunaRow?.id) {
    redirect(`/resultados?comuna=${encodeURIComponent(canonical)}`);
  }

  const { data: vwRow } = await sb
    .from("vw_apertura_comuna_v2")
    .select("porcentaje_apertura")
    .eq("comuna_slug", canonical)
    .maybeSingle();

  const vw = vwRow
    ? { porcentaje_apertura: Number((vwRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? 0) }
    : null;

  const comuna_publica_abierta = comunaPublicaAbierta(
    (comunaRow as { forzar_abierta?: unknown }).forzar_abierta,
    vw
  );

  const { data: config } = await sb
    .from("comunas_config")
    .select("activa")
    .eq("comuna_id", comunaRow.id)
    .maybeSingle();

  if (config?.activa === false) {
    redirect(`/abrir-comuna/${encodeURIComponent(canonical)}`);
  }

  if (!comuna_publica_abierta) {
    redirect(`/abrir-comuna/${encodeURIComponent(canonical)}`);
  }

  const sp = searchParams
    ? await Promise.resolve(searchParams)
    : {};
  const qRaw = (sp.q ?? "").trim();
  const q = qRaw ? normalizeText(qRaw) : "";
  const subcategoriaRaw = (sp.subcategoria ?? "").trim();
  const subcategoria = subcategoriaRaw ? slugify(subcategoriaRaw) : "";
  const subcategoriaIdRaw = (sp.subcategoria_id ?? "").trim();
  const subcategoriaId = subcategoriaIdRaw ? subcategoriaIdRaw : "";

  // Nombre visible (con tildes) para el hero/título.
  let comunaNombre: string | null = comunaRow?.nombre ? String(comunaRow.nombre) : null;
  if (!comunaNombre) {
    const pub = createSupabaseServerPublicClient();
    const { data } = await pub
      .from("comunas")
      .select("nombre")
      .eq("slug", canonical)
      .maybeSingle();
    comunaNombre = data?.nombre ? String(data.nombre) : null;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          ← Inicio
        </Link>
        <ResultadosClient
          initialQDisplay={qRaw}
          initialComuna={canonical}
          initialComunaNombre={comunaNombre}
          initialQ={q || null}
          initialSubcategoriaSlug={subcategoria || null}
          initialSubcategoriaId={subcategoriaId || null}
          globalDb={null}
        />
      </div>
    </main>
  );
}