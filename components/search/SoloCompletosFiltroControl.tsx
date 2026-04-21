"use client";

type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
};

export default function SoloCompletosFiltroControl({ checked, onCheckedChange }: Props) {
  const statusBox = checked ? (
    <div className="order-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-left text-sm font-medium text-emerald-800 sm:order-1 sm:w-auto sm:max-w-lg">
      <div className="leading-snug">✓ Mostrando solo perfiles con fotos y más información</div>
    </div>
  ) : (
    <div className="order-2 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-left sm:order-1 sm:w-auto sm:max-w-lg">
      <div className="font-medium leading-snug text-muted-foreground">
        Estás viendo todos los resultados
      </div>
      <div className="mt-1 text-xs leading-snug text-muted-foreground">
        Algunos perfiles pueden tener poca información o sin fotos
      </div>
    </div>
  );

  return (
    <div className="mb-4 mt-1 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {statusBox}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`order-1 w-full max-w-md shrink-0 cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:order-2 ${
          checked
            ? "border-emerald-200 bg-emerald-50 shadow-sm"
            : "border-gray-200 bg-gray-50 hover:border-emerald-200/70 hover:bg-gray-100/90 hover:shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col text-left">
            <span
              className={`text-sm font-semibold leading-snug ${
                checked ? "text-emerald-900" : ""
              }`}
            >
              {checked ? "Perfiles más completos activados" : "Ver mejores perfiles"}
            </span>
            <span
              className={`mt-1 text-xs leading-snug ${
                checked ? "text-emerald-700" : "text-gray-600"
              }`}
            >
              {checked
                ? "Mostrando perfiles con fotos y más información"
                : "Activa para ver perfiles con más información y fotos"}
            </span>
          </div>

          <div
            className={`flex h-6 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
              checked ? "bg-emerald-500" : "bg-gray-300"
            }`}
            aria-hidden
          >
            <div
              className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                checked ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </div>
        </div>
      </button>
    </div>
  );
}
