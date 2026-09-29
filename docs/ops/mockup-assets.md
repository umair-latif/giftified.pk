# Mockup photos

Preview mockups wrap the customer's design around a photo of the product
(`src/features/editor/mockup/`). Photos live in `public/mockups/`.

| File                           | Used for                             | Source                           |
| ------------------------------ | ------------------------------------ | -------------------------------- |
| `public/mockups/mug-side.webp` | Mug preview, left + right side views | Unsplash (free licence), cropped |

- Unsplash licence: free commercial use, editing allowed, attribution optional.
  Keep the photo URL and photographer name in the row above when known.
  Do not offer the photos as downloads.
- The **left** view is the same photo mirrored at render time, so there is one
  file per angle.

## How a view is made

`mockup/mapping.ts` (pure, unit-tested) turns each photo column into an angle
on the mug and then into a position on the flat design; `mockup/compose.ts`
paints it, multiplying by the photo's own brightness so gloss and shading show
through. Right view = right half of the wrap, left view = left half; the print
stops short of the handle (the gap).

## Adding or changing a photo

1. Save a WebP (≈ 800–1000 px wide, < 100 KB) in `public/mockups/`.
2. Add an entry to `MOCKUP_SPECS` in `mockup/specs.ts` (each entry is one
   preview tab): image size, `side` ("right" = handle on the right), the mug
   body's left/right silhouette x and the y of the rim's _front_ edge and base's
   _front_ edge at the centre, all in that image's pixels.
   - `sag`: how many px lower the rim/base lines are at the centre than at the
     silhouette edges (0 for an eye-level shot; ~50-65 for a 20 degree overhead shot).
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
