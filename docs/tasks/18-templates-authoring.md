# 18 — Templates: placeholders and "Save as template"

**Branch:** `feat/templates` · **Owner:** Lead · **Needs:** 17

- Placeholder layers: photo frames with a sample photo marked `placeholder: true` ("Tap to add
  photo"), text marked editable/locked.
- Founder-only **Save as template** in the editor (protected by an admin secret for now): name,
  product, occasion tags, published flag → `templates/<id>/design.json` + `thumbnail.webp` in R2 and
  an index `templates/index.json`.
- Placeholder photo library: founder-approved AI images in `templates/library/…`, picked by frame shape.
- `/design/<product>?template=<id>` loads a template into a fresh draft.
- Server API for task 19: `listTemplates({ productId?, occasion? })`, `getTemplate(id)` in
  `src/server/templates/` (+ types contract `src/server/templates/types.ts`).

## Slices

1. **Data layer + placeholders (done):** `src/server/templates/` (`types.ts` contract, `listTemplates`,
   `getTemplate`, `saveTemplate`), storage keys `templates/…`, `GET /api/templates/<id>`
   (design + presigned sample-photo URLs, published only). A template's photos are all
   `placeholder: true`; Replace clears the flag; checkout and `/api/designs` refuse a design that still
   has one ("sample photo — tap Replace").
2. **Editor (next):** `?template=<id>` → import the sample photos into the local asset store and start a
   fresh draft; "Tap to add photo" hint on placeholders; founder-only **Save as template** (admin
   secret) → thumbnail + `POST /api/admin/templates`.
3. **Placeholder library:** founder-approved sample images in `templates/library/…`, picked by frame shape.
