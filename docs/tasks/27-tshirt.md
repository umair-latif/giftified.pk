# 27 — T-shirt: print specs, garment colours, sizes, preview

**Branch:** `feat/tshirt` · **Owner:** _unassigned_ · **Needs:** none (mug pipeline is done)

## Why

MVP scope is mugs, t-shirts and hoodies. Only the mug exists: `PRODUCTS` in `src/config/products/index.ts`
holds one entry, `ProductId` already allows `"tshirt"` and `"hoodie"`, and the catalog, cart, commerce mapping
(`size`, colour attributes) and vendor proof are already written to carry them. This task adds the t-shirt and
builds the parts that are **shared by all apparel**, so the hoodie (task 28) is mostly config.

3D preview is **postponed** (not in the MVP). The preview is the flat 2D mockup approach already used for the mug.

## Decisions to take (recommended defaults, change if the founder or vendor says otherwise)

- **Front print only** for the MVP. Back and sleeve prints are a later task (they need a placement choice in the
  editor and a second print file per line).
- **One print area**, centred horizontally, starting a fixed distance below the collar. Numbers below are common
  DTF placeholders, **not confirmed by the vendor**; mark them with `vendorTodo` like `mug.ts` does.
- **Print type is DTF** (per the project brief). DTF prints on any garment colour, so the transparent 300 DPI PNG
  works on every colour with no white-underbase logic on our side.
- Sizes are **S, M, L, XL, XXL** (WooCommerce variation attribute `size`; nothing is stored by us: no stock).

## Scope

1. **`src/config/products/tshirt.ts`** (a small dedicated PR per CLAUDE.md, or the first commit of this branch):
   `id: "tshirt"`, `name`, `subtitle`, `printArea` in mm (placeholder 300 × 400 mm, safe margin 10 mm),
   `printDpi: PRINT_DPI`, `baseColors` (start with White, Black, Navy, Red, Heather Grey; the founder confirms the
   real range), `wooSku: null`, `vendorTodo`. Register it in `PRODUCTS`. Do **not** add `edgeLabels` (mug only).
2. **Editor.** The canvas is the print area, so it already works. Check: safe-zone guide, DPI checks (they read
   the config), a colour swatch row that changes the garment shown behind the canvas (the mug has one colour, so
   this UI may not exist yet), and that nothing in `src/features/editor/` hardcodes mug behaviour (search for
   `"mug"`). Keep the 360 px budget.
3. **Garment preview (flat, 2D).** The mug uses photographed mockups wrapped by `src/features/editor/mockup/`.
   Apparel needs the simpler version: a flat photo of the garment per colour (or one neutral photo tinted by a
   mask) with the design placed at the print area's real position and scale. No curvature. Put the geometry in
   `mockup/specs.ts` next to the mug specs (or a sibling file) and reuse `compose.ts` if it fits; otherwise add
   a small `garment` composer. Assets in `public/mockups/`; keep each ≤ 100 KB (WebP). **Founder supplies the
   garment photos**; until then use a neutral placeholder and mark it `TODO(founder)`.
4. **Vendor proof.** `VendorProof.pdf` already lists product, colour, size, print size in mm and placement
   offsets. For apparel the reference point is the **collar centre / neckline**, offset measured down from it.
   Confirm the proof labels this correctly and shows the garment mockup.
5. **Print renderer.** Check `src/server/print/` renders a 300 DPI transparent PNG at exactly the print area
   (`widthMm ÷ 25.4 × 300` px = 3543 × 4724 px for 300 × 400 mm). That is a large canvas: measure memory in the
   worker and note the result in `docs/ops/order-pipeline.md`.
6. **WooCommerce.** Extend `scripts/woo-seed.ts` so `pnpm woo:seed` creates a variable `tshirt` product (SKU
   `tshirt`, attributes Colour and Size, one variation per colour × size, placeholder price) and update
   `docs/ops/woocommerce-staging.md`. Sizes and colours are read from WooCommerce, never hardcoded in the UI.
7. **Storefront.** `src/features/catalog/catalog-model.ts` and the home cards already know `tshirt`; remove any
   "Coming soon" state for it once `getProduct("tshirt")` returns a config. `/products/tshirt` needs the size
   picker (check `sizes()` in the catalog model) and a size chart.
8. **Size chart.** There is a `TODO(founder)` in `src/app/(store)/products/[slug]/page.tsx` for it. Add a small
   chest/length table (inches) from the founder's numbers.
9. **Docs.** `docs/ops/print-specs.md` already names `tshirt.ts`; add what to ask the vendor for apparel (print
   area, distance below collar, safe margin, DTF file requirements).

## Founder inputs (nothing here can be invented)

Print area size and distance below the collar; garment colour range; sizes offered and the size chart; price per
size (or one price); garment photos for the mockups; whether back or sleeve printing is wanted soon.

## Out of scope

Hoodie (28), back/sleeve prints, 3D preview, all-over prints, any inventory.

## Acceptance criteria

- `/design/tshirt` opens, the canvas is the print area, colour swatches change the garment behind it, DPI
  warnings work.
- Preview shows the design on the garment; the order reaches WooCommerce with colour and size; the print PNG and
  proof are produced for a t-shirt order (unit tests with mock commerce and storage, as for the mug).
- `pnpm check` and `pnpm build && pnpm e2e` green, including a new `tests/e2e/tshirt.spec.ts` (design → preview
  → cart → checkout at 360 px).
