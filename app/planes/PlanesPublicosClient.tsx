"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PlanKey = "mensual" | "semestral" | "anual";

const BENEFICIOS = [
  {
    title: "Galería de fotos",
    desc: "Muestra tu trabajo, productos o local con varias imágenes.",
  },
  {
    title: "Locales físicos y dirección",
    desc: "Para que sepan dónde encontrarte si tienes punto de atención.",
  },
  {
    title: "Instagram y sitio web",
    desc: "Conecta tus redes para que puedan conocerte mejor.",
  },
  {
    title: "Descripción más completa",
    desc: "Cuenta tu historia, especialidades y forma de trabajar.",
  },
  {
    title: "Estadísticas de visualizaciones y clics",
    desc: "Sabe cuánta gente ve tu ficha y cuántos te contactan.",
  },
] as const;

const PLANES: Record<
  PlanKey,
  {
    nombre: string;
    detalle: string;
    precio: string;
    ahorro?: string;
    recomendado?: boolean;
  }
> = {
  mensual: {
    nombre: "Mensual",
    detalle: "1 mes · sin compromiso",
    precio: "$5.900",
  },
  semestral: {
    nombre: "Semestral",
    detalle: "$4.150 al mes",
    precio: "$24.900",
    ahorro: "Ahorra $10.500",
  },
  anual: {
    nombre: "Anual",
    detalle: "$3.325 al mes",
    precio: "$39.900",
    ahorro: "Ahorra $30.900",
    recomendado: true,
  },
};

function labelPlanLower(k: PlanKey): string {
  if (k === "mensual") return "mensual";
  if (k === "semestral") return "semestral";
  return "anual";
}

export default function PlanesPublicosClient() {
  const [selected, setSelected] = useState<PlanKey>("anual");

  const ctaText = useMemo(() => {
    return `Continuar con plan ${labelPlanLower(selected)}`;
  }, [selected]);

  const publicarHref = useMemo(() => {
    const qs = new URLSearchParams({ plan: selected }).toString();
    return `/publicar?${qs}`;
  }, [selected]);

  return (
    <div
      className="grid grid-cols-2 gap-5 items-start max-[720px]:grid-cols-1"
    >
      <article
        style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "0.75rem",
          padding: "1.5rem 1.75rem",
          background: "#fff",
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
          Lo que incluye
        </h3>

        <ul className="mt-4 space-y-3">
          {BENEFICIOS.map((b) => (
            <li
              key={b.title}
              className="relative pl-6 before:content-['✓'] before:absolute before:left-0 before:top-[1px] before:text-[#0d7a5f] before:font-bold"
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary, #475569)",
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {b.desc}
              </div>
            </li>
          ))}
        </ul>
      </article>

      <article
        style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          background: "#fff",
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            Elige tu plan
          </h3>
          <p
            style={{
              marginTop: "0.35rem",
              fontSize: 13,
              color: "var(--color-text-secondary, #475569)",
            }}
          >
            Puedes cambiar o cancelar cuando quieras.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {(Object.keys(PLANES) as PlanKey[]).map((k) => {
            const p = PLANES[k];
            const isSelected = selected === k;
            return (
              <div
                key={k}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelected(k)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(k);
                  }
                }}
                className={`group relative flex items-start justify-between gap-3 rounded-[0.6rem] px-4 py-[0.85rem] cursor-pointer transition-colors ${
                  isSelected
                    ? "border border-[#0d7a5f] bg-[#f4faf7]"
                    : "border border-slate-300 bg-white hover:border-[#0d7a5f]"
                }`}
              >
                {isSelected ? (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: -8,
                      top: 14,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "#0d7a5f",
                      border: "2px solid #fff",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                ) : null}

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {p.nombre}
                    </div>
                    {p.recomendado ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "0.18rem 0.45rem",
                          borderRadius: 999,
                          background: "#0d7a5f",
                          color: "#fff",
                        }}
                      >
                        RECOMENDADO
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: "var(--color-text-secondary, #475569)",
                    }}
                  >
                    {p.detalle}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {p.precio}
                  </div>
                  {p.ahorro ? (
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#0d7a5f",
                      }}
                    >
                      {p.ahorro}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href={publicarHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold"
          style={{
            background: "#0d7a5f",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          {ctaText}
        </Link>

        <p
          style={{
            marginTop: "0.65rem",
            fontSize: 11,
            color: "var(--color-text-tertiary, #64748b)",
            textAlign: "center",
          }}
        >
          Pago seguro vía Khipu. Tu ficha sigue visible aunque no pagues.
        </p>
      </article>
    </div>
  );
}

