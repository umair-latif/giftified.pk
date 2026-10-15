import type { Swatch } from "../catalog-model";

/** Colour dots with an accessible label ("Colours: Gloss White, Black"). */
export function Swatches({
  swatches,
  size = "sm",
}: {
  swatches: Swatch[];
  size?: "sm" | "md";
}) {
  if (swatches.length === 0) return null;
  const dot = size === "md" ? "size-7" : "size-4";
  return (
    <ul
      className="flex flex-wrap gap-1.5"
      aria-label={`Colours: ${swatches.map((s) => s.name).join(", ")}`}
    >
      {swatches.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span
            className={`${dot} border-ink/25 inline-block rounded-full border`}
            style={{ backgroundColor: s.hex ?? "#e4e4e7" }}
            title={s.name}
          />
          {size === "md" && (
            <span className="text-ink/80 text-sm">{s.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
