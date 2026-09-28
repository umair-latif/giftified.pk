/** Skeleton while a catalog page renders (first visit after a cache refresh). */
export default function Loading() {
  return (
    <main
      className="mx-auto max-w-5xl animate-pulse px-4 py-6"
      aria-busy="true"
    >
      <div className="h-7 w-2/3 rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-5/6 rounded bg-zinc-200" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-zinc-200" />
        ))}
      </div>
      <span className="sr-only">Loading products…</span>
    </main>
  );
}
