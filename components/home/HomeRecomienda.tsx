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

type HomeRecomiendaProps = {
  /** En la home: sin márgenes/padding de página completa. */
  embedded?: boolean;
};

export default function HomeRecomienda({ embedded = false }: HomeRecomiendaProps) {
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
  /** En home: comuna y servicio en un segundo paso (menos fricción inicial). */
  const [extrasOpen, setExtrasOpen] = useState(false);

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

    if (embedded) {
      if (!nombre || !contactoValue) {
        setErrorMessage("Completá el nombre y el WhatsApp.");
        return;
      }
      if (!comuna) {
        setErrorMessage("Elegí la comuna: abrí “Comuna y qué ofrece (opcional)”.");
        setExtrasOpen(true);
        return;
      }
    } else if (!nombre || !comuna || !contactoValue) {
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
      setExtrasOpen(false);

      setSuccessMessage("¡Gracias! Tu recomendación fue enviada. Invitaremos a este emprendimiento a publicar.");
    } catch {
      setErrorMessage("Ocurrió un error inesperado. Intenta nuevamente en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  const cardClass = embedded
    ? "rounded-2xl border border-slate-200 bg-slate-50/40 p-6 sm:p-8 shadow-sm"
    : "bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6";

  const labelClass = embedded
    ? "block text-sm font-semibold text-slate-800 mb-2"
    : "block text-xs font-semibold text-slate-700 mb-1.5";

  const inputClass = embedded
    ? "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-400"
    : "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500";

  return (
    <section
      className={
        embedded
          ? "max-w-none mx-0 px-0 py-0"
          : "max-w-6xl mx-auto px-4 py-8 sm:py-10"
      }
      id={embedded ? "home-recomendar-panel" : undefined}
    >
      <div className={cardClass}>
        <h2
          className={
            embedded
              ? "text-lg sm:text-xl font-bold text-slate-900 mb-1"
              : "text-lg sm:text-xl font-bold text-slate-900 mb-1"
          }
        >
          Recomienda un buen emprendimiento
        </h2>
        {embedded ? (
          <p className="text-xs text-slate-500 mb-5">Toma menos de 2 minutos</p>
        ) : (
          <p className="text-slate-600 text-sm mb-5 max-w-2xl">
            Ayúdanos a sumarlo a Rey del Dato. Cuéntanos de qué se trata y cómo podemos
            contactarlos para invitarlos a publicar.
          </p>
        )}

        <form onSubmit={handleSubmit} className={embedded ? "space-y-5" : "space-y-4"}>
          {embedded ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className={labelClass}>Nombre del emprendimiento</label>
                  <input
                    type="text"
                    value={nombreEmprendimiento}
                    onChange={(e) => setNombreEmprendimiento(e.target.value)}
                    placeholder="Ej: Panadería Don Luis"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp del negocio</label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej: +56 9 1234 5678"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExtrasOpen((v) => !v)}
                className="text-sm font-semibold text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
              >
                {extrasOpen
                  ? "Ocultar comuna y servicio"
                  : "Comuna y qué ofrece (opcional)"}
              </button>

              {extrasOpen ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1 border-t border-slate-200/80">
                  <div ref={comunaBoxRef} className="relative sm:col-span-1">
                    <label className={labelClass}>Comuna</label>
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
                      placeholder="Escribe y elegí de la lista"
                      className={inputClass}
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
                    <label className={labelClass}>¿Qué servicio ofrece? (opcional)</label>
                    <input
                      type="text"
                      value={servicioTexto}
                      onChange={(e) => setServicioTexto(e.target.value)}
                      placeholder="Ej: tortas, gasfitería, fletes…"
                      className={inputClass}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className={labelClass}>Nombre del emprendimiento</label>
                  <input
                    type="text"
                    value={nombreEmprendimiento}
                    onChange={(e) => setNombreEmprendimiento(e.target.value)}
                    placeholder="Ej: Panadería Don Luis"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>¿Qué servicio ofrece? (opcional)</label>
                  <input
                    type="text"
                    value={servicioTexto}
                    onChange={(e) => setServicioTexto(e.target.value)}
                    placeholder="Ej: tortas personalizadas, gasfitería, fletes..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div ref={comunaBoxRef} className="relative">
                  <label className={labelClass}>Comuna</label>
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
                    placeholder="Escribe y elegí de la lista"
                    className={inputClass}
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
                  <label className={labelClass}>
                    Contacto del emprendimiento (WhatsApp o Instagram)
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej: +56 9 1234 5678 o @emprendimiento"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className={
                embedded
                  ? "inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-slate-900 text-white px-8 py-3.5 text-base font-semibold shadow-sm transition-colors duration-200 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  : "inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold transition-colors duration-200 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
              }
            >
              {loading
                ? "Enviando…"
                : embedded
                  ? "Enviar recomendación"
                  : "Recomendar emprendimiento"}
            </button>

            {successMessage && (
              <p className="text-xs sm:text-sm text-slate-700">{successMessage}</p>
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
