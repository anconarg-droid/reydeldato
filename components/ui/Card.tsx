import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

/** Card base del design system: radius 12px, padding 20px, borde gris */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  );
}
