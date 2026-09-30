# 28 — Hoodie: print specs, colours, sizes, preview

**Branch:** `feat/hoodie` · **Owner:** _unassigned_ · **Needs:** 27 (t-shirt), which builds the shared apparel parts

## Why

The third MVP product. After task 27 the apparel machinery exists (garment colour swatches, flat garment
preview, size picker, apparel seed data, collar-referenced proof). The hoodie should be mostly config plus its
own photos. Do not start before 27 is merged; if you do, you will rebuild what 27 builds.

3D preview is **postponed** (not in the MVP). Flat 2D mockup only.

## Decisions to take (recommended defaults)

- **Front print only**, on the chest area **above the kangaroo pocket**. The pocket seam is the constraint: the
  print area must stop above it, so it is smaller than the t-shirt's.
- DTF print (as the t-shirt). Heavy fleece (320+ GSM) prints fine; no special handling on our side.
- Sizes S–XXL, attributes `colour` and `size` in WooCommerce, exactly like the t-shirt.
- Drawstrings, hood seams and pocket are **not** in the print area. Keep them in the mockup only.

## Scope

1. **`src/config/products/hoodie.ts`**: same shape as `tshirt.ts`. Placeholder print area 280 × 300 mm, safe
   margin 10 mm, `vendorTodo` (not vendor-confirmed). Base colours: Black, Navy, Heather Grey, Maroon, White
   (founder confirms). Register in `PRODUCTS`.
2. **Editor guide for the pocket.** Show where the pocket starts as an editor-only overlay (CSS, like the safe
   zone; guides must never leak into exports). If the print area already stops above the pocket this is only a
   label; if the vendor allows printing over the pocket, that is a second print-area decision: ask before adding.
3. **Garment mockup.** Add hoodie photos/specs beside the t-shirt's (composer from 27). The hoodie's folds make a
   flat overlay look pasted-on: apply a multiply blend of the photo's shading over the print so wrinkles show
   through, and check it on the darkest and lightest colour. Assets ≤ 100 KB each (WebP). **Founder supplies the
   garment photos.**
4. **Vendor proof.** Reference point is the neckline/collar as for the t-shirt. Add "above pocket" to the
   placement note if the proof has a free-text placement field.
5. **WooCommerce.** Extend `pnpm woo:seed` with a variable `hoodie` product (SKU `hoodie`), update
   `docs/ops/woocommerce-staging.md`.
6. **Storefront.** Remove the "Coming soon" state for the hoodie; size chart (chest/length in inches, from the
   founder).
7. **Docs.** `docs/ops/print-specs.md`: hoodie row and vendor questions (print height above the pocket).

## Founder inputs

Print area for the hoodie chest (above the pocket); colour range; size chart; prices; hoodie garment photos;
whether printing on the pocket or hood is ever wanted.

## Out of scope

Back/sleeve/hood prints, 3D displacement maps, embroidery, inventory.

## Acceptance criteria

- `/design/hoodie` opens with the pocket guide; colour swatches change the garment; DPI checks use the
  hoodie config.
- Preview, cart, checkout, print PNG and proof all work for a hoodie order (unit tests + new
  `tests/e2e/hoodie.spec.ts` at 360 px).
- `pnpm check` and `pnpm build && pnpm e2e` green.
