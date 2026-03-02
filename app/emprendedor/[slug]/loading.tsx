export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-4 w-96 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 h-[320px] animate-pulse rounded-2xl bg-gray-200" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-56 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}