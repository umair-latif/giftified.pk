import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/page";
import { SITE } from "@/config/site";
import { DELIVERY_DAYS } from "@/lib/delivery";

/**
 * Founder's Canva picture (designer → preview → delivered box), with the
 * browser bars removed and the step labels added. 1600×1000 WebP, ≤ 100 KB.
 * Change the file name when replacing it, so cached copies don't linger.
 */
const HERO_IMAGE = "/home/hero-steps-v3.webp";

export function Hero() {
  return (
    <section className="bg-brand border-ink border-b-[3px] pt-6 pb-8">
      <Container
        width="wide"
        className="md:grid md:grid-cols-2 md:items-center md:gap-10"
      >
        <div>
          <p className="border-ink text-ink mb-3 w-fit rounded-full border-2 bg-white px-3 py-0.5 text-sm font-semibold">
            {SITE.tagline}
          </p>
          <h1 className="type-display text-ink">
            Design it yourself. See it before you buy.
          </h1>
          <p className="text-ink mt-3 text-base">
            Add your photos, a name or a message to a mug, T-shirt or hoodie.
            The preview shows it on the product from every side, so you know
            exactly what you&apos;ll get.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/products" className={buttonClass("primary")}>
              Start designing
            </Link>
            <a
              href="#home-how"
              className="text-ink font-semibold underline underline-offset-4"
            >
              How it works
            </a>
          </div>
          <ul
            className="text-ink mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold"
            aria-label="Why order here"
            data-testid="hero-trust"
          >
            <li>Cash on delivery</li>
            <li aria-hidden className="max-sm:hidden">
              ·
            </li>
            <li>
              Arrives in {DELIVERY_DAYS.min}–{DELIVERY_DAYS.max} days
            </li>
            <li aria-hidden className="max-sm:hidden">
              ·
            </li>
            <li>Free reprint if misprinted</li>
          </ul>
        </div>
        <Image
          src={HERO_IMAGE}
          alt="How it works: pick a mug in the DesignBanana shop on a phone, design it with your photo and words, see the preview, and get the printed mug delivered in its box"
          width={1600}
          height={1000}
          preload
          sizes="(min-width: 1024px) 480px, (min-width: 768px) 50vw, 100vw"
          className="border-ink mt-6 h-auto w-full rounded-2xl border-[3px] md:mt-0"
        />
      </Container>
    </section>
  );
}
