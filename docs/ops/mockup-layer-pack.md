# Mockup layer pack (per photo)

Each product photo gets a pack in `public/mockups/<product>-<colour>-<view>/`. The preview
engine (`src/features/editor/mockup/compose-garment.ts`) reads it, so no per-photo
hand fitting is needed.

| File            | What it is                                                                         |
| --------------- | ---------------------------------------------------------------------------------- |
| `photo.webp`    | The clean product photo (<= 2048 px, no print guides)                              |
| `mask.png`      | Grey, white = ink. Exact print outline incl. folds, sharp corners                  |
| `displace.png`  | Grey, 128 = no shift. Red/green = x/y shift in px (+-8): how folds bend the ink    |
| `shadow.png`    | Grey multiply layer, 255 = no darkening. Folds, body shading, window light         |
| `highlight.png` | Grey add layer (0-255): light catching ridges. Matters on dark garments            |
| `texture.png`   | Tiling weave/grain (seamless), applied to ink                                      |
| `occlusion.png` | Optional: white where something sits in front of the print (hair, arm, drawstring) |
| `pack.json`     | Quad corners (px), print size (mm), ink settings, source/credit                    |

## How they are made

1. `pnpm mockup:draft <photo> <placeholder-photo>` generates a first draft of `mask`, `displace`,
   `shadow`, `highlight` and `pack.json` from the clean photo and the placeholder frame
   (traced outline; shadow from the photo's low frequencies; highlight from its ridges).
2. A retoucher (or we) opens the layers in Photoshop/Photopea, fixes edges and folds, and
   adds `occlusion` where needed. Do not re-draw; only correct.
3. `pnpm test` checks the pack (sizes match, mask corners inside the photo, print ratio 3:4).

## Colours

Every colour has its own pack, made from its own photos. Do not reuse shadow or highlight
across colours: shading from white does not carry over to black or grey.

## Quality bar

The preview of a flat test design must be indistinguishable from the placeholder-based
reference at 100% zoom: sharp print corners, folds bending the ink, fabric grain visible.
Check against one printed sample from the vendor before launch.
