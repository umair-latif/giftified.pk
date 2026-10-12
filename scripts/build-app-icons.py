#!/usr/bin/env python3
"""Builds the installed-app icons in public/icons from src/app/icon.png.

  icon-192.png / icon-512.png   purpose "any": the banana on white, small margin
  icon-maskable-512.png         purpose "maskable": Android crops this to a
                                circle/squircle, so the banana stays inside the
                                central 80% "safe zone" on a white square

Run: python3 scripts/build-app-icons.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Image.open(ROOT / "src/app/icon.png").convert("RGBA")
OUT = ROOT / "public/icons"
OUT.mkdir(parents=True, exist_ok=True)


def render(size: int, fill: float) -> Image.Image:
    """Banana scaled to `fill` of the square, centred on white."""
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    inner = round(size * fill)
    art = SRC.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(art, (offset, offset), art)
    return canvas


render(192, 0.92).save(OUT / "icon-192.png", optimize=True)
render(512, 0.92).save(OUT / "icon-512.png", optimize=True)
render(512, 0.64).save(OUT / "icon-maskable-512.png", optimize=True)
print("wrote", *sorted(p.name for p in OUT.glob("*.png")))
