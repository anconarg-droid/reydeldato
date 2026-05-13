"use client";

import dynamic from "next/dynamic";
import PublicarFormLoadingPlaceholder from "@/components/publicar/PublicarFormLoadingPlaceholder";

type Comuna = {
  id: string;
  nombre: string;
  slug: string;
  region_id?: string | null;
  region_nombre?: string | null;
  display_name?: string | null;
};

type Region = { id: string; nombre: string; slug: string };

export type PublicarSimpleClientGateProps = {
  comunas: Comuna[];
  regiones: Region[];
  initialPostulacionId?: string | null;
  initialEdicionBasicaEmprendedorId?: string | null;
  initialEdicionBasicaAccessToken?: string | null;
};

const PublicarSimpleClient = dynamic(() => import("./PublicarSimpleClient"), {
  ssr: false,
  loading: () => (
    <main className="min-h-[50vh] px-6 py-10">
      <PublicarFormLoadingPlaceholder className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-50 py-16" />
    </main>
  ),
});

export default function PublicarSimpleClientGate(props: PublicarSimpleClientGateProps) {
  return <PublicarSimpleClient {...props} />;
}
