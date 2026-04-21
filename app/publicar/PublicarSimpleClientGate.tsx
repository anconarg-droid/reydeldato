"use client";

import dynamic from "next/dynamic";

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
    <main style={{ minHeight: "50vh", padding: 24 }}>
      <p>Cargando formulario…</p>
    </main>
  ),
});

export default function PublicarSimpleClientGate(props: PublicarSimpleClientGateProps) {
  return <PublicarSimpleClient {...props} />;
}
