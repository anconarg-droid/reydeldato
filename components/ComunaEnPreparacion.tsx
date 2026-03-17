"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ProgresoItem = {
  nombre: string;
  actual: number;
  meta: number;
};

export default function ComunaEnPreparacion({
  comunaSlug,
  comunaNombre,
  progreso,
}: {
  comunaSlug: string;
  comunaNombre: string;
  progreso: ProgresoItem[];
}) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rubro, setRubro] = useState("");
  const [comentario, setComentario] = useState("");
  const [email, setEmail] = useState("");

  const { covered, total, porcentaje } = useMemo(() => {
    const t = progreso.length || 1;
    const c = progreso.filter((x) => x.actual >= x.meta).length;
    return {
      covered: c,
      total: t,
      porcentaje: Math.round((c / t) * 100),
    };
  }, [progreso]);

  const rubrosMasNecesarios = useMemo(() => {
    return [...progreso]
      .sort((a, b) => {
        if (a.actual !== b.actual) return a.actual - b.actual;
        return a.nombre.localeCompare(b.nombre, "es");
      })
      .filter((p) => p.actual < p.meta)
      .slice(0, 6);
  }, [progreso]);

  async function submit() {
    try {
      setSending(true);
      setError("");

      const res = await fetch("/api/comuna-interes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comuna_slug: comunaSlug,
          nombre,
          telefono,
          rubro,
          comentario,
          email,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(json?.error || "No se pudo enviar.");
        return;
      }

      setDone(true);
    } catch {
      setError("No se pudo enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
        Tu comuna necesita tu ayuda para abrir Rey del Dato
      </h2>
      <p className="mt-3 text-slate-600 leading-relaxed">
        Aún no abrimos Rey del Dato en <strong>{comunaNombre}</strong>.
        <br />
        Estamos reuniendo emprendimientos locales.
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
          <span>
            Tu comuna lleva <strong>{porcentaje}%</strong> para abrir.
          </span>
          <span>
            {covered} / {total} rubros cubiertos
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-slate-900"
            style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {progreso.map((p) => {
          const ok = p.actual >= p.meta;
          return (
            <div key={p.nombre} className="flex items-center justify-between text-sm">
              <span className="text-slate-800 font-semibold">{p.nombre}</span>
              <span className="text-slate-600 tabular-nums">
                {p.actual} / {p.meta} {ok ? "✔" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {rubrosMasNecesarios.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Rubros más necesarios en esta comuna
          </h3>
          <p className="text-sm text-slate-600 mb-2">
            Estos rubros aún no tienen suficientes emprendimientos en{" "}
            <strong>{comunaNombre}</strong>:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-800 space-y-1">
            {rubrosMasNecesarios.map((p) => (
              <li key={p.nombre}>{p.nombre}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-bold text-slate-900">
          ¿Conoces emprendedores en esta comuna?
        </h3>
        <p className="text-slate-600 mt-1">
          Déjanos datos de emprendedores que conozcas o tu propio negocio.
          <br />
          Te avisaremos cuando abramos Rey del Dato en tu comuna.
        </p>

        {done ? (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            ¡Gracias! Estás ayudando a abrir Rey del Dato en tu comuna.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="h-11 px-3 rounded-xl border border-slate-300"
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Teléfono"
              className="h-11 px-3 rounded-xl border border-slate-300"
            />
            <input
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="Rubro"
              className="h-11 px-3 rounded-xl border border-slate-300"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email"
              className="h-11 px-3 rounded-xl border border-slate-300"
            />
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Comentario opcional"
              className="sm:col-span-2 min-h-24 p-3 rounded-xl border border-slate-300"
            />

            {error ? (
              <div className="sm:col-span-2 text-sm text-red-600 font-semibold">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              disabled={sending}
              onClick={submit}
              className="sm:col-span-2 h-11 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          href={`/publicar?comuna=${encodeURIComponent(comunaSlug)}`}
          className="inline-flex items-center justify-center px-6 h-11 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
        >
          Publicar mi emprendimiento en {comunaNombre}
        </Link>
      </div>
    </div>
  );
}

