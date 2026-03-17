"use client";

import { useEffect, useRef, useState } from "react";

type ComunaSuggestion = {
  slug: string;
  nombre: string;
  region_nombre?: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
};

export default function HomeRecomienda() {
  const [nombreEmprendimiento, setNombreEmprendimiento] = useState("");
  const [servicioTexto, setServicioTexto] = useState("");
  const [comunaInput, setComunaInput] = useState("");
  const [selectedComunaSlug, setSelectedComunaSlug] = useState("");
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [openComuna, setOpenComuna] = useState(false);
  const [loadingComuna, setLoadingComuna] = useState(false);
  const [contacto, setContacto] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) {
        setOpenComuna(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = comunaInput.trim();
    if (term.length < 2) {
      setComunaSuggestions([]);
      return;
    }

    if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    comunaDebounceRef.current = setTimeout(() => {
      setLoadingComuna(true);
      fetch(`/api/suggest/comunas?q=${encodeURIComponent(term)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; comunas?: ComunaSuggestion[] }) => {
          if (data?.ok && Array.isArray(data.comunas)) {
            setComunaSuggestions(data.comunas);
          } else {
            setComunaSuggestions([]);
          }
        })
        .catch(() => setComunaSuggestions([]))
        .finally(() => setLoadingComuna(false));
    }, 200);

    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [comunaInput]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nombre = nombreEmprendimiento.trim();
    const servicio = servicioTexto.trim();
    const comuna = selectedComunaSlug.trim();
    const contactoValue = contacto.trim();

    if (!nombre || !comuna || !contactoValue) {
      setErrorMessage("Completa al menos nombre del emprendimiento, comuna y contacto.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recomendaciones-emprendedores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_emprendimiento: nombre,
          servicio_texto: servicio || null,
          comuna_slug: comuna,
          contacto: contactoValue,
        }),
      });

      const data: ApiResponse = await res.json();

      if (!data.ok) {
        setErrorMessage(data.error || "No pudimos guardar la recomendación. Intenta nuevamente.");
        return;
      }

      setNombreEmprendimiento("");
      setServicioTexto("");
      setComunaInput("");
      setSelectedComunaSlug("");
      setContacto("");

      setSuccessMessage("¡Gracias! Tu recomendación fue enviada. Invitaremos a este emprendimiento a publicar.");
    } catch {
      setErrorMessage("Ocurrió un error inesperado. Intenta nuevamente en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
          ¿Conoces un buen emprendimiento en tu comuna?
        </h2>
        <p className="text-slate-600 text-sm mb-5 max-w-2xl">
          Ayúdanos a sumarlo a Rey del Dato. Cuéntanos de qué se trata y cómo podemos
          contactarlos para invitarlos a publicar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre del emprendimiento
              </label>
              <input
                type="text"
                value={nombreEmprendimiento}
                onChange={(e) => setNombreEmprendimiento(e.target.value)}
                placeholder="Ej: Panadería Don Luis"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ¿Qué servicio ofrece? (opcional)
              </label>
              <input
                type="text"
                value={servicioTexto}
                onChange={(e) => setServicioTexto(e.target.value)}
                placeholder="Ej: tortas personalizadas, gasfitería, fletes..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div ref={comunaBoxRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Comuna
              </label>
              <input
                type="text"
                value={comunaInput}
                onChange={(e) => {
                  setComunaInput(e.target.value);
                  setSelectedComunaSlug("");
                  setOpenComuna(true);
                }}
                onFocus={() => {
                  if (comunaInput.trim().length >= 2) setOpenComuna(true);
                }}
                placeholder="Escribe y selecciona una comuna"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                autoComplete="off"
              />

              {openComuna && (comunaSuggestions.length > 0 || loadingComuna) && (
                <div className="absolute z-40 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                  {loadingComuna ? (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Buscando comunas...
                    </div>
                  ) : (
                    comunaSuggestions.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          setComunaInput(c.nombre);
                          setSelectedComunaSlug(c.slug);
                          setOpenComuna(false);
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50"
                      >
                        <div className="font-semibold text-slate-900">{c.nombre}</div>
                        {c.region_nombre && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {c.region_nombre}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contacto del emprendimiento (WhatsApp o Instagram)
              </label>
              <input
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Ej: +56 9 1234 5678 o @emprendimiento"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
            >
              {loading ? "Enviando..." : "Recomendar emprendimiento"}
            </button>

            {successMessage && (
              <p className="text-xs sm:text-sm text-emerald-700">{successMessage}</p>
            )}

            {errorMessage && !successMessage && (
              <p className="text-xs sm:text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
