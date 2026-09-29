# CLAUDE.md — Giftified.pk

Durable rules for AI-assisted development. Read this before every task.

## What we're building

Mobile-first Print-on-Demand store for Pakistan. Customers design mugs, t-shirts and
hoodies on their phone, preview in 2D/3D, and order with Cash on Delivery (COD).
Orders go to Gujrat/Sialkot print partners with a 300 DPI PNG and a `VendorProof.pdf`.
No vendor portal. No inventory. **MVP: COD confirmation and vendor hand-off are done
manually by the founder**; WhatsApp automation is a later scaling step.

Data flow:
Mobile PWA (Fabric.js editor + Three.js preview)
-> Next.js route handler creates the order in headless WooCommerce (REST v3, status on-hold)
-> WC webhook -> queue -> background worker (300 DPI render + PDF proof, links on the order)
-> founder confirms with the customer (call/message), sets order to Processing in WP admin
-> founder sends the PNG + PDF to the vendor (their own WhatsApp/email)
(Later: automated WhatsApp confirmation + vendor dispatch behind `lib/messaging`.)

## Tech stack

- Next.js 16 App Router (TypeScript) + React 19, Server Components by default. Next 16 differs from older docs: read AGENTS.md first.
- Tailwind CSS (mobile-first; design at 360px width first)
- Fabric.js v7 (ESM/TS) for 2D editing — client-only, dynamically imported
- Three.js via @react-three/fiber + drei for 3D preview — lazy-loaded, never in the initial bundle
- GLB assets with Draco (meshes) + KTX2/WebP (textures)
- Zod for all external input (API routes, webhooks, form data, Fabric JSON)
- Worker: **Inngest** (decided). Client `src/server/jobs/client.ts`, functions in `src/server/jobs/functions.ts`,
  served at `/api/inngest`. Job logic stays SDK-free with injected deps (`prepare-order-files.ts`).
- Server-side rendering of print files: node-canvas / @napi-rs/canvas + Fabric in Node
- PDFs: pdf-lib or PDFKit (server only)
- Object storage for uploads and print files (S3-compatible, e.g. Cloudflare R2)
- WhatsApp (post-MVP): official Meta WhatsApp Cloud API behind `lib/messaging`. The contract and a
  mock exist; nothing in the MVP flow may depend on it.

## Commerce: headless WooCommerce (decided)

- WordPress + WooCommerce runs on separate PHP hosting; it is the admin/order back office only.
  The customer never loads a WordPress page.
- All WC calls are **server-side** through `src/lib/commerce/woocommerce.ts` using REST API v3
  (`/wp-json/wc/v3`) with consumer key/secret from env. Never expose keys or call WC from the browser.
- Catalog: fetched in Server Components with ISR/`revalidate` caching. WC products are variable
  products (colour/size attributes). Print geometry does NOT live in WC — it lives in
  `src/config/products/*`, linked by WC product ID/SKU.
- Cart lives client-side (small store, no WC session). Checkout posts to our route handler, which
  re-prices from WC (never trust client prices), then creates the order via `POST /orders` with
  `payment_method: "cod"`, `set_paid: false`, `status: "on-hold"`, and line-item `meta_data`
  `_design_id`, `_print_png_url`, `_proof_pdf_url` (URLs filled in by the worker later).
- Order statuses (built-in only, no custom PHP for MVP):
  `on-hold` = awaiting COD confirmation (manual in MVP) -> `processing` = confirmed, sent to vendor
  -> `completed` = delivered/cash collected; `cancelled` = customer declined / no reply.
- Webhooks: WC `order.created` / `order.updated` -> `/api/webhooks/commerce`. Verify
  `X-WC-Webhook-Signature` (base64 HMAC-SHA256 of the **raw** body with the webhook secret)
  before parsing. Ack fast (200), enqueue the job, do the work in the worker.
- Order notes (`POST /orders/{id}/notes`) record each pipeline step (rendered, verified,
  dispatched) so the founder can audit from WP admin.
- Shipping: flat-rate zones by city configured in WC; read, don't hardcode.
- Avoid WC plugins that add frontend weight; any server plugin needs a written reason.

## Code conventions

- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`; use `unknown` + Zod.
- Files: kebab-case. Components: PascalCase exports. Hooks: `use-*.ts` exporting `useX`.
- Fabric.js logic lives in `src/features/editor/engine/` as framework-agnostic modules,
  exposed to React through small hooks (`useFabricCanvas`, `useCanvasHistory`,
  `useTextTools`, `useImageUpload`, ...). Components never call Fabric APIs directly.
- One source of truth for geometry: `src/config/products/*.ts` defines each product's
  print area in **millimetres** plus DPI. All pixel math derives from it via
  `src/lib/units.ts` (`mmToPx(mm, dpi)`, `pxToMm(px, dpi)`). Never hardcode pixel sizes.
- Always dispose Fabric canvases and Three.js geometries/materials/textures on unmount.
- Server-only modules import `server-only`. Secrets never reach client bundles.
- WooCommerce, messaging, email and storage are accessed only through adapters in `src/lib/*`.
- Prices in PKR as integers (rupees). Phone numbers normalised to E.164 (`+92...`).
- Tests: Vitest for engine/units/pricing/DPI math; Playwright for the mobile editor flow.

## Hard operational rules

1. **No vendor portal.** Vendors receive the PNG + PDF only. MVP: the founder sends them by hand
   from the links on the order in WP admin; automation comes later.
2. **Zero inventory.** Never model stock levels; availability comes from product config.
3. **Performance budget:** LCP < 2.5s on mid-range Android over 4G. Initial JS for the
   product page < 200 KB gzipped. Fabric and Three load only when the editor/preview opens.
   Each 3D model < 1.5 MB (Draco); textures ≤ 2048px, compressed.
4. **DPI check ≥ 200 effective DPI.** Effective DPI = image pixel width ÷ printed width in
   inches _at its current scale on the print area_. Ignore EXIF/metadata DPI. Recompute on
   every scale change; warn below 200, block checkout below 150 (configurable).
5. **Print files are rendered server-side** from saved Fabric JSON + original uploaded
   assets at 300 DPI. Never generate the 300 DPI file on the phone (memory limits) and
   never render print files from the compressed preview images.
6. **Client-side compression is for preview/upload bandwidth only.** Keep the original
   upload for print; compress a separate preview copy.
7. **Orders go to production only after COD confirmation** (address + product/size confirmed
   with the customer; MVP: by the founder, recorded by setting the order to Processing).
   Unconfirmed orders are never sent to a vendor.
8. **Idempotency:** every webhook and job is keyed by order ID; re-delivery must not
   double-dispatch to a vendor.
9. Print PNGs: transparent background, sRGB, exact print-area dimensions from config.
10. `VendorProof.pdf` always includes: order ID, product, colour, size, print dimensions
    (mm), placement offsets (mm from reference point), mockup preview, customer city.
    No customer phone/address in vendor docs unless the vendor needs it for shipping.

## Workflow & parallel work

- GitHub: `umair-latif/giftified.pk`. `main` only changes via PRs with green CI (`.github/workflows/ci.yml`), from
  `feat/*`, `fix/*` or `chore/*` branches. Small PRs (ideally < 400 changed lines).
- Modules are split into task briefs in `docs/tasks/` (status board in its README). Each
  brief lists the folders you may edit — stay inside them.
- **Shared contracts** (change only in a separate PR approved by the lead):
  `src/types/design.ts` (DesignDocument), `src/types/order.ts`, `src/types/cart.ts`, `src/lib/commerce/types.ts`,
  `src/lib/messaging/types.ts`, `src/server/print/types.ts`, `src/server/pdf/types.ts`,
  `src/features/preview-3d/types.ts`.
- Build against mocks and fixtures instead of waiting: `createMockCommerce()`,
  `createMockMessenger()`, `tests/fixtures/design-mug.json`, `tests/fixtures/design-mug-preview.png`.
- `package.json`, `CLAUDE.md` and `src/config/products/` change only in small dedicated PRs.
  Lockfile conflicts: rebase, `pnpm install`, commit — never hand-edit `pnpm-lock.yaml`.
- Lead (Claude) owns: editor engine + hooks, image upload/DPI, print renderer, contracts, reviews.
  Other assistants (a second Claude session, Cursor, Gemini) take the other briefs, e.g. checkout
  form (05), text "More" sheet (06), vendor PDF (03), 3D mug (04). The lead reviews every PR.
- Run `pnpm check` before every commit; UI changes also `pnpm build && pnpm e2e`.
- When unsure about print dimensions or vendor requirements, ask — don't guess.

## Commands

- `pnpm dev` — local dev server (http://localhost:3000, editor at /design/mug)
- `pnpm check` — lint + typecheck + unit tests (run before every commit)
- `pnpm build && pnpm e2e` — production build + Playwright mobile tests (360px, touch).
  First time: `pnpm exec playwright install chromium` (or set `PW_CHROMIUM_PATH`).
- `pnpm print:sample` — render the fixture design to `out/print-sample.png` (300 DPI print file).
- `pnpm storage:check` — checks the R2/S3 settings in `.env.local` (write, read, signed links, CORS).
- `pnpm order:files <orderId>` — makes an order's print files now (same code as the job), from `.env.local`.
  Pipeline setup and troubleshooting: `docs/ops/order-pipeline.md`; founder checklist: `docs/ops/manual-dispatch.md`.
  Guide: `docs/ops/storage-r2.md`.
- `pnpm woo:seed` / `pnpm woo:smoke` — set up / live-check a WooCommerce test store from `.env.local`
  (guide: `docs/ops/woocommerce-staging.md`).
- Print specs per product: `src/config/products/*.ts` (guide: `docs/ops/print-specs.md`). Tests read
  the config, so changing a size is a one-file edit.

## Editor engine notes

- Fabric scene units are **mm**; the canvas is exactly the print area, and the viewport
  transform only scales mm → screen px. Server print render = same JSON at zoom 300/25.4.
- Fabric owns the DOM inside the editor host div (canvas created imperatively in
  `useFabricCanvas`); never render React children there.
- Guides (safe zone, edge labels) are CSS overlays so they can never leak into exports.
- Undo/redo = JSON snapshots of the canvas (`engine/history.ts`, pure stack in
  `history-stack.ts`) recorded on add/remove/modified. Anything not serialised (control
  styles, snap settings) must be re-applied in `applyTouchControls` after a restore.
- Drafts autosave to localStorage per product (`features/editor/draft.ts`) so Back/Next and
  refresh never lose work. Keep designs small: images go in as storage URLs, never data URLs.
- Snapping: object centre snaps to the centre lines within 8 screen px; rotation snaps to
  0/90/180/270° within 5° (`engine/snap.ts`, pure + unit-tested).
- Photos: `features/editor/assets/` keeps the ORIGINAL upload + a ≤2048 px WebP preview in
  IndexedDB; the canvas shows the preview, the design stores `src: "asset:<id>"` plus
  `assetId`/`sourceWidthPx`/`sourceHeightPx`. DPI always uses the original's pixels
  (`engine/image.ts` `objectDpi`, `lib/print-quality.ts` `printQualityReport` for whole designs).
  Checkout uploads originals to storage and the print renderer resolves `asset:<id>` to them.
- IDs: use `newId()` (`src/lib/id.ts`), never `crypto.randomUUID()` directly — it doesn't exist on
  plain-HTTP pages (phones testing the dev server by LAN IP). Same care for other secure-context APIs.
- Fabric ignores mouse input for 400 ms after a touch gesture; in e2e tests use
  `page.touchscreen.tap` after a pinch, not `page.mouse.click`.
- Selection bar (`components/selection-bar.tsx`) sits above the bottom toolbar while something is
  selected: text → font, colour (`config/colours.ts`), bold/italic/underline; photo → crop; both → copy, delete. Crop maths is
  pure in `engine/crop.ts` (normalised 0–1 rects); DPI accounts for the crop.
- Drafts also save on `pagehide`/`visibilitychange`, so a reload right after an edit keeps it.
- Cart (`src/features/cart/`): lines in localStorage (`cart-storage.ts`, `CartItem` contract); each
  line's design is a **saved design** (`draft.ts`: `giftified:design:<designKey>`, thumbnail
  `giftified:thumb:<designKey>`), separate from the per-product draft. Preview → **Add to cart**
  snapshots the draft (`addDraftToCart`) and clears it; `/design/<p>?item=<lineId>` edits a line's
  design in place. Pure line logic in `cart-lines.ts` (`distinctDesigns` = what checkout uploads);
  checkout uploads each with `uploadCartDesign(productId, designKey)`; prices via `quoteCart`.
  `pruneAssets` keeps photos of drafts AND saved designs.
- Storage: `src/lib/storage` (`getStorage()`, R2/S3 via aws4fetch; in-memory in dev/demo). Keys live in
  `keys.ts` (`designs/<id>/design.json`, `designs/<id>/assets/<assetId>`, `orders/<id>/line-<n>/…`).
  Photos go phone → storage via presigned PUT (`/api/designs` + `features/editor/upload-design.ts`),
  never through our functions (Vercel's 4.5 MB request limit). Bucket stays private.
- Text styling goes through `engine/text-style.ts` (`applyTextStyle`, `getTextStyle`),
  exposed as `useFabricCanvas().applyTextStyle / setText / selection.text`.
- Fonts (task 16): `config/fonts.ts` is the one list; browser (`public/fonts/print/*.woff2`) and print
  (`server/print/fonts/*.ttf`) use the same files under the same "Giftified …" names, real faces only
  (no Caveat italic, no Urdu bold/italic). Before any render, `fonts/migrate.ts` maps old device stacks
  (`Arial, …`) to them and `fonts/load-fonts.ts` loads just the faces the design uses (`designFontFaces`
  → `loadFaces`); late faces re-layout the text. Rebuild with `python3 scripts/build-fonts.py`.
- Every screen uses `components/ui/app-header.tsx` (back arrow to a fixed parent route,
  optional Next) and `step-bar.tsx` (Design → Preview → Order).
- Fabric v7 has no built-in pinch/rotate; `engine/gestures.ts` implements it with raw touch
  events. Keep controls finger-sized (`engine/controls.ts`).

## Directory map

src/app/ routes: (store) pages, design/[product] editor, api/checkout, api/webhooks, api/jobs
src/features/editor/ engine/ (Fabric modules), hooks/, components/ (toolbars, sheets, layers)
src/features/preview-3d/ scenes/ (mug, tshirt, hoodie), materials/, hooks/
src/features/checkout/ COD form, address validation
src/server/print/ 300 DPI renderer (Fabric JSON -> PNG)
src/server/pdf/ VendorProof.pdf builder
src/server/jobs/ Inngest client/functions + prepare-order-files (render → R2 → links + order note)
src/server/files/ signed 90-day download links (/api/files/<token> → 5-min R2 link)
src/lib/ commerce/ (types, mock, woocommerce), messaging/, email/, storage/, units.ts, dpi.ts
src/types/ shared contracts: design.ts, order.ts, cart.ts
src/components/site/ shop header (cart badge) + footer; src/app/(store)/ = shop routes with that shell
src/server/orders/ order-link.ts: private order-status links (/order/<id>?t=)
src/config/site.ts WhatsApp number, email, social links
docs/tasks/ per-module task briefs + status board
tests/fixtures/ sample design JSON + rendered PNG for module work without the editor
src/config/products/ mug.ts, tshirt.ts, hoodie.ts (print areas in mm, colours, sizes)
public/models/ *.glb (Draco) public/textures/ masks, normal maps
public/fonts/ self-hosted, subset fonts (Latin + Urdu where licensed)

@AGENTS.md
