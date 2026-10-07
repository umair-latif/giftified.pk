import { Container } from "@/components/ui/page";

/** Brand sheet style: outlined cards with a big coloured number badge. */
const STEPS: { title: string; text: string; badge: string }[] = [
  {
    title: "Pick a design",
    text: "Start from a ready-made design for Eid, birthdays and more, or from a blank product.",
    badge: "bg-brand-500",
  },
  {
    title: "Make it yours",
    text: "Swap in your photos and words. Easy tools make it one of a kind.",
    badge: "bg-sunny",
  },
  {
    title: "See it right away",
    text: "The preview shows instantly, so you know how it looks before you order.",
    badge: "bg-magenta",
  },
  {
    title: "Pay when it arrives",
    text: "Cash on delivery anywhere in Pakistan. We call to confirm first.",
    badge: "bg-mint-300",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="home-how" className="pt-10">
      <Container width="wide">
        <h2 id="home-how" className="text-brand-900 text-2xl">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card flex items-center gap-4 p-4">
              <span
                aria-hidden
                className={`${step.badge} border-ink text-ink font-display grid size-11 shrink-0 place-items-center rounded-full border-[3px] text-xl leading-none`}
              >
                {i + 1}
              </span>
              <span>
                <span className="text-ink block font-semibold">
                  <span className="sr-only">{i + 1}. </span>
                  {step.title}
                </span>
                <span className="block text-sm text-zinc-600">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
