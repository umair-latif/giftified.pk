import Image from "next/image";
import Link from "next/link";

/** TODO(founder): replace with a real product photo (WebP, ≤ 100 KB, ~1600×1000). */
const HERO_IMAGE = "/home/hero-placeholder.webp";

export function Hero() {
  return (
    <section className="bg-mint-100 px-4 pt-6 pb-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-brand-900 text-[1.75rem] leading-tight sm:text-4xl">
          Your photo, your words — on a mug, tee or hoodie
        </h1>
        <p className="text-ink mt-2 text-base">
          Pay cash on delivery across Pakistan
        </p>
        <Link
          href="/products"
          className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 mt-5 inline-flex h-12 items-center rounded-full px-6 font-medium text-white"
        >
          Start designing
        </Link>
        <Image
          src={HERO_IMAGE}
          alt="A custom printed mug"
          width={1600}
          height={1000}
          preload
          sizes="(min-width: 768px) 768px, 100vw"
          className="mt-6 h-auto w-full rounded-2xl"
        />
      </div>
    </section>
  );
}
