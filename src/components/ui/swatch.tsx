import type { Swatch as SwatchColour } from "@/config/colours";

interface Props {
  label: string;
  swatches: readonly SwatchColour[];
  value: string;
  onChange: (hex: string) => void;
}

/** A labelled grid of colour swatches; the matching one shows as selected. */
export function SwatchGrid({ label, swatches, value, onChange }: Props) {
  const current = value.toLowerCase();
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-8 gap-2 sm:grid-cols-10"
    >
      {swatches.map((s) => (
        <button
          key={s.hex}
          type="button"
          aria-label={s.name}
          aria-pressed={s.hex.toLowerCase() === current}
          onClick={() => onChange(s.hex)}
          className={`size-9 shrink-0 rounded-full ring-1 ring-zinc-300 ${
            s.hex.toLowerCase() === current
              ? "outline-brand-600 outline-2 outline-offset-2"
              : ""
          }`}
          style={{ backgroundColor: s.hex }}
        />
      ))}
    </div>
  );
}
