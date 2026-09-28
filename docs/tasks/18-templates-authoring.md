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
