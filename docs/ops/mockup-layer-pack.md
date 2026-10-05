# Mockup layers (per photo)

Each garment photo can carry extra layers that make the print look printed on the cloth.
The preview engine (`src/features/editor/mockup/compose-garment.ts`) reads whichever layers
a photo's spec lists in `src/features/editor/mockup/specs.ts`, and falls back to measuring
from the photo when a layer is missing. So layers can be added one at a time.

Files live next to the photo in `public/mockups/` and are named
`<product>-<name>-<layer>.png`, for example `tshirt-black-displace.png`.

## Layers the engine reads today

| Spec field  | File suffix      | What it is                                                                                                  |
| ----------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `mask`      | `-mask.png`      | Grey, full photo size. White = ink. Exact print outline incl. folds, sharp corners                          |
| `displace`  | `-displace.png`  | Red = x shift, green = y shift. 128 = none, 16 levels per px (about +-8 px). How folds bend the ink         |
| `shadow`    | `-shadow.png`    | Grey multiply layer. 255 = lit, lower = in shade. Folds, body shading, window light                         |
| `highlight` | `-highlight.png` | Grey add layer (0-255 = up to 64 levels x `ink.highlight`). Light catching ridges. Matters on dark garments |

`displace`, `shadow` and `highlight` may be half the photo size (the engine scales them up);
keep them smooth. All layers must line up exactly with the photo (same crop, no shift).

Planned, not read yet: `texture` (tiling weave), `occlusion` (white where hair, an arm or a
drawstring sits in front of the print), `pack.json`.

## Drafts we generate (for the alpha)

```
python3 scripts/mockup-draft.py <photo> <out-prefix> --box x0,y0,x1,y1
```

writes `<prefix>-displace.png`, `-shadow.png` and `-highlight.png` for a clean photo (`--box` =
the garment's area). Needs `numpy opencv-python onnxruntime`. The depth model (MiDaS v2.1
small, about 67 MB) is downloaded once to `.cache/`. These are estimates: good enough for
testing, not for launch. `mask` is traced by hand from a placeholder frame (see the shot brief).

## Swapping in a designer's layers (Fiverr or in-house)

1. Ask for the layers above, named as in the table, same pixel size as the photo (or exactly half).
   Give them the clean photo and the placeholder frame from `mockup-shot-brief.md`.
2. Copy them into `public/mockups/`, replacing the drafts (same names), or add them under the
   new photo's name.
3. Make sure the photo's spec lists the fields (`mask`, `displace`, `shadow`, `highlight`).
   Nothing else changes for a replacement; a new photo also needs its `quad` (print corners in
   photo px) and a unit-test pass (`pnpm check`).
4. Check it: render a grid design on the photo and look at 100% zoom. Lines must bend with the
   folds without pinching or tearing, print corners must be sharp, and the shading must not
   double up (the designer's `shadow` replaces the engine's own, so do not bake the same
   shadow into both the photo and the layer).
5. If the ink looks too flat or too washed out, tune `ink` in the spec (`shadow`, `highlight`,
   `opacity`) rather than editing the layers.
6. `pnpm build && pnpm e2e`, then open a PR with the photo, layers and spec lines.

## Colours

Every colour has its own photo and its own layers, made from its own photo. Do not reuse
`shadow` or `highlight` across colours: shading from a white shirt does not carry over to
black or grey.

## Quality bar

A flat test design on the photo must look like the vendor's real print at 100% zoom: sharp
print corners, folds bending the ink, fabric grain visible. Check against one printed sample
from the vendor before launch and tune `ink` to match.
