import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BuscarClient from "@/app/buscar/BuscarClient";
import ComunaEnPreparacion from "@/components/ComunaEnPreparacion";

type PageProps = {
  params: Promise<{ comuna: string; subcategoria: string }>;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function prettyText(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { comuna: comunaSlug, subcategoria: subSlug } = await params;
  const comunaNorm = s(comunaSlug).toLowerCase().replace(/\s+/g, "-");
  const subNorm = s(subSlug).toLowerCase().replace(/\s+/g, "-");
  if (!comunaNorm || !subNorm) return { title: "Comuna | Rey del Dato" };

  const supabase = createSupabaseServerClient();
  const [{ data: activa }, { data: comuna }] = await Promise.all([
    supabase
      .from("comunas_activas")
      .select("comuna_nombre")
      .eq("comuna_slug", comunaNorm)
      .maybeSingle(),
    supabase.from("comunas").select("nombre").eq("slug", comunaNorm).maybeSingle(),
  ]);

  const comunaNombre =
    s(activa?.comuna_nombre) ||
    s((comuna as any)?.nombre) ||
    comunaNorm.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const subNombre = prettyText(subNorm);

  return {
    title: `${subNombre} en ${comunaNombre} | Rey del Dato`,
    description: `Encuentra ${subNombre.toLowerCase()} en ${comunaNombre}. Revisa negocios locales y contacta directo por WhatsApp.`,
  };
}

export default async function ComunaSubcategoriaPage({ params }: PageProps) {
  const { comuna: comunaSlug, subcategoria: subSlug } = await params;
  const comuna = s(comunaSlug).toLowerCase().replace(/\s+/g, "-");
  const subcategoria = s(subSlug).toLowerCase().replace(/\s+/g, "-");
  if (!comuna || !subcategoria) notFound();

  const supabase = createSupabaseServerClient();

  const [
    { data: activaRow },
    { data: resumenRow },
    { data: comunaRow },
  ] = await Promise.all([
    supabase
      .from("comunas_activas")
      .select("comuna_slug, comuna_nombre, activa")
      .eq("comuna_slug", comuna)
      .maybeSingle(),
    supabase
      .from("vw_comunas_por_abrir")
      .select("comuna_slug, comuna_nombre, total_emprendedores, faltan_emprendedores_meta")
      .eq("comuna_slug", comuna)
      .maybeSingle(),
    supabase
      .from("comunas")
      .select("slug, nombre")
      .eq("slug", comuna)
      .maybeSingle(),
  ]);

  const comunaNombre =
    s(activaRow?.comuna_nombre) ||
    s((resumenRow as any)?.comuna_nombre) ||
    s((comunaRow as any)?.nombre) ||
    comuna.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const activa = activaRow?.activa === true;

  if (!activaRow && !resumenRow && !comunaRow) {
    notFound();
  }

  if (activa) {
    return (
      <BuscarClient
        initialComuna={comuna}
        initialComunaNombre={comunaNombre || undefined}
        initialSubcategoria={subcategoria}
      />
    );
  }

  const total = Number((resumenRow as any)?.total_emprendedores) || 0;
  const faltan = Number((resumenRow as any)?.faltan_emprendedores_meta) || 40;
  const progreso = [
    { nombre: "Emprendimientos", actual: total, meta: Math.max(total + 1, total + faltan) },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ComunaEnPreparacion
          comunaSlug={comuna}
          comunaNombre={comunaNombre}
          progreso={progreso}
        />
      </div>
    </main>
  );
}
