import Image from "next/image";

/**
 * DesignBanana logo (founder's PNG, `public/brand/`; docs/brand.md).
 * Drawn at 36 px high from a 2× file. Swap for the SVG when it arrives.
 */
export function Wordmark() {
  return (
    <Image
      src="/brand/designbanana-logo.png"
      alt="DesignBanana"
      width={176}
      height={36}
      priority
      className="h-9 w-auto"
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
