# 22 — Saved designs

**Branch:** `feat/saved-designs` · **Owner:** Lead (+ assistant for the page) · **Needs:** 20

Signed-in customers tap **Save to my designs** in the editor: the design and photos upload to R2
(same as checkout), the list (id, product, name, thumbnail, updatedAt; max 50) is stored in the WC
customer's meta. `/account/designs` shows them; tap → editor on any device; rename, delete. **Delete removes the design and its photos from
storage** (privacy notice). Designs of orders placed while signed in are added to this list
automatically, so they survive the 30-day purge (task 24).

**Retention (task 24) — must handle before shipping:** the nightly job deletes any design that no
order references and whose files are older than 30 days. Saved designs that were never ordered
would be deleted. Add a check (e.g. the job skips design ids listed in any customer's saved
designs, or saved designs live under their own `accounts/<id>/designs/` prefix the job never
touches) and a test for it.

## Built (in review)

- **Editor:** **Save to my designs** under the editor tools. Signed out it links to sign-in and comes
  back (the draft stays on the phone). Saving again updates the same saved design (the draft remembers
  it: `draft.ts` `getDraftSaved` / `setDraftSaved`, also per cart design).
- **Upload in two steps** (`src/server/saved-designs/service.ts`, routes under `/api/account/designs`):
  `POST /api/account/designs` writes `pending.json` + presigned PUTs for photos not already stored and
  the thumbnail; `POST …/<id>/finish` checks every photo arrived, promotes it to `design.json`, drops
  photos the design no longer uses and updates customer meta `giftified_saved_designs` (no leading `_`: the customers REST API drops those). Sample or blurry photos
  are allowed here (work in progress); checkout still checks before printing.
- **Storage:** `accounts/<customerId>/designs/<id>/` (`lib/storage/keys.ts`). The retention job only lists
  `designs/`, so it never sees these; `tests/unit/saved-designs.test.ts` proves it 400 days on.
- **Orders placed while signed in** add their designs to the list (`source: "order"`, `addOrderDesigns`
  in `placeOrder`). Those stay under `designs/<id>/`, which retention keeps for signed-in orders. Checkout
  now also uploads the cart thumbnail (`designs/<id>/thumbnail.webp`) for the tile.
- **`/account/designs`:** thumbnails (1-hour signed links), open (`/design/<product>?saved=<id>`
  downloads the original photos and rebuilds previews at the size the design was made with, so crops
  stay right), rename, delete (design + photos, files first, then the list).
- **Decision (lead may overrule):** a design that is on an order still being made (not completed or
  cancelled) can't be deleted until the order is delivered or cancelled; its files are needed to print.
- `deleteAllSavedDesigns(customerId)` is ready for account deletion in task 21.
- Design products (task 26) keep `templateId`, so reopening one keeps its price.
