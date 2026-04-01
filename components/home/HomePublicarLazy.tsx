"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PublicarSimpleClient = dynamic(
  () => import("@/app/publicar/PublicarSimpleClient"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        Cargando formulario de publicación…
      </div>
    ),
  }
);

type Comuna = {
  id: string;
  nombre: string;
  slug: string;
  region_id?: string | null;
  region_nombre?: string | null;
  display_name?: string | null;
};

type Region = { id: string; nombre: string; slug: string };

export default function HomePublicarLazy() {
  const [comunas, setComunas] = useState<Comuna[] | null>(null);
  const [regiones, setRegiones] = useState<Region[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/publicar/catalogo")
      .then((res) => res.json())
      .then(
        (data: {
          ok?: boolean;
          comunas?: Comuna[];
          regiones?: Region[];
          message?: string;
        }) => {
          if (cancelled) return;
          if (!data?.ok || !Array.isArray(data.comunas) || !Array.isArray(data.regiones)) {
            setError(data?.message || "No se pudo cargar el formulario.");
            return;
          }
          setComunas(data.comunas);
          setRegiones(data.regiones);
        }
      )
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el formulario.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div
        id="home-publicar-panel"
        className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-800"
      >
        {error}
      </div>
    );
  }

  if (!comunas || !regiones) {
    return (
      <div
        id="home-publicar-panel"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600"
      >
        Preparando formulario…
      </div>
    );
  }

  return (
    <div
      id="home-publicar-panel"
      className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
    >
      <Suspense
        fallback={
          <div className="px-4 py-10 text-center text-sm text-slate-600">Cargando…</div>
        }
      >
        <PublicarSimpleClient
          comunas={comunas}
          regiones={regiones}
          initialPostulacionId={null}
          embedOnHome
        />
      </Suspense>
    </div>
  );
}
