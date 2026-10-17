import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/page";

/**
 * Founder's Canva picture: the shop on a phone, then the three numbered steps
 * (designer → preview → delivered mug). 1600×1000 WebP, ≤ 100 KB.
 * Change the file name when replacing it, so cached copies don't linger.
 *
 * The tagline is lettered here in lowercase: in artwork it is drawn like the
 * wordmark, not written as a sentence (docs/brand.md). It is the only place
 * the tagline appears in the hero — the pill above the heading was removed on
 * 18 Oct 2026 because it said the same words twice on one screen.
 */
const HERO_IMAGE = "/home/hero-steps-v5.webp";

export function Hero() {
  return (
    <section className="bg-brand border-ink border-b-[3px] pt-6 pb-8">
      <Container
        width="wide"
        className="md:grid md:grid-cols-2 md:items-center md:gap-10"
      >
        <div>
          <h1 className="type-display text-ink">
            Design it yourself. See it before you buy.
          </h1>
          <p className="text-ink mt-3 text-base">
            Add your favourite photos, names or quotes to custom mugs, T-shirts
            and hoodies. See a live preview of your item right on screen.
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
        </div>
        <Image
          src={HERO_IMAGE}
          alt="Kuch khaas banao: the DesignBanana shop on a phone, then the three steps — 1 Design a mug with your photo and words, 2 Preview it from every side, 3 Order and get the printed mug delivered"
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
