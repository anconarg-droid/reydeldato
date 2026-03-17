import { type ReactNode } from "react";
import { Card } from "./Card";

type EmptyStateBlockProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyStateBlock({
  title,
  description,
  children,
  className = "",
}: EmptyStateBlockProps) {
  return (
    <Card className={`p-6 sm:p-10 ${className}`.trim()}>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 text-gray-600">{description}</p>}
      {children}
    </Card>
  );
}
