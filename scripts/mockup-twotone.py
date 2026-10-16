#!/usr/bin/env python3
"""
Two-Tone Mug preview photos, from the founder's studio shots (Oct 2026).

  python3 scripts/mockup-twotone.py <side-dir> <front-dir> [--out public/mockups]

The founder supplied two sets (the "Mug Mockup Instagram Story" 6 and 7 zips).
Both number their files from the same range, so they stay in separate folders:

  <side-dir>   63 red   64 blue   65 black   side views, handle RIGHT, white bg
               56 red   57 blue   58 black   on a cream knit blanket
  <front-dir>  65 red   66 blue   64 black   front views, handle hidden
               70 red                        held in both hands

This writes, per colour:

  twotone-right-<c>.webp   the side view as supplied (handle right)
  twotone-left-<c>.webp    the side view flipped (handle left)
  twotone-front-<c>.webp   the front view (handle behind the mug)
  twotone-hands-red.webp   red only: the mug held in both hands

The blanket shots are NOT built yet: the preview wraps a design by reading
each photo column as an angle around an upright mug, and the blanket mug lies
at about 35 degrees, so its silhouettes are diagonal and the model does not
fit. See docs/ops/mockup-assets.md.

The in-hands shot is red only — the founder supplied no blue or black one, and
recolouring it would tint the fingers, which are close to the rim's red.

Within each set the colours are the same shot, so one set of measurements
serves all three (see the TWOTONE_* constants in mockup/specs.ts).
"""
import argparse
from pathlib import Path

from PIL import Image

#: <side-dir> stems. FABRIC and HANDS are the founder's lifestyle shots,
#: kept here as the record of which file is which; not built yet (see above).
SIDE = {"red": "63", "blue": "64", "black": "65"}
FABRIC = {"red": "56", "blue": "57", "black": "58"}
#: <front-dir> stems. HANDS is red only (no blue/black shot was supplied).
FRONT = {"red": "65", "blue": "66", "black": "64"}
HANDS = {"red": "70"}


def save(im: Image.Image, path: Path, quality: int = 82) -> None:
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"  {path.name}  {path.stat().st_size // 1024} KB")


def load(folder: Path, stem: str) -> Image.Image:
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = folder / f"{stem}{ext}"
        if p.exists():
            return Image.open(p).convert("RGB")
    raise SystemExit(f"{folder}/{stem}.(png|jpg) not found")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("side", type=Path, help="folder with the side + blanket shots")
    ap.add_argument("front", type=Path, help="folder with the front + in-hands shots")
    ap.add_argument("--out", type=Path, default=Path("public/mockups"))
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    for colour, stem in SIDE.items():
        im = load(args.side, stem)
        print(f"{colour} side: {stem} {im.size}")
        save(im, args.out / f"twotone-right-{colour}.webp")
        save(
            im.transpose(Image.FLIP_LEFT_RIGHT),
            args.out / f"twotone-left-{colour}.webp",
        )

    for colour, stem in FRONT.items():
        im = load(args.front, stem)
        print(f"{colour} front: {stem}")
        save(im, args.out / f"twotone-front-{colour}.webp")

    for colour, stem in HANDS.items():
        im = load(args.front, stem)
        print(f"{colour} in hands: {stem}")
        # A photograph, not a flat studio render: it needs more bits.
        save(im, args.out / f"twotone-hands-{colour}.webp", quality=72)


if __name__ == "__main__":
    main()
