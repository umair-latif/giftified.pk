# Parallel work — how modules are split

Several AI assistants (and people) build Giftified.pk at the same time. This works
because every module talks to the others only through **contracts** (small
TypeScript interfaces that already exist in the repo) and every task owns its
own folders.

## Status board

| #   | Task                                                                   | Owner                                 | Branch                      | Status                    |
| --- | ---------------------------------------------------------------------- | ------------------------------------- | --------------------------- | ------------------------- |
| 00  | Editor core, image upload + DPI                                        | Lead                                  | `feat/image-upload`         | done                      |
| 01  | [WooCommerce adapter + order webhook](01-woocommerce-adapter.md)       | Claude (2nd session)                  | `feat/woo-adapter`          | done                      |
| 02  | [WhatsApp messaging + reply webhook](02-whatsapp-messaging.md)         | —                                     | `feat/whatsapp`             | **postponed** (post-MVP)  |
| 03  | [VendorProof.pdf builder](03-vendor-proof-pdf.md)                      | Claude (2nd session)                  | `feat/vendor-proof`         | done (live)               |
| 04  | [3D mug preview](04-mug-3d-preview.md)                                 | Founder (model) + _unassigned_        | `feat/mug-3d`               | waiting for the mug GLB   |
| 05  | [COD checkout form](05-checkout-form.md)                               | Claude (3rd session)                  | `feat/checkout-form`        | done (live)               |
| 06  | [Text styling sheet](06-text-styling-sheet.md)                         | Claude (cloud session)                | `feat/text-sheet`           | in review                 |
| 07  | [300 DPI print renderer](07-print-renderer.md)                         | Claude (cloud session)                | `feat/print-renderer`       | done                      |
| 08  | [Order pipeline, manual dispatch](08-order-pipeline.md)                | Lead                                  | `feat/order-pipeline`       | done (live)               |
| 09  | [Photo background removal](09-background-removal.md)                   | —                                     | `feat/bg-removal`           | **postponed**             |
| A0  | Contracts + site shell (header/cart badge, footer, `config/site.ts`)   | Lead                                  | `feat/storefront-contracts` | done                      |
| 10  | [Home page](10-home-page.md)                                           | Claude (cloud session)                | `feat/home`                 | done                      |
| 11  | [Catalog + product pages](11-catalog-product-pages.md)                 | Claude (2nd session)                  | `feat/catalog`              | done                      |
| 12  | [Cart](12-cart.md)                                                     | Lead                                  | `feat/cart`                 | done                      |
| 13  | [Checkout v2 (from the cart)](13-checkout-v2.md)                       | Claude (2nd session)                  | `feat/checkout-v2`          | in review                 |
| 13b | Checkout legal: content confirmation, small print, opt-in, IP          | Claude (subagent)                     | `feat/checkout-legal`       | in review                 |
| 14  | [Order status + guest tracking](14-order-status-tracking.md)           | Claude (cloud session)                | `feat/order-tracking`       | done                      |
| 15  | [Help and info pages](15-info-pages.md)                                | Claude (cloud session) + founder text | `feat/info-pages`           | done (founder TODOs open) |
| 16  | [Editor ↔ print font parity](16-font-parity.md)                        | Lead                                  | `fix/font-parity`           | in review                 |
| 17  | [Photo frames (Crop & shape)](17-photo-frames.md)                      | Lead                                  | `feat/photo-frames`         | in review                 |
| 18  | [Templates: placeholders, Save as template](18-templates-authoring.md) | Lead                                  | `feat/templates`            | after 17                  |
| 19  | [Template gallery + occasion pages](19-template-gallery.md)            | _unassigned_                          | `feat/template-gallery`     | after 11, 18              |
| 20  | [Accounts: sign-in/sign-up](20-auth.md)                                | Claude (cloud session)                | `feat/auth`                 | in review                 |
| 21  | [Account area](21-account-area.md)                                     | _unassigned_                          | `feat/account`              | after 20                  |
| 22  | [Saved designs](22-saved-designs.md)                                   | Lead + assistant                      | `feat/saved-designs`        | after 20                  |
| 23  | [Customer-shared templates](23-shared-templates.md)                    | _unassigned_                          | `feat/shared-templates`     | after 19, 22              |
| 24  | [Delete customer photos 30 days after delivery](24-data-retention.md)  | Lead                                  | `feat/retention`            | in review (PR #34)        |
| 25  | [Design-system cleanup: buttons, cards, tokens](25-design-consistency.md) | Claude (cloud)                     | `feat/design-tokens`        | in review                   |

**Right now, assistants can take:** 17 (after 12, merged), 25 (ready, independent). The
plan behind 10–23 is in
[`docs/plans/storefront-and-accounts.md`](../plans/storefront-and-accounts.md); brand rules in
[`docs/brand.md`](../brand.md). Briefs 19–23 are outlines and get detail when their dependencies land.

Update this table in your PR when you pick up or finish a task.

**MVP scope note:** COD confirmation and sending files to the vendor are done by the
founder by hand. The WhatsApp contract and mock stay in the code so it can be added
later without rework, but no MVP code may depend on it.

## Rules for every task

1. **Start from `main`**: `git switch main && git pull && git switch -c <branch>`.
2. **Stay in your folders.** Each brief lists what you may edit. If you need a
   change outside them (a contract, `package.json`, `CLAUDE.md`,
   `src/config/products/`), open a **separate small PR** for just that and tag the lead.
3. **Contracts are fixed.** `src/types/*`, `src/lib/*/types.ts`,
   `src/server/*/types.ts`, `src/features/preview-3d/types.ts`. Build against
   them; if one is wrong, propose the change in a PR — don't work around it.
4. **Use the mocks and fixtures** instead of waiting for other modules:
   `createMockCommerce()`, `createMockMessenger()`,
   `tests/fixtures/design-mug.json`, `tests/fixtures/design-mug-preview.png`.
5. **Tests with the code.** Every PR adds unit tests for its logic. CI must be green.
6. **Before pushing:** `pnpm check` (lint + typecheck + unit tests). UI changes
   also: `pnpm build && pnpm e2e`.
7. **Lockfile conflicts:** never hand-edit `pnpm-lock.yaml`. Rebase on `main`,
   run `pnpm install`, commit the result.
8. **Secrets** only in `.env.local` (git-ignored). Add new variable _names_ to `.env.example`.

## How to start an AI assistant on a task

Paste this as the first message (replace the file name):

> Read `CLAUDE.md`, `AGENTS.md` and `docs/tasks/README.md`, then do the task in
> `docs/tasks/01-woocommerce-adapter.md`. Stay inside the folders the brief
> allows. Work on branch `feat/woo-adapter`. Run `pnpm check` before you finish
> and summarise what you did, what you tested, and anything left open.

- **Claude Code / Claude cloud session:** reads `CLAUDE.md` automatically.
- **Cursor:** reads `AGENTS.md` and `.cursor/rules/` automatically.
- **Gemini CLI:** reads `GEMINI.md` (which imports `CLAUDE.md`).
- **GitHub Copilot:** reads `.github/copilot-instructions.md`.

### Several sessions on one computer

Use a separate worktree per task so they never share files:

```powershell
git worktree add ..\giftified-woo -b feat/woo-adapter
cd ..\giftified-woo; pnpm install; pnpm dev -p 3001
```

## Review

The lead reviews every PR. PRs should be small (ideally < 400 changed lines) and
explain _what_ changed, _how it was tested_, and any open question.
