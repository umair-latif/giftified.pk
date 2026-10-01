# Print specs — where to change them

Each product's print specs live in **one file**. Change the numbers there and
everything else follows: the editor canvas, the safe-zone guide, the DPI checks,
the preview, and the 300 DPI print files.

| Product    | File                                                             |
| ---------- | ---------------------------------------------------------------- |
| Mug (11oz) | `src/config/products/mug.ts`                                     |
| T-shirt    | `src/config/products/tshirt.ts` (provisional task 27 config)     |
| Hoodie     | `src/config/products/hoodie.ts` (added when the hoodie launches) |

## What to ask the vendor, and where it goes

| Ask the vendor                                                    | Field in the file        | Example                               |
| ----------------------------------------------------------------- | ------------------------ | ------------------------------------- |
| Printable width in mm (for mugs: the full wrap, handle to handle) | `printArea.widthMm`      | `228`                                 |
| Printable height in mm                                            | `printArea.heightMm`     | `89`                                  |
| How far from the edges to keep important content                  | `printArea.safeMarginMm` | `5`                                   |
| Resolution they want (usually 300 DPI)                            | `printDpi`               | `PRINT_DPI` (= 300)                   |
| Where the handle is / what's the "front"                          | `edgeLabels`             | `{ left: "Handle", right: "Handle" }` |

Always use **millimetres**. If the vendor gives inches, multiply by 25.4
(9" = 228.6 → 228 mm, from Printful's 22.8 cm). The mug's size is a placeholder
until the Gujrat vendor confirms.

## How to change them

### Apparel confirmation checklist

The t-shirt config uses task 27's **unconfirmed** 300 × 400 mm print area,
10 mm safe margin and proposed garment colours. These enable development;
they are not vendor specifications or a launch approval. Keep `vendorTodo`
until the relevant founder/vendor confirmations are complete.

- Vendor: printable width/height and safe margin in **mm**, distance down from
  the **collar centre / neckline** to the top of the front print, and DTF file
  requirements (including resolution, transparency, colour space and any bleed).
- Founder, with vendor availability: actual colours and sizes, chest/length
  size-chart measurements in inches, selling prices in PKR, actual garment
  mockup photos, and confirmation of front-only launch scope.
- There is **no assumed collar offset**, price or size-chart measurement.
  Do not substitute zero for an unknown placement in production proofs.

Task 27's first configuration slice registers the t-shirt with the existing
editor and flat artwork preview. Garment mockups, colour/size selection,
WooCommerce seed variations, apparel placement proofs and the size chart are
follow-up work; registering the config alone does not complete task 27.

The founder's front/back shirt illustrations are stored as
`public/mockups/tshirt-editor-front.webp` and `tshirt-editor-back.webp`.
The front illustration is a faded, non-interactive DOM background behind the
editor's chest canvas; it never enters Fabric JSON or print exports. The back
asset is reserved for later back-print support. Screen placement fractions live
in `features/editor/mockup/garment-guide.ts` and are illustrative, not physical
collar-offset specifications. The editable area's aspect ratio still comes from
the product's print dimensions.

### Updating confirmed dimensions

1. Open the file (e.g. `src/config/products/mug.ts`) and edit the numbers.
2. Delete the `vendorTodo` line once the values are confirmed.
3. Run `pnpm check` — all tests are written against the config, so they should stay green.
4. Open a PR titled e.g. `chore(mug): vendor print specs 220 x 92 mm`.

## Good to know

- **Designs already saved in a browser** keep their objects' positions in mm; after a size
  change they may sit slightly off-centre. Before launch this doesn't matter.
- The print file size is `width ÷ 25.4 × DPI` pixels. At 228 × 89 mm and 300 DPI that is
  2693 × 1051 px.
- If the vendor needs **bleed** (printing a little past the edge), tell the lead developer —
  that is a new setting, not just a number change.
