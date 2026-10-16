#!/usr/bin/env python3
"""
Two-Tone Mug preview photos, built from the founder's three studio shots.

  python3 scripts/mockup-twotone.py <source-dir> [--out public/mockups]

The founder supplied one studio view per colour (white body, coloured rim,
handle and inside; handle on the RIGHT). Expected file names in <source-dir>:

  61.jpg red   62.jpg blue   63.jpg black

The founder's paired shots (57/58/59) and the mug on knit fabric (56) are not
built here yet: a pair shows both halves of the wrap at once, which needs the
preview engine to compose two mugs in one photo.

From each studio shot this writes the three views the preview needs:

  twotone-right-<c>.webp  the photo as supplied (handle right)
  twotone-left-<c>.webp   mirrored (handle left)
  twotone-front-<c>.webp  handle removed, so the handle can sit behind the mug
                          (`handleAngleDeg: 180`); everything right of the body
                          is replaced by the mirrored background from the left,
                          which carries the matching drop shadow

The three studio shots are the same render in three colours (identical body
pixels), so one set of measurements serves all of them: see TWOTONE_STUDIO in
src/features/editor/mockup/specs.ts.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

# Body silhouette on the studio shots, measured once (all three are identical).
BODY_LEFT, BODY_RIGHT = 259, 746
#: First column past the body: everything from here right is handle.
HANDLE_FROM = 747
#: Sample the replacement background this much further out, so the body's own
#: left silhouette is not mirrored back in as a ghost edge.
MIRROR_OFFSET = 28
#: Below this row the glossy body reflects the handle; desaturated for the
#: front view. Above it is the rim and the coloured inside, which stay.
REFLECTION_FROM = 275

COLOURS = {"red": "61", "blue": "62", "black": "63"}


def save(im: Image.Image, path: Path, quality: int = 82) -> None:
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"  {path.name}  {path.stat().st_size // 1024} KB")


def drop_handle(im: Image.Image) -> Image.Image:
    """
    The front view: the handle sits behind the mug, so it is taken out of the
    photo. Two steps, because erasing the handle alone leaves it visible:
    the handle side is replaced by the mirrored background from the left (which
    carries the matching drop shadow), and the body is desaturated below the
    rim, where the glossy ceramic reflects the handle as a coloured edge.
    """
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    out = a.copy()
    for x in range(HANDLE_FROM, w):
        mx = BODY_LEFT + BODY_RIGHT - x - MIRROR_OFFSET
        out[:, x] = a[:, mx] if 0 <= mx < w else 255.0

    grey = (0.299 * out[:, :, 0] + 0.587 * out[:, :, 1] + 0.114 * out[:, :, 2])
    band = np.zeros((h, w, 1), np.float32)
    band[:, BODY_LEFT:HANDLE_FROM] = 1.0
    # Ramp in over 20 px so the rim's colour is not clipped by a hard line.
    ramp = np.clip((np.arange(h) - REFLECTION_FROM) / 20.0, 0, 1)[:, None, None]
    f = ramp * band
    out = out * (1 - f) + grey[:, :, None] * f
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path, help="folder with the founder's jpgs")
    ap.add_argument("--out", type=Path, default=Path("public/mockups"))
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    for colour, stem in COLOURS.items():
        im = Image.open(args.source / f"{stem}.jpg").convert("RGB")
        print(f"{colour}: {stem}.jpg {im.size}")
        save(im, args.out / f"twotone-right-{colour}.webp")
        save(im.transpose(Image.FLIP_LEFT_RIGHT), args.out / f"twotone-left-{colour}.webp")
        save(drop_handle(im), args.out / f"twotone-front-{colour}.webp")


if __name__ == "__main__":
    main()
