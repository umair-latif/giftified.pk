import type { TimelineStep } from "../timeline";

/** Vertical progress list: Placed → Confirmed → Shipped → Delivered (or Cancelled). */
export function OrderTimeline({
  steps,
  maskedPhone,
}: {
  steps: TimelineStep[];
  maskedPhone: string;
}) {
  return (
    <ol className="flex flex-col" data-testid="order-timeline">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const cancelled = step.id === "cancelled";
        const dot =
          step.state === "upcoming"
            ? "border-2 border-ink/25 bg-white"
            : cancelled
              ? "bg-red-700"
              : "bg-accent-text";
        return (
          <li
            key={step.id}
            className="relative flex gap-3 pb-5 last:pb-0"
            aria-current={step.state === "current" ? "step" : undefined}
            data-state={step.state}
          >
            {!last && (
              <span
                aria-hidden
                className={`absolute top-5 left-[9px] h-[calc(100%-1.25rem)] w-0.5 ${
                  step.state === "done" ? "bg-accent-text" : "bg-ink/10"
                }`}
              />
            )}
            <span
              aria-hidden
              className={`mt-0.5 size-5 shrink-0 rounded-full ${dot}`}
            />
            <div className="min-w-0">
              <p
                className={
                  step.state === "upcoming"
                    ? "text-ink/65"
                    : "text-ink font-semibold"
                }
              >
                {step.label}
                {step.state === "current" && (
                  <span className="sr-only"> (current step)</span>
                )}
              </p>
              {step.id === "placed" && step.state === "current" && (
                <p
                  className="text-ink/80 text-sm"
                  data-testid="confirm-message"
                >
                  We’ll contact you on{" "}
                  <span className="font-semibold whitespace-nowrap">
                    {maskedPhone}
                  </span>{" "}
                  before printing.
                </p>
              )}
              {step.id === "confirmed" && step.state === "current" && (
                <p className="text-ink/80 text-sm">
                  Your order is being printed.
                </p>
              )}
              {step.tracking && (
                <div className="text-ink/80 text-sm" data-testid="tracking">
                  <p>
                    {step.tracking.courier} · tracking number{" "}
                    <span className="font-semibold break-all">
                      {step.tracking.number}
                    </span>
                  </p>
                  {step.tracking.url && (
                    <a
                      href={step.tracking.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-text mt-1 inline-flex min-h-11 items-center font-semibold underline"
                    >
                      Track parcel
                    </a>
                  )}
                </div>
              )}
              {cancelled && (
                <p className="text-ink/80 text-sm">
                  This order was cancelled. Questions? Message us on WhatsApp.
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
