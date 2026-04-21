"use client";

import type { ModoVistaPanel } from "@/lib/panelModoVista";
import { panelPreviewMensajeEmbed } from "@/lib/panelPreviewPublica";
import PanelFichaPreviewDosColumnas from "@/components/panel/PanelFichaPreviewDosColumnas";

type Props = {
  slug: string;
  modoVista: ModoVistaPanel;
  /** Datos del panel; en modo **completa** usa `FichaHero` (igual que la página pública). */
  item?: Record<string, unknown> | null;
  /** Slug de la URL del panel si hace falta para resolver enlaces. */
  urlSlugParam?: string;
  /** `estado_publicacion = en_revision`: sin iframe ni URL pública; vista previa local si hay `item`. */
  vistaPublicaBloqueada?: boolean;
};

/**
 * Modo **completa**: vista 2 columnas con datos del panel (como la ficha pública).
 * Modo **básica**: iframe de la página + velo borroso.
 */
export default function PanelFichaPublicaEmbed({
  slug,
  modoVista,
  item = null,
  urlSlugParam,
  vistaPublicaBloqueada = false,
}: Props) {
  const s = String(slug || "").trim();
  if (!s) {
    return (
      <p className="text-sm text-gray-500">
        No hay slug para abrir la vista pública.
      </p>
    );
  }

  if (vistaPublicaBloqueada) {
    if (item) {
      const msg = panelPreviewMensajeEmbed(item);
      return (
        <div className="space-y-3">
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-snug text-amber-950"
          >
            <p className="m-0 font-black">{msg.titulo}</p>
            <p className="mt-1.5 m-0 text-[13px] font-medium leading-snug text-amber-950/95">
              {msg.cuerpo}
            </p>
          </div>
          <PanelFichaPreviewDosColumnas
            item={item}
            urlSlugParam={urlSlugParam}
            ocultarAccionesPublicas
          />
        </div>
      );
    }
    return (
      <div
        role="status"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
      >
        <p className="m-0 text-base font-black text-amber-950">
          Vista previa de tu ficha
        </p>
        <p className="mt-2 m-0 text-sm font-medium text-amber-900/90">
          Así se verá cuando tu ficha sea publicada o aprobada. La página pública aún
          no está disponible.
        </p>
      </div>
    );
  }

  const src = `/emprendedor/${encodeURIComponent(s)}`;
  const esBasica = modoVista === "basica";

  return (
    <div className="space-y-2">
      {esBasica ? (
        <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <iframe
            title="Vista previa: página ampliada (perfil completo)"
            src={src}
            className="w-full min-h-[min(72vh,680px)] border-0 bg-white"
            loading="lazy"
          />
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center bg-white/70 backdrop-blur-[5px] pointer-events-none supports-[backdrop-filter]:bg-white/55"
            aria-hidden
          >
            <p className="text-base sm:text-lg font-black text-gray-900 max-w-md leading-snug">
              Aquí es donde decides si te contactan o no
            </p>
          </div>
        </div>
      ) : item ? (
        <PanelFichaPreviewDosColumnas
          item={item}
          urlSlugParam={urlSlugParam}
        />
      ) : (
        <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <iframe
            title="Vista pública de tu ficha (igual que verán los clientes)"
            src={src}
            className="w-full min-h-[min(72vh,680px)] border-0 bg-white"
            loading="lazy"
          />
        </div>
      )}

      {!esBasica ? (
        <p className="text-xs text-gray-500">
          {item
            ? "Misma estructura que la ficha pública: galería y descripción a la izquierda, panel de contacto a la derecha."
            : "Es la misma página pública que abren tus clientes. Puede tardar un momento en cargar."}
        </p>
      ) : null}
    </div>
  );
}
