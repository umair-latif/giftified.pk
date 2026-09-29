# 22 — Saved designs

**Branch:** `feat/saved-designs` · **Owner:** Lead (+ assistant for the page) · **Needs:** 20

Signed-in customers tap **Save to my designs** in the editor: the design and photos upload to R2
(same as checkout), the list (id, product, name, thumbnail, updatedAt; max 50) is stored in the WC
customer's meta. `/account/designs` shows them; tap → editor on any device; rename, delete. **Delete removes the design and its photos from
storage** (privacy notice). Designs of orders placed while signed in are added to this list
automatically, so they survive the 30-day purge (task 24).
