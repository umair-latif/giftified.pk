import Image from "next/image";

/**
 * DesignBanana logo (founder's PNG, `public/brand/`; docs/brand.md).
 * 40 px high on a phone, 44 px from `sm`, 48 px from `lg`; the file is 3× the
 * largest size so it stays sharp. Swap for the SVG when it arrives.
 */
export function Wordmark() {
  return (
    <Image
      src="/brand/designbanana-logo.png"
      alt="DesignBanana"
      width={239}
      height={48}
      priority
      className="h-10 w-auto sm:h-11 lg:h-12"
    />
  );
}

/** Text version for dark backgrounds (footer): white "design", pink "banana". */
export function WordmarkOnDark() {
  return (
    <span className="font-display text-xl text-white">
      design<span className="text-magenta">banana</span>
    </span>
  );
}
