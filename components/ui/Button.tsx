import Link from "next/link";
import { type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-[10px] bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E293B] transition-colors",
  secondary:
    "inline-flex items-center justify-center rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors",
  ghost:
    "inline-flex items-center justify-center rounded-[10px] px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors",
};

type ButtonBaseProps = {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps & {
  href?: never;
  type?: "button" | "submit";
  onClick?: () => void;
};

type ButtonAsLink = ButtonBaseProps & {
  href: string;
  type?: never;
  onClick?: never;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = "primary",
  children,
  className = "",
  href,
  type = "button",
  onClick,
}: ButtonProps) {
  const classes = `${variantClasses[variant]} ${className}`.trim();

  if (href != null) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
