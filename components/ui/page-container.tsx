import { type ReactNode } from "react";

const CONTAINER_CLASS =
  "max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`${CONTAINER_CLASS} ${className}`.trim()}>
      {children}
    </main>
  );
}
