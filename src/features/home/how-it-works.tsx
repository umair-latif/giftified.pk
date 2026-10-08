import { Container } from "@/components/ui/page";

/** Brand sheet style: outlined cards with a big coloured number badge. */
const STEPS: { title: string; text: string; badge: string }[] = [
  {
    title: "Design",
    text: "Start blank or from a ready-made design for Eid, birthdays and more. Add your photos, names and words with simple tools that work on any phone or computer.",
    badge: "bg-sunny",
  },
  {
    title: "Preview",
    text: "See your design on the mug or shirt from the front, the sides and in real-life scenes. Change anything until it looks right.",
    badge: "bg-magenta",
  },
  {
    title: "Order",
    text: "Pay cash when it arrives, anywhere in Pakistan. We call you to confirm before we print.",
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
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
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
