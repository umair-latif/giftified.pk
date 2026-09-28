# 19 — Template gallery and occasion pages

**Branch:** `feat/template-gallery` · **Suggested owner:** any AI assistant (lead reviews) ·
**Needs:** 11 and 18 merged

- Product page section **Designs for this <product>**: grid of template thumbnails with occasion
  chips; tap → `/design/<product>?template=<id>`.
- `/occasions/[slug]` (Eid, Birthday, Shaadi, Anniversary, Mothers-Day, 14-August, Team): templates
  across products; home page occasion tiles link here.
- Data only through `listTemplates()` from task 18; cached like the catalog; thumbnails via
  `next/image`. Detailed brief will be filled in when 18 lands.
