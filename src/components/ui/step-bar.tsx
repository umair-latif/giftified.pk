const STEPS = ["Design", "Preview", "Order"] as const;
export type FlowStep = (typeof STEPS)[number];

/** "Design → Preview → Order" progress (Order = cart and checkout) indicator shown under the header. */
export function StepBar({
  current,
  inPage = false,
}: {
  current: FlowStep;
  /** On shop pages: sit in the page column, left-aligned, without its own gutters. */
  inPage?: boolean;
}) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol
      className={`flex items-center gap-2 text-[11px] ${
        inPage
          ? "mb-3"
          : "mx-auto w-full max-w-md justify-center px-4 py-2 lg:py-3 lg:text-sm"
      }`}
      aria-label="Order steps"
    >
      {STEPS.map((step, i) => (
        <li
          key={step}
          className="flex items-center gap-2"
          aria-current={i === currentIndex ? "step" : undefined}
        >
          <span
            className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${
              i <= currentIndex
                ? "bg-brand-600 text-white"
                : "bg-zinc-200 text-zinc-500"
            }`}
          >
            {i + 1}
          </span>
          <span
            className={
              i === currentIndex ? "font-medium text-zinc-900" : "text-zinc-500"
            }
          >
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <span className="h-px w-5 bg-zinc-300" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}
