# Mockup photos

Preview mockups wrap the customer's design around a photo of the product
(`src/features/editor/mockup/`). Photos live in `public/mockups/`.

| File                                | View                                          | Source |
| ----------------------------------- | --------------------------------------------- | ------ |
| `public/mockups/mug-front.webp`     | Front (handle hidden, design centre faces us) | Canva  |
| `public/mockups/mug-left.webp`      | Left side (handle on the left)                | Canva  |
| `public/mockups/mug-right.webp`     | Right side (handle on the right)              | Canva  |
| `public/mockups/mug-lifestyle.webp` | Lifestyle: pampas grass, eye level            | Canva  |
| `public/mockups/mug-flatlay.webp`   | Flat lay on a desk with props, from above     | Canva  |

| `public/mockups/tshirt-front.webp` | T-shirt: the editor background without guides (default / main picture) | Founder-supplied |
| `public/mockups/tshirt-model.webp` | T-shirt: model on grey (aligned to the founder's reference render, ±2 px); NOT in the gallery, kept as `PARKED_TSHIRT_SPECS` (engine reference) | Founder-supplied |
| `public/mockups/tshirt-studio.webp` | T-shirt: torso on grey studio | Founder-supplied |

T-shirt photos are white tees: each spec has a `quad` (top-left, top-right,
bottom-left corners of the 300 x 400 mm print on the photo, photo pixels; sized
drawn by the founder on each photo; a cropped shirt may run off the photo). The railing, folded and flat-lay photos are parked in `docs/tasks/assets/` (task 29). The design is multiplied by the photo's shading
(`mockup/compose-garment.ts`). Screen-only; other colours are not recoloured yet.
Check the licence/model release of the photos before launch.

- All are 1080 x 1080 WebP. The three studio shots (front/left/right) are the
  same mug and share geometry. The photos are interchangeable: to use a
  different background, props or mug colour, replace the file and re-measure
  (below); the mockup generation does not change.
- Canva: check that the content licence covers commercial use on the site
  (Pro/stock elements have their own terms). Keep the Canva project link here.
- Each photo has its own file (no runtime mirroring); `spec.mirror` exists for
  a photo measured the other way round.

## How a view is made

`mockup/mapping.ts` (pure, unit-tested) turns each photo column into an angle
on the mug and then into a position on the flat design; `mockup/compose.ts`
paints it, multiplying by the photo's own brightness so gloss and shading show
through. A photo with the handle on the right shows the right half of the wrap, handle
on the left the left half, and a front view (handle hidden, `handleAngleDeg:
180`) shows the middle; the print stops short of the handle (the gap).

## Adding or changing a photo

1. Save a WebP (≈ 800–1000 px wide, < 100 KB) in `public/mockups/`.
2. Add an entry to `MOCKUP_SPECS` in `mockup/specs.ts` (each entry is one
   preview tab): image size, `side` ("right" = handle on the right), the mug
   body's left/right silhouette x and the y of the rim's _front_ edge and base's
   _front_ edge at the centre, all in that image's pixels.
   - `sag`: how many px lower the rim/base lines are at the centre than at the
     silhouette edges (0 for an eye-level shot; ~50-65 for a 20 degree overhead shot).
   - `tilt`: px the lines are higher on the right silhouette than the left (a
     slightly tilted photo).
   - `outline` (optional): the mug's measured top and base edges as points
     `[x, y]`, left to right. When set, the print band follows them exactly and
     `sag`/`tilt` are ignored. Use it when the mug is tilted or not a clean
     cylinder (the flat lay uses it). Measure the edges on the photo, e.g. with a
     contrast-stretched crop, and follow the smooth rim, not the tight corners.
   - Measure `sag` on the base line: `sag = (y at centre - y at column with
cos = c) / (1 - c)`. Check the result with `pnpm exec playwright test
mockup` and look at the strip under the print: it should be an even width.
   - `geometry.handleAngleDeg`: where the handle is, in degrees from the camera
     (90 = pure side view, smaller = the handle turned toward the camera).
     Judge it from where the handle **joins the body**: at the silhouette edge
     it is ~90 (do not infer it from how far the handle sticks out; that
     depends on the lens and shot angle). A too-small angle pushes the print
     away from the handle towards the front.
3. `pnpm exec playwright test mockup` writes screenshots to `test-results/`.

## When the vendor sends real measurements

| Vendor number         | Change                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| Print width x height  | `src/config/products/mug.ts` `printArea` only; mockups follow it.        |
| Mug outer diameter    | `mockup/specs.ts` `geometry.diameterMm`.                                 |
| Mug height            | `mockup/specs.ts` `mugHeightMm` (the print band is sized against it).    |
| Rim-to-print distance | `mockup/specs.ts` `topMarginMm` (omit = centred on the body).            |
| Handle gap            | Nothing: computed from wrap and diameter. A mismatch means one is wrong. |

Then run `pnpm exec playwright test mockup` and check the screenshots in
`test-results/`: margins, the gap next to the handle, and the base curve.
Never edit `body` or `sag` for vendor numbers; they describe the photo.

## Vendor TODO

`geometry.diameterMm` (83 mm) and `mugHeightMm` (96 mm) are Printful's approximate
values, and the handle gap follows from them; all are assumptions. Confirm with
the vendor (see `docs/ops/print-specs.md`).

## Garment photos: print corners, curved edges, ink look

- `quad` has the print rectangle's corners on the photo (`br` only when the photo
  has perspective). `edges` lists, per edge, how far it sits off the straight line
  between its corners (px, 25 samples along the edge), so the print follows ripples
  and folds. Measure both from a placeholder render: find the placeholder's outline
  against the clean photo, then fit corners and edge offsets to it (the model photo
  reaches ~99.5% overlap), and check the result against the reference render.
- `ink` overrides the default `INK` numbers per photo. The model photo's numbers are
  fitted to the founder's reference render (mean colour error ~3 levels, same grain
  strength); the defaults are a middle setting for photos without a reference.
- When the vendor's real print photos exist, refit `INK` and `ink` against them.

- Garment `mask` (optional): a photo-sized grey image (white = ink) measured from a placeholder render. Gives sharp corners and exact fold outlines (`public/mockups/tshirt-model-mask.png`); the design is still mapped through `quad`/`edges`.

- `tshirt-window.webp`: front and back tee on orange with a window shadow baked in (print on the left shirt). T-shirt gallery order: front, window, studio, closeup. Removed by the founder: model, torso on teal, pointing (torso and pointing photos are in `docs/tasks/assets/`).

- Garment `displace`, `shadow`, `highlight` (all optional): half-size PNGs the engine scales to the photo.
  `displace`: red/green = x/y shift in px (128 = none, 16 levels per px, about +-8 px).
  `shadow`: multiplied into the ink (255 = lit). `highlight`: added to the ink (0-255 = up to 64 levels
  times `ink.highlight`, default 0.15), mostly useful on dark garments.
  Drafted with `python3 scripts/mockup-draft.py <photo> <out-prefix> --box x0,y0,x1,y1`, which writes
  `<prefix>-displace.png`, `-shadow.png`, `-highlight.png`: MiDaS v2.1 small (ONNX, downloaded once to
  `.cache/`) for the broad shape, the photo's brightness for fold detail, shadow and highlight.
  Needs `numpy opencv-python onnxruntime`. Today's layers are estimates for the alpha; a retoucher's
  layers from the real vendor photo replace them by file name, no code change. Without them the engine
  measures shading and a rough warp from the photo itself.

Layer details and how to swap in a designer's files: `mockup-layer-pack.md`; what to ask the vendor to shoot: `mockup-shot-brief.md`.
