"use client";

import Link from "next/link";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import PublicSearchResults from "@/components/search/PublicSearchResults";
import { buildAtiendeLine } from "@/lib/search/atiendeResumenLabel";
import type { GlobalDbItem } from "@/lib/resultadosGlobalSupabase";
import ResultadosSearchBar from "./ResultadosSearchBar";

function GlobalDbResults({
  q,
  items,
  error,
}: {
  q: string;
  items: GlobalDbItem[];
  error: string | null;
}) {
  if (error) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        Error cargando datos: {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-slate-600 text-sm">
        No encontramos resultados para &quot;{q}&quot;. Prueba otras palabras o busca eligiendo una
        comuna en el{" "}
        <Link href="/" className="underline font-medium text-slate-900">
          inicio
        </Link>
        .
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: 16,
      }}
    >
      {items.map((row) => {
        const atiendeLine = buildAtiendeLine({
          coberturaTipo: row.cobertura_tipo || "",
          comunasCobertura: row.comunas_cobertura,
          regionesCobertura: row.regiones_cobertura,
          comunaBuscadaSlug: "",
          comunaBuscadaNombre: "",
        });
        return (
          <EmprendedorSearchCard
            key={row.slug}
            slug={row.slug}
            nombre={row.nombre_emprendimiento || row.slug}
            fotoPrincipalUrl={row.foto_principal_url || ""}
            whatsappPrincipal={row.whatsapp_principal || ""}
            esFichaCompleta={row.esFichaCompleta}
            estadoFicha={row.estadoFicha}
            bloqueTerritorial={null}
            frase={row.frase_negocio || ""}
            descripcionLibre={row.descripcion_libre || ""}
            categoriaNombre={undefined}
            comunaBaseNombre={row.comuna_nombre || "—"}
            atiendeLine={atiendeLine}
            esNuevo={row.esNuevo}
            analyticsSource="search"
          />
        );
      })}
    </div>
  );
}

type Props = {
  /** Texto del campo de búsqueda tal como viene en la URL (`q` sin normalizar en servidor). */
  initialQDisplay: string;
  initialComuna: string | null;
  /** Nombre real (con tildes) de la comuna buscada, para el H1. */
  initialComunaNombre?: string | null;
  initialQ: string | null;
  initialSubcategoriaSlug?: string | null;
  initialSubcategoriaId?: string | null;
  /** Solo búsqueda global (sin comuna): resultados desde Supabase en el servidor. */
  globalDb?: { items: GlobalDbItem[]; error: string | null } | null;
};

export default function ResultadosClient({
  initialQDisplay,
  initialComuna,
  initialComunaNombre,
  initialQ,
  initialSubcategoriaSlug,
  initialSubcategoriaId,
  globalDb,
}: Props) {
  const comuna = (initialComuna ?? "").trim();
  const comunaNombre = (initialComunaNombre ?? "").trim();
  const q = (initialQ ?? "").trim();
  const subcategoriaSlug = (initialSubcategoriaSlug ?? "").trim();
  const subcategoriaId = (initialSubcategoriaId ?? "").trim();

  const bar = (
    <div className="mt-6 mb-6">
      <ResultadosSearchBar
        initialQDisplay={initialQDisplay}
        initialComunaSlug={initialComuna}
        fixedComunaNombre={comunaNombre || null}
      />
    </div>
  );

  if (!comuna && !q) {
    return (
      <div className="mt-2">
        {bar}
        <h1 className="text-xl font-semibold text-slate-900">Búsqueda</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Escribe qué buscas arriba o usa el buscador en el inicio.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (comuna && (q || subcategoriaSlug || subcategoriaId)) {
    return (
      <div className="mt-2 space-y-4">
        <header className="mt-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Encuentra servicios en{" "}
            <span className="text-sky-700">{comunaNombre || comuna.replace(/-/g, " ")}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Emprendimientos locales y servicios que atienden tu comuna.
          </p>
        </header>
        {bar}
        <PublicSearchResults
          comuna={comuna}
          q={q}
          subcategoriaSlug={subcategoriaSlug || undefined}
          subcategoriaId={subcategoriaId || undefined}
        />
      </div>
    );
  }

  if (comuna && !q) {
    return (
      <div className="mt-2 space-y-4">
        <header className="mt-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Encuentra servicios en{" "}
            <span className="text-sky-700">{comunaNombre || comuna.replace(/-/g, " ")}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Emprendimientos locales y servicios que atienden tu comuna.
          </p>
        </header>
        {bar}
        <PublicSearchResults
          comuna={comuna}
          q=""
          subcategoriaSlug={subcategoriaSlug || undefined}
          subcategoriaId={subcategoriaId || undefined}
        />
      </div>
    );
  }

  const db = globalDb ?? { items: [], error: "No se cargaron datos de búsqueda." };

  return (
    <div className="mt-2 space-y-4">
      {bar}
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Resultados para &quot;{q}&quot;</h1>
        <p className="text-slate-600 text-sm mt-1">
          Resultados en todo Chile. Puedes filtrar por comuna para ver opciones cercanas.
        </p>
      </header>
      <GlobalDbResults q={q} items={db.items} error={db.error} />
    </div>
  );
}
