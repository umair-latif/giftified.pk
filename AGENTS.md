<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Giftified.pk project rules

All project rules, architecture and conventions are in **`CLAUDE.md`** — read it
before writing code. Parallel-work rules and per-module task briefs are in
**`docs/tasks/`**. Stay inside the folders your task brief allows, and never
change the shared contracts (`src/types/*`, `src/lib/*/types.ts`,
`src/server/*/types.ts`, `src/features/preview-3d/types.ts`) without the lead.
