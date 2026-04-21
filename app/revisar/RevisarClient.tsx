"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DESCRIPCION_CORTA_MAX,
  DESCRIPCION_CORTA_MIN,
  normalizeDescripcionCorta,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacion,
} from "@/lib/descripcionProductoForm";

type EmpRow = {
  id: string;
  slug: string | null;
  nombre_emprendimiento: string | null;
  frase_negocio: string | null;
  descripcion_libre: string | null;
  email: string | null;
  whatsapp_principal: string | null;
  instagram: string | null;
  sitio_web: string | null;
  foto_principal_url: string | null;
};

type RevisarClientProps = {
  /** Token del magic link leído en el server (`page.tsx`); fallback a `useSearchParams` en el cliente. */
  initialToken?: string;
};

export default function RevisarClient({ initialToken = "" }: RevisarClientProps) {
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get("token")?.trim() ?? "";
  const token = useMemo(
    () => (initialToken.trim() || tokenFromQuery).trim(),
    [initialToken, tokenFromQuery]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emp, setEmp] = useState<EmpRow | null>(null);

  const [nombre, setNombre] = useState("");
  const [frase, setFrase] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [foto, setFoto] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const totalFotos = useMemo(
    () => (foto.trim() ? 1 : 0),
    [foto]
  );

  const fraseNorm = useMemo(() => normalizeDescripcionCorta(frase), [frase]);
  const fraseCortaMsg = useMemo(
    () => primeraValidacionDescripcion(validateDescripcionCortaPublicacion(fraseNorm)),
    [fraseNorm]
  );

  const scrollToRevisarFotos = useCallback(() => {
    if (typeof document === "undefined") return;
    document
      .getElementById("revisar-bloque-fotos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Falta el enlace completo (parámetro token).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/revisar?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const j = (await r.json()) as { ok?: boolean; message?: string; emprendedor?: EmpRow };
      if (!r.ok || !j.ok || !j.emprendedor) {
        setEmp(null);
        setError(
          typeof j.message === "string"
            ? j.message
            : "Este enlace no es válido o ya expiró."
        );
        return;
      }
      const e = j.emprendedor;
      setEmp(e);
      setNombre(e.nombre_emprendimiento ?? "");
      setFrase(e.frase_negocio ?? "");
      setDescripcion(e.descripcion_libre ?? "");
      setEmail(e.email ?? "");
      setWhatsapp(e.whatsapp_principal ?? "");
      setInstagram(e.instagram ?? "");
      setSitioWeb(e.sitio_web ?? "");
      setFoto(e.foto_principal_url ?? "");
    } catch {
      setEmp(null);
      setError("No se pudo cargar la ficha. Reintentá más tarde.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setSaveMsg("No se pudo guardar porque falta el token de acceso.");
      setSaveOk(false);
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    setSaveOk(false);
    const fraseMsgSubmit = primeraValidacionDescripcion(
      validateDescripcionCortaPublicacion(normalizeDescripcionCorta(frase))
    );
    if (fraseMsgSubmit) {
      setSaveMsg(fraseMsgSubmit);
      setSaveOk(false);
      setSaving(false);
      return;
    }
    try {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[revisar-submit] token enviado", token);
      }
      const r = await fetch(`/api/revisar?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nombreEmprendimiento: nombre,
          fraseNegocio: frase,
          descripcionLibre: descripcion,
          email,
          whatsappPrincipal: whatsapp,
          instagram,
          sitioWeb,
          fotoPrincipalUrl: foto.trim() || null,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; message?: string };
      if (!r.ok || !j.ok) {
        setSaveMsg(typeof j.message === "string" ? j.message : "No se pudieron guardar los cambios.");
        setSaveOk(false);
        return;
      }
      const baseMsg = typeof j.message === "string" ? j.message : "Guardado.";
      const principalCount = foto.trim() ? 1 : 0;
      setSaveMsg(
        principalCount < 3
          ? "Guardado. Puedes mejorar tu perfil subiendo más fotos."
          : baseMsg
      );
      setSaveOk(true);
    } catch {
      setSaveMsg("Error de red al guardar.");
      setSaveOk(false);
    } finally {
      setSaving(false);
    }
  }

  if (!token && !loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-700">Abrí el enlace que te enviamos por correo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-600">
        Cargando tu ficha…
      </div>
    );
  }

  if (saveMsg && saveMsg.toLowerCase().includes("revisión")) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-emerald-800">Listo</h1>
        <p className="mt-3 text-slate-700">{saveMsg}</p>
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-slate-900">Enlace no válido</h1>
        <p className="mt-3 text-slate-600">{error ?? "No se encontró la ficha."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Editar mi ficha</h1>
      <p className="mt-1 text-sm text-slate-600">
        Los cambios se envían a revisión antes de publicarse de nuevo.
      </p>
      <div className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm">
        <p className="font-semibold text-slate-900">
          Tu ficha está lista, pero puedes mejorarla
        </p>
        <p className="mt-1 text-slate-600">
          Los negocios con fotos reciben más mensajes
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-800">Nombre del emprendimiento</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800">Frase corta (búsqueda)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            maxLength={DESCRIPCION_CORTA_MAX}
            aria-invalid={Boolean(fraseNorm.length > 0 && fraseCortaMsg)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Entre {DESCRIPCION_CORTA_MIN} y {DESCRIPCION_CORTA_MAX} caracteres (una frase, sin saltos de
            línea).
          </p>
          {fraseNorm.length > 0 && fraseCortaMsg ? (
            <p className="mt-1 text-xs text-red-700" role="alert">
              {fraseCortaMsg}
            </p>
          ) : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800">Descripción</label>
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={5}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800">WhatsApp</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800">Instagram (opcional)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800">Sitio web (opcional)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
          />
        </div>
        <div
          id="revisar-bloque-fotos"
          className="scroll-mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
        >
          <p className="text-xs font-bold text-orange-900">🔥 Lo más importante</p>
          <p className="text-sm font-medium text-slate-800">
            Has subido {totalFotos} {totalFotos === 1 ? "foto" : "fotos"}
          </p>
          <p className="text-xs text-slate-600">Recomendado: al menos 3 fotos</p>
          <label className="mt-2 block text-sm font-medium text-slate-800">
            URL foto principal (opcional)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
            value={foto}
            onChange={(e) => setFoto(e.target.value)}
            placeholder="https://..."
          />
        </div>

        {saveMsg ? (
          <div
            className={
              saveOk
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            }
            role="status"
          >
            <p>{saveMsg}</p>
            {saveOk && totalFotos < 3 ? (
              <button
                type="button"
                className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={scrollToRevisarFotos}
              >
                Subir fotos
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar y enviar a revisión"}
        </button>
      </form>
    </div>
  );
}
