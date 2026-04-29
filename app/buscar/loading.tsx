"use client";

export default function BuscarLoading() {
  const cards = Array.from({ length: 6 });

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-7 w-48 rounded bg-slate-200 animate-pulse mb-4" />
        <div className="h-4 w-80 rounded bg-slate-200 animate-pulse mb-6" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="aspect-video w-full bg-slate-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

