"use client";

import type { ReactNode } from "react";
import type { ModoVistaPanel } from "@/lib/panelModoVista";
import {
  panelNegocioEstaPublicado,
  panelPreviewMensajeEmbed,
  panelPreviewOcultarAccionesPublicasFicha,
  panelPreviewTieneEdicionPublicadaPendiente,
} from "@/lib/panelPreviewPublica";
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
  /** Iframe sin bloque «similares» (panel2). */
  embedSoloFicha?: boolean;
};

function VeloFichaModoBasica({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[min(420px,72vh)] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div
        className="pointer-events-none min-h-[min(420px,72vh)] max-h-[min(72vh,680px)] overflow-hidden blur-[10px] brightness-[0.88] contrast-[0.92] saturate-[0.85]"
        aria-hidden
      >
        {children}
      </div>
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-6 text-center bg-white/88 pointer-events-none"
        role="status"
      >
        <p className="text-base sm:text-lg font-black text-gray-900 max-w-md leading-snug">
          Aquí es donde decides si te contactan o no
        </p>
        <p className="text-sm font-semibold text-gray-700 max-w-md leading-snug">
          Con ficha completa ganas visibilidad; con ficha básica solo contacto por WhatsApp.
        </p>
      </div>
    </div>
  );
}

/**
 * Modo **completa**: vista 2 columnas con datos del panel (como la ficha pública).
 * Modo **básica**: iframe o preview con velo borroso y mensaje de producto.
 */
export default function PanelFichaPublicaEmbed({
  slug,
  modoVista,
  item = null,
  urlSlugParam,
  vistaPublicaBloqueada = false,
  embedSoloFicha = false,
}: Props) {
  const s = String(slug || "").trim();
  if (!s) {
    return (
      <p className="text-sm text-gray-500">
        No hay slug para abrir la vista pública.
      </p>
    );
  }

  const src = embedSoloFicha
    ? `/emprendedor/${encodeURIComponent(s)}?panel_embed=1`
    : `/emprendedor/${encodeURIComponent(s)}`;
  const esBasica = modoVista === "basica";
  const publicado = item ? panelNegocioEstaPublicado(item) : false;
  const cambiosPendientes = item
    ? panelPreviewTieneEdicionPublicadaPendiente(item)
    : false;
  const usarIframeFichaLive = publicado && !cambiosPendientes && !esBasica;
  const ocultarAcciones = panelPreviewOcultarAccionesPublicasFicha(item);

  const iframeFicha = (
    <iframe
      title={
        esBasica
          ? "Vista previa: página ampliada (perfil completo)"
          : "Vista pública de tu ficha (igual que verán los clientes)"
      }
      src={src}
      className="w-full min-h-[min(72vh,680px)] border-0 bg-white"
      loading="lazy"
    />
  );

  const fichaCuerpo: ReactNode = usarIframeFichaLive ? (
    iframeFicha
  ) : item ? (
    <PanelFichaPreviewDosColumnas
      item={item}
      urlSlugParam={urlSlugParam}
      ocultarAccionesPublicas={ocultarAcciones}
    />
  ) : (
    iframeFicha
  );

  const fichaVisual = esBasica ? (
    <VeloFichaModoBasica>{fichaCuerpo}</VeloFichaModoBasica>
  ) : (
    <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {fichaCuerpo}
    </div>
  );

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
          {fichaVisual}
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

  return (
    <div className="space-y-2">
      {fichaVisual}
      {!esBasica ? (
        <p className="text-xs text-gray-500">
          {usarIframeFichaLive || !item
            ? "Es la misma página pública que abren tus clientes. Puede tardar un momento en cargar."
            : "Misma estructura que la ficha pública: galería y descripción a la izquierda, panel de contacto a la derecha."}
        </p>
      ) : null}
    </div>
  );
}
