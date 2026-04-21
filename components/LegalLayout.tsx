import type { ReactNode } from "react";
import LegalPageTopNav from "@/components/LegalPageTopNav";

type Props = {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
};

export default function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 text-slate-900">
      <LegalPageTopNav />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {lastUpdated ? (
          <p className="text-sm text-slate-500">Última actualización: {lastUpdated}</p>
        ) : null}
      </header>
      <div className="mt-8 space-y-10">{children}</div>
    </main>
  );
}

