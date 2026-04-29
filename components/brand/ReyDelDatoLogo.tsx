import Link from "next/link";

const TAGLINES = {
  servicios: "Encuentra servicios y comercios en tu comuna",
  dato: "El dato de tu comuna",
  impulsando: "Impulsando negocios de tu comuna",
} as const;

export type ReyDelDatoTaglineKey = keyof typeof TAGLINES;

export default function ReyDelDatoLogo({
  tagline = "servicios",
  href = "/",
  className = "",
}: {
  tagline?: ReyDelDatoTaglineKey;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group inline-flex flex-col items-start leading-none select-none",
        className,
      ].join(" ")}
      aria-label="Rey del Dato"
    >
      <span className="font-black tracking-tight text-teal-800 group-hover:text-teal-900 transition-colors">
        REY DEL DATO
      </span>
      <span className="mt-1 text-[12px] sm:text-[12.5px] font-semibold text-teal-700/90 tracking-tight">
        {TAGLINES[tagline]}
      </span>
    </Link>
  );
}

