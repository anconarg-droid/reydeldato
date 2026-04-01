"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ProgresoItem = {
  nombre: string;
  actual: number;
  meta: number;
};

export default function ComunaEnPreparacion({
  comunaSlug,
  comunaNombre,
  progreso,
  mostrarProgreso = true,
  prefillRubro,
  prefillRubroLabel,
  mostrarPublicarLink = true,
}: {
  comunaSlug: string;
  comunaNombre: string;
  progreso: ProgresoItem[];
  mostrarProgreso?: boolean;
  prefillRubro?: string | null;
  prefillRubroLabel?: string | null;
  mostrarPublicarLink?: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rubro, setRubro] = useState("");
  const [rubroVisible, setRubroVisible] = useState("");
  const [comentario, setComentario] = useState("");
  const [email, setEmail] = useState("");
  const rubroRef = useRef<HTMLInputElement | null>(null);

  function slugToLabel(slugInput: string): string {
    const slug = String(slugInput ?? "").trim();
    if (!slug) return "";

    // Casos conocidos para mejorar legibilidad.
    const known: Record<string, string> = {
      comida_casera_colaciones: "Comida casera / colaciones",
      gas_balones: "Gas en balones",
      agua_purificada: "Agua purificada",
    };
    if (known[slug]) return known[slug];

    // Regla general: "_" y "-" -> " ", luego capitalizar.
    const normalized = slug.replace(/[_-]+/g, " ").trim();
    return normalized
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => {
        const lower = w.toLowerCase();
        return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : "";
      })
      .join(" ");
  }

  useEffect(() => {
    const nextSlug = String(prefillRubro ?? "").trim();
    if (!nextSlug) return;

    setRubro(nextSlug);
    const labelFromProp = String(prefillRubroLabel ?? "").trim();
    const nextLabel = labelFromProp || slugToLabel(nextSlug);
    setRubroVisible(nextLabel);
    // Mejorar conversión: enfocar el campo "Rubro" al preseleccionar desde CTA
    setTimeout(() => rubroRef.current?.focus(), 0);
  }, [prefillRubro, prefillRubroLabel]);

  const { covered, total, porcentaje } = useMemo(() => {
    const t = Array.isArray(progreso) ? progreso.length : 0;
    const c = Array.isArray(progreso)
      ? progreso.filter((x) => Number(x.actual) >= Number(x.meta)).length
      : 0;

    return {
      covered: c,
      total: t,
      porcentaje: t > 0 ? Math.round((c / t) * 100) : 0,
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
      {mostrarProgreso ? (
        <>
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
              {total > 0 ? (
                <span>
                  {covered} / {total} rubros cubiertos
                </span>
              ) : (
                <span>Sin detalle de rubros todavía</span>
              )}
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-900"
                style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%` }}
              />
            </div>
          </div>

          {progreso.length > 0 ? (
            <div className="mt-6 space-y-3">
              {progreso.map((p) => {
                const ok = p.actual >= p.meta;
                return (
                  <div
                    key={p.nombre}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-800 font-semibold">{p.nombre}</span>
                    <span className="text-slate-600 tabular-nums">
                      {p.actual} / {p.meta} {ok ? "✔" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

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
        </>
      ) : null}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-bold text-slate-900">
          ¿Quieres ayudar a abrir {comunaNombre} más rápido?
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
              value={prefillRubro ? rubroVisible : rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="Rubro"
              ref={rubroRef}
              readOnly={Boolean(prefillRubro)}
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
        {mostrarPublicarLink ? (
          <Link
            href={`/publicar?comuna=${encodeURIComponent(comunaSlug)}`}
            className="inline-flex items-center justify-center px-6 h-11 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
          >
            Publicar mi emprendimiento en {comunaNombre}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

