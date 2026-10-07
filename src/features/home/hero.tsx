import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/page";

/** TODO(founder): replace with a real product photo (WebP, ≤ 100 KB, ~1600×1000). */
const HERO_IMAGE = "/home/hero-placeholder.webp";

/** The hero's one funky button: banana yellow, black outline, hard shadow (docs/brand.md). */
const HERO_BUTTON =
  "bg-sunny text-ink border-ink mt-5 flex h-12 w-full items-center justify-center rounded-full border-[3px] px-6 text-base font-semibold shadow-[4px_4px_0_var(--color-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-ink)] sm:w-fit sm:min-w-40";

export function Hero() {
  return (
    <section className="bg-brand-500 border-ink border-b-[3px] pt-6 pb-8">
      <Container
        width="wide"
        className="md:grid md:grid-cols-2 md:items-center md:gap-10"
      >
        <div>
          <h1 className="text-ink text-[2rem] leading-none sm:text-5xl">
            Your photo, your words — on a mug, tee or hoodie
          </h1>
          <p className="text-ink mt-3 text-base font-medium">
            Pay cash on delivery across Pakistan
          </p>
          <Link href="/products" className={HERO_BUTTON}>
            Start designing
          </Link>
        </div>
        <Image
          src={HERO_IMAGE}
          alt="A custom printed mug"
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
