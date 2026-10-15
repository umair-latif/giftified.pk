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
      className={`flex items-center gap-2 text-sm ${
        inPage
          ? "mb-3"
          : "mx-auto w-full max-w-md justify-center px-4 py-2 lg:py-3"
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
            className={`grid size-6 place-items-center rounded-full border-2 text-xs font-semibold ${
              i === currentIndex
                ? "bg-action border-ink text-ink"
                : i < currentIndex
                  ? "bg-ink border-ink text-white"
                  : "border-ink/25 text-ink/65 bg-white"
            }`}
          >
            {i + 1}
          </span>
          <span
            className={
              i === currentIndex ? "text-ink font-semibold" : "text-ink/65"
            }
          >
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <span className="bg-ink/20 h-px w-5" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}
