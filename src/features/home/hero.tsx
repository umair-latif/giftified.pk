import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/page";

/** TODO(founder): replace with a real product photo (WebP, ≤ 100 KB, ~1600×1000). */
const HERO_IMAGE = "/home/hero-placeholder.webp";

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
          <Link href="/products" className={buttonClass("sunny", "mt-5")}>
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
