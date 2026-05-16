"use client";

type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Total de resultados sin filtrar (básicas + completas). */
  totalCount: number;
  /** Resultados que cuentan como ficha completa (misma regla que el filtro ON). */
  completasCount: number;
};

const ListIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const PhotoCardIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export default function SoloCompletosFiltroControl({
  checked,
  onCheckedChange,
  totalCount,
  completasCount,
}: Props) {
  const filtroCompletasActivo = checked;

  return (
    <div className="mb-4 flex gap-2.5">
      <button
        type="button"
        aria-pressed={!filtroCompletasActivo}
        onClick={() => onCheckedChange(false)}
        className={`flex flex-1 items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
          !filtroCompletasActivo
            ? "border-[#0F6E56] bg-[#0F6E56] shadow-lg shadow-[#0F6E56]/20"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
            !filtroCompletasActivo ? "bg-white/20 text-white" : "bg-[#EEFAF6] text-[#0F6E56]"
          }`}
        >
          <ListIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span
              className={`text-sm font-medium ${!filtroCompletasActivo ? "text-white" : "text-gray-900"}`}
            >
              Todas
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                !filtroCompletasActivo ? "bg-white/20 text-white" : "bg-[#EEFAF6] text-[#085041]"
              }`}
            >
              {totalCount}
            </span>
          </div>
          <p className={`text-xs ${!filtroCompletasActivo ? "text-[#9FE1CB]" : "text-gray-500"}`}>
            Básicas y completas
          </p>
        </div>
      </button>

      <button
        type="button"
        aria-pressed={filtroCompletasActivo}
        onClick={() => onCheckedChange(true)}
        className={`flex flex-1 items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
          filtroCompletasActivo
            ? "border-[#0F6E56] bg-[#0F6E56] shadow-lg shadow-[#0F6E56]/20"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
            filtroCompletasActivo ? "bg-white/20 text-white" : "bg-[#EEFAF6] text-[#0F6E56]"
          }`}
        >
          <PhotoCardIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span
              className={`text-sm font-medium ${filtroCompletasActivo ? "text-white" : "text-gray-900"}`}
            >
              Fichas completas
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                filtroCompletasActivo ? "bg-white/20 text-white" : "bg-[#EEFAF6] text-[#085041]"
              }`}
            >
              {completasCount}
            </span>
          </div>
          <p className={`text-xs ${filtroCompletasActivo ? "text-[#9FE1CB]" : "text-gray-500"}`}>
            Más información para decidir
          </p>
        </div>
      </button>
    </div>
  );
}
