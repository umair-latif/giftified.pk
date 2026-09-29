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
    title: "Pick a design",
    text: "Start from a ready-made template for Eid, birthdays and more, or from a blank product.",
    icon: (
      <svg {...svg}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <path d="M17 14v6M14 17h6" />
      </svg>
    ),
  },
  {
    title: "Make it yours",
    text: "Swap in your photos and words. Easy tools turn a template into a design that is one of a kind.",
    icon: (
      <svg {...svg}>
        <path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16z" />
        <path d="M14 7l3 3" />
      </svg>
    ),
  },
  {
    title: "See it right away",
    text: "Your product preview shows instantly, so you know how it looks before you order.",
    icon: (
      <svg {...svg}>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
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
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
