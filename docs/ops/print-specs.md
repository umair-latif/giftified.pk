# Print specs — where to change them

Each product's print specs live in **one file**. Change the numbers there and
everything else follows: the editor canvas, the safe-zone guide, the DPI checks,
the preview, and the 300 DPI print files.

| Product    | File                                                              |
| ---------- | ----------------------------------------------------------------- |
| Mug (11oz) | `src/config/products/mug.ts`                                      |
| T-shirt    | `src/config/products/tshirt.ts` (added when the t-shirt launches) |
| Hoodie     | `src/config/products/hoodie.ts` (added when the hoodie launches)  |

## What to ask the vendor, and where it goes

| Ask the vendor                                                    | Field in the file        | Example                               |
| ----------------------------------------------------------------- | ------------------------ | ------------------------------------- |
| Printable width in mm (for mugs: the full wrap, handle to handle) | `printArea.widthMm`      | `216`                                 |
| Printable height in mm                                            | `printArea.heightMm`     | `89`                                  |
| How far from the edges to keep important content                  | `printArea.safeMarginMm` | `5`                                   |
| Resolution they want (usually 300 DPI)                            | `printDpi`               | `PRINT_DPI` (= 300)                   |
| Where the handle is / what's the "front"                          | `edgeLabels`             | `{ left: "Handle", right: "Handle" }` |

Always use **millimetres**. If the vendor gives inches, multiply by 25.4
(8.5" = 215.9 → use `216`).

## How to change them

1. Open the file (e.g. `src/config/products/mug.ts`) and edit the numbers.
2. Delete the `vendorTodo` line once the values are confirmed.
3. Run `pnpm check` — all tests are written against the config, so they should stay green.
4. Open a PR titled e.g. `chore(mug): vendor print specs 220 x 92 mm`.

## Good to know

- **Designs already saved in a browser** keep their objects' positions in mm; after a size
  change they may sit slightly off-centre. Before launch this doesn't matter.
- The print file size is `width ÷ 25.4 × DPI` pixels. At 216 × 89 mm and 300 DPI that is
  2551 × 1051 px.
- If the vendor needs **bleed** (printing a little past the edge), tell the lead developer —
  that is a new setting, not just a number change.
