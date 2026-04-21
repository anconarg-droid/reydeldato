"use client";

import type { MouseEvent, ReactNode } from "react";
import { beaconEmprendedorClick } from "@/lib/trackEmprendedorClick";

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6.5 3h4l1.5 4.5-2.5 1.5a11 11 0 006 6l1.5-2.5L21 14.5V18.5a2 2 0 01-2.1 2 19 19 0 01-8.7-3.5 19 19 0 01-6-6A2 2 0 013.5 6.5L6.5 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M3 7l9 6 9-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const cellClass =
  "group flex w-full min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-slate-300 motion-safe:hover:shadow-md motion-safe:hover:bg-slate-50/80 motion-safe:active:scale-[0.98] motion-reduce:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

function MetaBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="truncate text-[13px] font-semibold text-slate-800" title={value}>
        {value}
      </span>
    </span>
  );
}

type Props = {
  slug: string;
  instagramUrl: string | null;
  /** Texto visible, ej. @usuario */
  instagramDisplay?: string;
  webUrl: string | null;
  /** Host o URL corta para mostrar */
  webDisplay?: string;
  phoneUrl: string;
  phoneLabel: string;
  emailUrl: string;
  emailDisplay?: string;
  /** Moderación: abrir enlaces sin beacon de analítica. */
  disableTracking?: boolean;
};

export default function FichaPanelSecundarios({
  slug,
  instagramUrl,
  instagramDisplay,
  webUrl,
  webDisplay,
  phoneUrl,
  phoneLabel,
  emailUrl,
  emailDisplay,
  disableTracking = false,
}: Props) {
  const hasAny = Boolean(
    instagramUrl || webUrl || phoneUrl || emailUrl,
  );

  if (!hasAny) return null;

  function openIgWeb(
    e: MouseEvent,
    type: "instagram" | "web",
    href: string,
  ) {
    e.preventDefault();
    if (!disableTracking) beaconEmprendedorClick(slug, type);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const cells: { key: string; node: ReactNode }[] = [];

  if (phoneUrl) {
    const num = String(phoneLabel || "").trim() || "Llamar";
    cells.push({
      key: "phone",
      node: (
        <a href={phoneUrl} className={`${cellClass} no-underline`}>
          <IconPhone className="shrink-0 text-slate-500" />
          <MetaBlock label="Llamar" value={num} />
        </a>
      ),
    });
  }

  if (instagramUrl) {
    const show = String(instagramDisplay || "").trim() || "Instagram";
    cells.push({
      key: "instagram",
      node: (
        <button
          type="button"
          className={`${cellClass} cursor-pointer no-underline`}
          onClick={(e) => openIgWeb(e, "instagram", instagramUrl)}
        >
          <IconInstagram className="shrink-0 text-pink-600" />
          <MetaBlock label="Instagram" value={show} />
        </button>
      ),
    });
  }

  if (emailUrl) {
    const show = String(emailDisplay || "").trim() || "Email";
    cells.push({
      key: "email",
      node: (
        <a
          href={emailUrl}
          className={`${cellClass} no-underline`}
          onClick={() => {
            if (!disableTracking) beaconEmprendedorClick(slug, "email");
          }}
        >
          <IconMail className="shrink-0 text-slate-500" />
          <MetaBlock label="Email" value={show} />
        </a>
      ),
    });
  }

  if (webUrl) {
    const show = String(webDisplay || "").trim() || "Sitio web";
    cells.push({
      key: "web",
      node: (
        <button
          type="button"
          className={`${cellClass} cursor-pointer no-underline`}
          onClick={(e) => openIgWeb(e, "web", webUrl)}
        >
          <IconGlobe className="shrink-0 text-slate-500" />
          <MetaBlock label="Sitio web" value={show} />
        </button>
      ),
    });
  }

  const n = cells.length;
  const lastOdd = n % 2 === 1;

  return (
    <div className="mt-5 pt-5 border-t border-slate-200/90">
      <div className="mb-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white to-slate-50/90 px-3 py-2.5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] ring-1 ring-amber-100/70">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-900 ring-1 ring-amber-300/40"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8 10h8M8 14h5M6.5 3h11A2.5 2.5 0 0120 5.5v9a2.5 2.5 0 01-2.5 2.5H9.2L5 21v-4H6.5A2.5 2.5 0 014 17v-9A2.5 2.5 0 016.5 3z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="m-0 text-[12px] font-black uppercase tracking-[0.07em] text-slate-900 leading-tight">
              Más formas de contacto
            </p>
            <p className="m-0 mt-1 text-[11px] font-semibold leading-snug text-slate-600">
              Toca una tarjeta: Instagram, teléfono, correo o web
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {cells.map((c, i) => (
          <div
            key={c.key}
            className={
              lastOdd && i === n - 1 ? "col-span-2" : "min-w-0"
            }
          >
            {c.node}
          </div>
        ))}
      </div>
    </div>
  );
}
