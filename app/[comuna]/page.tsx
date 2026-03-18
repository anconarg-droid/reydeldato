import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BuscarClient from "@/app/buscar/BuscarClient";
import ComunaEnPreparacion from "@/components/ComunaEnPreparacion";

type PageProps = {
  params: Promise<{ comuna: string }>;
  searchParams?: Promise<{ subcategoria?: string }> | { subcategoria?: string };
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { comuna: comunaSlug } = await params;
  const slug = s(comunaSlug).toLowerCase().replace(/\s+/g, "-");
  if (!slug) return { title: "Comuna | Rey del Dato" };

  const supabase = createSupabaseServerClient();
  const [
    { data: activa },
    { data: resumen },
    { data: comuna },
  ] = await Promise.all([
    supabase.from("comunas_activas").select("comuna_nombre").eq("comuna_slug", slug).maybeSingle(),
    supabase.from("vw_comunas_por_abrir").select("comuna_nombre").eq("comuna_slug", slug).maybeSingle(),
    supabase.from("comunas").select("nombre").eq("slug", slug).maybeSingle(),
  ]);

  const nombre =
    s(activa?.comuna_nombre) ||
    s((resumen as any)?.comuna_nombre) ||
    s((comuna as any)?.nombre) ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `Emprendimientos y servicios en ${nombre} | Rey del Dato`,
    description: `Encuentra emprendimientos y servicios en ${nombre}. Contacta directo por WhatsApp con negocios de tu comuna.`,
  };
}

export default async function ComunaPage({ params, searchParams }: PageProps) {
  const { comuna: comunaSlug } = await params;
  const slug = s(comunaSlug).toLowerCase().replace(/\s+/g, "-");
  if (!slug) notFound();
  const sp = searchParams ? await searchParams : {};
  const subcategoriaFromQuery = s((sp as { subcategoria?: string }).subcategoria || "");

  const supabase = createSupabaseServerClient();

  const [
    { data: activaRow },
    { data: resumenRow },
    { data: comunaRow },
  ] = await Promise.all([
    supabase
      .from("comunas_activas")
      .select("comuna_slug, comuna_nombre, activa")
      .eq("comuna_slug", slug)
      .maybeSingle(),
    supabase
      .from("vw_comunas_por_abrir")
      .select("comuna_slug, comuna_nombre, total_emprendedores, avance_porcentaje, faltan_emprendedores_meta")
      .eq("comuna_slug", slug)
      .maybeSingle(),
    supabase
      .from("comunas")
      .select("slug, nombre")
      .eq("slug", slug)
      .maybeSingle(),
  ]);

  const comunaNombre =
    s(activaRow?.comuna_nombre) ||
    s((resumenRow as any)?.comuna_nombre) ||
    s((comunaRow as any)?.nombre) ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const activa = activaRow?.activa === true;

  if (!activaRow && !resumenRow && !comunaRow) {
    notFound();
  }

  if (activa) {
    return (
      <BuscarClient
        initialComuna={slug}
        initialComunaNombre={comunaNombre || undefined}
        initialSubcategoria={subcategoriaFromQuery || undefined}
      />
    );
  }

  // Regla final: comuna no abierta => llevar directo a la página de apertura.
  return redirect(`/abrir-comuna/${slug}`);

  const total = Number((resumenRow as any)?.total_emprendedores) || 0;
  const faltan = Number((resumenRow as any)?.faltan_emprendedores_meta) || 40;
  const progreso = [
    {
      nombre: "Emprendimientos",
      actual: total,
      meta: Math.max(total + 1, total + faltan),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ComunaEnPreparacion
          comunaSlug={slug}
          comunaNombre={comunaNombre}
          progreso={progreso}
        />
      </div>
    </main>
  );
}
