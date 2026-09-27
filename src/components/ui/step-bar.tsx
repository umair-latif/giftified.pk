const STEPS = ["Design", "Preview", "Order"] as const;
export type FlowStep = (typeof STEPS)[number];

/** "Design → Preview → Order" progress indicator shown under the header. */
export function StepBar({ current }: { current: FlowStep }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol
      className="mx-auto flex w-full max-w-md items-center justify-center gap-2 px-4 py-2 text-[11px]"
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
                ? "bg-indigo-600 text-white"
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
