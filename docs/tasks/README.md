# Parallel work — how modules are split

Several people and AI assistants build Giftified.pk at the same time. This works
because every module talks to the others only through **contracts** (small
TypeScript interfaces that already exist in the repo) and every task owns its
own folders.

## Status board

| #   | Task                                                             | Owner                        | Branch                | Status                   |
| --- | ---------------------------------------------------------------- | ---------------------------- | --------------------- | ------------------------ |
| 00  | Editor core, image upload + DPI                                  | Lead (Claude, cloud session) | `feat/image-upload`   | in review                |
| 01  | [WooCommerce adapter + order webhook](01-woocommerce-adapter.md) | _unassigned_                 | `feat/woo-adapter`    | ready                    |
| 02  | [WhatsApp messaging + reply webhook](02-whatsapp-messaging.md)   | —                            | `feat/whatsapp`       | **postponed** (post-MVP) |
| 03  | [VendorProof.pdf builder](03-vendor-proof-pdf.md)                | _unassigned_                 | `feat/vendor-proof`   | ready                    |
| 04  | [3D mug preview](04-mug-3d-preview.md)                           | _unassigned_                 | `feat/mug-3d`         | ready (needs a mug GLB)  |
| 05  | [COD checkout form](05-checkout-form.md)                         | Intern + Cursor              | `feat/checkout-form`  | ready                    |
| 06  | [Text styling sheet](06-text-styling-sheet.md)                   | Intern + Cursor              | `feat/text-sheet`     | ready                    |
| 07  | [300 DPI print renderer](07-print-renderer.md)                   | Lead (Claude)                | `feat/print-renderer` | after 00                 |
| 08  | [Order pipeline, manual dispatch](08-order-pipeline.md)          | Lead (Claude)                | `feat/order-pipeline` | after 01, 03, 07         |

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
