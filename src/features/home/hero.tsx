import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

/** TODO(founder): replace with a real product photo (WebP, ≤ 100 KB, ~1600×1000). */
const HERO_IMAGE = "/home/hero-placeholder.webp";

export function Hero() {
  return (
    <section className="bg-mint-100 pt-6 pb-8">
      <Container
        width="wide"
        className="md:grid md:grid-cols-2 md:items-center md:gap-10"
      >
        <div>
          <h1 className="text-brand-900 text-[1.75rem] leading-tight sm:text-4xl">
            Your photo, your words — on a mug, tee or hoodie
          </h1>
          <p className="text-ink mt-2 text-base">
            Pay cash on delivery across Pakistan
          </p>
          <Link href="/products" className={buttonClass("primary", "mt-5")}>
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
          className="mt-6 h-auto w-full rounded-2xl md:mt-0"
        />
      </Container>
    </section>
  );
}
