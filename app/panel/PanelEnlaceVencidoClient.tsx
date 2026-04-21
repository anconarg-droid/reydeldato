"use client";

import { useState, type FormEvent } from "react";

const MENSAJE_EXITO =
  "Te enviamos un nuevo enlace si el correo existe.";

export default function PanelEnlaceVencidoClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setLoading(true);
    try {
      const res = await fetch("/api/panel/reenviar-acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      let data: { ok?: boolean; message?: string } = {};
      try {
        data = (await res.json()) as { ok?: boolean; message?: string };
      } catch {
        data = {};
      }
      setMensaje(
        typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : MENSAJE_EXITO
      );
    } catch {
      setMensaje(MENSAJE_EXITO);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="panel-reenviar-email"
          className="block text-sm font-semibold text-gray-800 mb-1.5"
        >
          Correo electrónico
        </label>
        <input
          id="panel-reenviar-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.cl"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          disabled={loading}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Enviar nuevo acceso"}
      </button>
      {mensaje ? (
        <p className="text-sm text-gray-700 m-0" role="status">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
