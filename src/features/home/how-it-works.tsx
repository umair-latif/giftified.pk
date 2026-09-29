import type { ReactNode, SVGProps } from "react";
import { Container } from "@/components/ui/page";

const svg: SVGProps<SVGSVGElement> = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const STEPS: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Design on your phone",
    text: "Add your photos and words, move and resize with your fingers.",
    icon: (
      <svg {...svg}>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M10 18h4M9 11l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "See it in 3D",
    text: "Turn it around and check every side before you order.",
    icon: (
      <svg {...svg}>
        <path d="M12 2l9 5v10l-9 5-9-5V7z" />
        <path d="M3 7l9 5 9-5M12 12v10" />
      </svg>
    ),
  },
  {
    title: "Pay when it arrives",
    text: "Cash on delivery anywhere in Pakistan. We call to confirm first.",
    icon: (
      <svg {...svg}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 9.5v5M18 9.5v5" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="home-how" className="pt-10">
      <Container width="wide">
        <h2 id="home-how" className="text-brand-900 text-2xl">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <span className="bg-brand-50 text-brand-600 grid size-12 shrink-0 place-items-center rounded-full">
                {step.icon}
              </span>
              <span>
                <span className="text-brand-900 block font-medium">
                  {i + 1}. {step.title}
                </span>
                <span className="text-ink block text-sm">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
