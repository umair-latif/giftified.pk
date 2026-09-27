# CLAUDE.md — Giftified.pk

Durable rules for AI-assisted development. Read this before every task.

## What we're building
Mobile-first Print-on-Demand store for Pakistan. Customers design mugs, t-shirts and
hoodies on their phone, preview in 2D/3D, and order with Cash on Delivery (COD).
Orders are dispatched to Gujrat/Sialkot print partners by email + WhatsApp with a
300 DPI PNG and a `VendorProof.pdf`. No vendor portal. No inventory.

Data flow:
Mobile PWA (Fabric.js editor + Three.js preview)
  -> Next.js route handler creates the order in headless WooCommerce (REST v3, status on-hold)
  -> WC webhook -> queue -> background worker (300 DPI render + PDF proof)
  -> WhatsApp COD verification -> on confirm: email + WhatsApp dispatch to vendor

## Tech stack
- Next.js 16 App Router (TypeScript) + React 19, Server Components by default. Next 16 differs from older docs: read AGENTS.md first.
- Tailwind CSS (mobile-first; design at 360px width first)
- Fabric.js v7 (ESM/TS) for 2D editing — client-only, dynamically imported
- Three.js via @react-three/fiber + drei for 3D preview — lazy-loaded, never in the initial bundle
- GLB assets with Draco (meshes) + KTX2/WebP (textures)
- Zod for all external input (API routes, webhooks, form data, Fabric JSON)
- Worker: queued job runner (Inngest / QStash / Trigger.dev — decide once, then use only that)
- Server-side rendering of print files: node-canvas / @napi-rs/canvas + Fabric in Node
- PDFs: pdf-lib or PDFKit (server only)
- Object storage for uploads and print files (S3-compatible, e.g. Cloudflare R2)
- WhatsApp: prefer official Meta WhatsApp Cloud API; any provider sits behind `lib/messaging`

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
  `on-hold` = awaiting WhatsApp COD verification -> `processing` = verified, dispatched to vendor
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
1. **No vendor portal.** Vendor dispatch is email + WhatsApp with PNG + PDF only (MVP).
2. **Zero inventory.** Never model stock levels; availability comes from product config.
3. **Performance budget:** LCP < 2.5s on mid-range Android over 4G. Initial JS for the
   product page < 200 KB gzipped. Fabric and Three load only when the editor/preview opens.
   Each 3D model < 1.5 MB (Draco); textures ≤ 2048px, compressed.
4. **DPI check ≥ 200 effective DPI.** Effective DPI = image pixel width ÷ printed width in
   inches *at its current scale on the print area*. Ignore EXIF/metadata DPI. Recompute on
   every scale change; warn below 200, block checkout below 150 (configurable).
5. **Print files are rendered server-side** from saved Fabric JSON + original uploaded
   assets at 300 DPI. Never generate the 300 DPI file on the phone (memory limits) and
   never render print files from the compressed preview images.
6. **Client-side compression is for preview/upload bandwidth only.** Keep the original
   upload for print; compress a separate preview copy.
7. **Orders go to production only after COD verification** via WhatsApp (address +
   product/size confirmed). Unverified orders never trigger vendor dispatch.
8. **Idempotency:** every webhook and job is keyed by order ID; re-delivery must not
   double-dispatch to a vendor.
9. Print PNGs: transparent background, sRGB, exact print-area dimensions from config.
10. `VendorProof.pdf` always includes: order ID, product, colour, size, print dimensions
    (mm), placement offsets (mm from reference point), mockup preview, customer city.
    No customer phone/address in vendor docs unless the vendor needs it for shipping.

## Workflow
- Lead dev owns: engine/, 3d/, print/, pdf/, worker jobs, and reviews all intern PRs.
- Intern owns: UI components, drawers/sheets, form handling, messaging adapter, DPI UI.
- Small PRs. Run `pnpm lint && pnpm typecheck && pnpm test` before proposing a commit.
- When unsure about print dimensions or vendor requirements, ask — don't guess.

## Commands
- `pnpm dev` — local dev server (http://localhost:3000, editor at /design/mug)
- `pnpm check` — lint + typecheck + unit tests (run before every commit)
- `pnpm build && pnpm e2e` — production build + Playwright mobile tests (360px, touch).
  First time: `pnpm exec playwright install chromium` (or set `PW_CHROMIUM_PATH`).

## Editor engine notes
- Fabric scene units are **mm**; the canvas is exactly the print area, and the viewport
  transform only scales mm → screen px. Server print render = same JSON at zoom 300/25.4.
- Fabric owns the DOM inside the editor host div (canvas created imperatively in
  `useFabricCanvas`); never render React children there.
- Guides (safe zone, edge labels) are CSS overlays so they can never leak into exports.
- Fabric v7 has no built-in pinch/rotate; `engine/gestures.ts` implements it with raw touch
  events. Keep controls finger-sized (`engine/controls.ts`).

## Directory map
src/app/            routes: (store) pages, design/[product] editor, api/checkout, api/webhooks, api/jobs
src/features/editor/ engine/ (Fabric modules), hooks/, components/ (toolbars, sheets, layers)
src/features/preview-3d/ scenes/ (mug, tshirt, hoodie), materials/, hooks/
src/features/checkout/  COD form, address validation
src/server/print/   300 DPI renderer (Fabric JSON -> PNG)
src/server/pdf/     VendorProof.pdf builder
src/server/jobs/    queued jobs: render-print-file, build-proof, dispatch-vendor
src/lib/            commerce/woocommerce.ts, messaging/, email/, storage/, units.ts, dpi.ts
src/config/products/ mug.ts, tshirt.ts, hoodie.ts (print areas in mm, colours, sizes)
public/models/      *.glb (Draco)   public/textures/  masks, normal maps
public/fonts/       self-hosted, subset fonts (Latin + Urdu where licensed)

@AGENTS.md
