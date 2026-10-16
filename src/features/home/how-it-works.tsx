import { Container } from "@/components/ui/page";

/**
 * Three steps to read, not to tap: soft panels without the black card
 * outline (that outline means "tappable" on this site), each with a number.
 */
const STEPS: { title: string; text: string }[] = [
  {
    title: "Design",
    text: "Start blank or from a ready-made design for Eid, birthdays and more. Add your photos, names and messages with our simple and powerful Design Studio, on any phone or computer.",
  },
  {
    title: "Preview",
    text: "Our Studio turns your design into real-looking photos of your mug, T-shirt or hoodie, up close and from every side. Not happy? Go back and change anything.",
  },
  {
    title: "Order",
    text: "Pay cash when it arrives, anywhere in Pakistan. More ways to pay are on the way. We contact you to confirm before we print.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="home-how" className="pt-10">
      <Container width="wide">
        <h2 id="home-how" className="type-section text-deep">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="bg-soft flex items-center gap-4 rounded-2xl p-4"
            >
              <span
                aria-hidden
                className="text-deep type-card-title grid size-11 shrink-0 place-items-center rounded-full bg-white leading-none select-none"
              >
                {i + 1}
              </span>
              <span>
                <span className="type-card-title text-ink block">
                  {step.title}
                </span>
                <span className="text-ink/70 block text-sm">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
