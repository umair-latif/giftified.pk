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
