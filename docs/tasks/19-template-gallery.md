# 19 — Template gallery and occasion pages

**Branch:** `feat/template-gallery` · **Suggested owner:** any AI assistant (lead reviews) ·
**Needs:** 11 and 18 merged

- Fill the `#designs` section of the category page (task 11), **after** the "Design your own"
  card: grid of template thumbnails with occasion chips; tap → `/design/<product>?template=<id>`.
- `/occasions/[slug]` (Eid, Birthday, Shaadi, Anniversary, Mothers-Day, 14-August, Team): templates
  across products; home page occasion tiles link here.
- Data only through `listTemplates()` from task 18; cached like the catalog; thumbnails via
  `next/image`. Detailed brief will be filled in when 18 lands.

## Built

- `#designs` on `/products/<slug>`: grid of that product's published templates (thumbnail, name,
  occasion chips) → `/design/<product>?template=<id>`; "coming soon" text until there is one.
- `/occasions/<slug>` for the seven occasions (home tiles now link here); templates across products;
  friendly empty state. Both in the sitemap.
- Data only through `loadTemplates()` (`src/features/templates/load-templates.ts`): cached under the
  `templates` tag (5 min); saving a template calls `revalidateTag("templates", { expire: 0 })`, so it
  shows on the next visit. Thumbnails come from `GET /api/templates/<id>/thumbnail` (published only).
- Gotcha: don't set `dynamicParams = false` on an ISR page that must refresh on demand — the background
  regeneration fails silently (`NoFallbackError`) and the page stays stale.
- Not done: filtering by occasion chips on the product page (the chips on each card link nowhere yet);
  pagination (fine for dozens of templates).
