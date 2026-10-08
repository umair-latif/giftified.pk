import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/page";
import { SITE } from "@/config/site";

/**
 * Stand-in made from a real designer screenshot + the preview's own mockup
 * photo of the same design. TODO(founder): replace with a real photo of a
 * printed mug next to a phone showing the designer (WebP, ≤ 100 KB, 1600×1000).
 */
const HERO_IMAGE = "/home/hero-steps.webp";

/** The same three steps as the step bar in the editor (Design → Preview → Order). */
const HERO_STEPS = [
  { title: "Design", text: "Add photos, names and words", badge: "bg-sunny" },
  { title: "Preview", text: "See it on the product", badge: "bg-magenta" },
  { title: "Order", text: "Pay cash when it arrives", badge: "bg-mint-300" },
] as const;

export function Hero() {
  return (
    <section className="bg-brand-500 border-ink border-b-[3px] pt-6 pb-8">
      <Container
        width="wide"
        className="md:grid md:grid-cols-2 md:items-center md:gap-10"
      >
        <div>
          <p className="border-ink text-ink mb-3 w-fit rounded-full border-2 bg-white px-3 py-0.5 text-sm font-semibold">
            {SITE.tagline}
          </p>
          <h1 className="text-ink text-[2rem] leading-none sm:text-5xl">
            Design it yourself. See it before you buy.
          </h1>
          <p className="text-ink mt-3 text-base font-medium sm:text-lg">
            Our easy designer puts your photos, names and words on a mug or
            T-shirt. The preview shows it on the product from every side, so you
            know exactly what you&apos;ll get.
          </p>
          <ol
            className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
            aria-label="Three steps"
            data-testid="hero-steps"
          >
            {HERO_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="border-ink rounded-xl border-2 bg-white p-2 sm:p-3"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`${step.badge} border-ink text-ink font-display grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs leading-none`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-ink text-sm font-semibold sm:text-base">
                    {step.title}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-snug text-zinc-700 sm:text-sm">
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/products" className={buttonClass("sunny")}>
              Start designing
            </Link>
            <a
              href="#home-how"
              className="text-ink focus-visible:ring-ink/40 rounded font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
            >
              How it works
            </a>
          </div>
        </div>
        <Image
          src={HERO_IMAGE}
          alt="Three steps: a mug design made in the DesignBanana designer on a phone, the preview photo of that mug, and the mug delivered in a box"
          width={1600}
          height={1000}
          preload
          sizes="(min-width: 1024px) 480px, (min-width: 768px) 50vw, 100vw"
          className="border-ink mt-6 h-auto w-full rounded-2xl border-[3px] shadow-[6px_6px_0_var(--color-ink)] md:mt-0"
        />
      </Container>
    </section>
  );
}
