"use client";

import { useEffect, useMemo, useState } from "react";

const SECCIONES = [
  { id: "p1", label: "Responsable" },
  { id: "p2", label: "Base legal" },
  { id: "p3", label: "Datos recopilados" },
  { id: "p4", label: "Uso" },
  { id: "p5", label: "Datos públicos" },
  { id: "p6", label: "Derechos" },
  { id: "p7", label: "Seguridad" },
  { id: "p8", label: "Cookies" },
  { id: "p9", label: "Contacto" },
] as const;

function getHashId(): string {
  if (typeof window === "undefined") return "";
  return (window.location.hash || "").replace(/^#/, "").trim();
}

export default function PrivacidadSidebarNav() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const apply = () => setActive(getHashId() || "p1");
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const items = useMemo(() => SECCIONES, []);

  return (
    <nav
      aria-label="Índice de privacidad"
      className="space-y-1 text-sm sticky top-6 self-start"
    >
      {items.map((it, idx) => {
        const isActive = active === it.id;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`block border-l-2 pl-3 py-1 transition-colors ${
              isActive
                ? "border-l-[#0d7a5f] text-teal-700 font-medium"
                : "border-l-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="text-slate-500">{idx + 1}.</span> {it.label}
          </a>
        );
      })}
    </nav>
  );
}

