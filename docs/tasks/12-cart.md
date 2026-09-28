# 12 — Cart

**Branch:** `feat/cart` · **Owner:** Lead (touches the editor, drafts and photo storage) · **Needs:** A0

## Goal

Several designs in one order. The Preview step ends with **Add to cart**; the cart page lists items,
lets the customer edit a design, add another size, change quantity or remove.

## Scope

- `src/features/cart/`: store (localStorage items, `CartItem` from `src/types/cart.ts`), design
  snapshots per item in IndexedDB, thumbnails (small WebP made from the preview canvas).
- Editor: `/design/[product]?item=<id>` edits a cart item (button **Save changes**); Preview's
  button becomes **Add to cart** (snapshot the draft into a new item, then start a fresh draft);
  step bar Design → Preview → Cart.
- Photo storage: `pruneAssets` must keep photos used by cart items, not just drafts.
- `uploadCartDesign(designKey)` for checkout (wraps `/api/designs`, one upload per distinct design).
- `/cart` page: lines (thumbnail, product, colour/size, quantity 1–10, price from a server quote,
  **Edit design**, **Add another size**, **Remove**), subtotal, delivery estimate, **Checkout** →
  `/checkout`; empty state. Header badge updates live.
- `/design/[product]/order` redirects to `/cart`.

## Acceptance criteria

Unit tests for the store and snapshots; e2e: two designs → cart → edit one → quantities → checkout
button; reload keeps the cart; photos of cart items survive pruning.
