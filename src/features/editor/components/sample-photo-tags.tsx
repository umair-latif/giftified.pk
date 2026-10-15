import { ImageIcon } from "@/components/ui/icons";
import type { SamplePhotoTag } from "../engine";

/** Keep a tag inside the print area even if its photo's centre is near an edge. */
const clamp = (n: number) => Math.min(88, Math.max(12, n));

/**
 * A "Sample photo" tag on each photo the customer still has to replace. Tapping
 * a tag selects that photo and opens the photo picker. Screen-only (CSS), so
 * it never reaches exports. The selected photo has no tag: its selection bar
 * already offers Replace.
 */
export function SamplePhotoTags({
  tags,
  widthMm,
  heightMm,
  onPick,
}: {
  tags: readonly SamplePhotoTag[];
  widthMm: number;
  heightMm: number;
  onPick: (index: number) => void;
}) {
  return (
    <>
      {tags
        .filter((t) => !t.selected)
        .map((t) => (
          <button
            key={t.index}
            type="button"
            data-testid="sample-photo-tag"
            aria-label="Sample photo: tap to choose your own photo"
            onClick={() => onPick(t.index)}
            style={{
              left: `${clamp((t.xMm / widthMm) * 100)}%`,
              top: `${clamp((t.yMm / heightMm) * 100)}%`,
            }}
            className="bg-highlight text-ink border-ink absolute z-10 inline-flex min-h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border-2 px-2.5 text-xs leading-none font-semibold whitespace-nowrap"
          >
            <ImageIcon width={14} height={14} />
            Sample photo
          </button>
        ))}
    </>
  );
}
