import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/page";
import { SITE } from "@/config/site";

/**
 * Founder's Canva picture (designer → preview → delivered box), with the
 * browser bars removed and the step labels added. 1600×1000 WebP, ≤ 100 KB.
 * Change the file name when replacing it, so cached copies don't linger.
 */
const HERO_IMAGE = "/home/hero-steps-v2.webp";

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
          alt="Three steps: a mug design made in the DesignBanana designer on a phone, the preview of that mug, and the printed mug delivered in its box"
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
