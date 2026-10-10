# 21 — Account area

**Branch:** `feat/account` · **Suggested owner:** any AI assistant (lead reviews) · **Needs:** 20

`/account` (overview), `/account/orders` + `/account/orders/[id]` (same timeline component as task
14, **Order again** copies the design into the cart), `/account/addresses` (default delivery address,
fills checkout), `/account/profile` (name, phone, email, change password, **marketing preference** — the same opt-in
as checkout, stored on the WooCommerce customer and used as the default for new orders — sign out,
delete account — which must also delete the customer's saved designs and their photos from storage;
order records stay in WooCommerce for the 3-year accounting period).
Data through the commerce adapter methods added in task 20. Detailed brief when 20 lands.

## Built (in review)

- **`/account`**: name and email, the latest order with its status, links to the sections, sign out.
- **`/account/orders`** (20 per page, newest first) and **`/account/orders/[id]`**: the same
  `OrderTimeline` and a new shared `OrderSummary` (also used by `/order/[id]`). Another customer's order
  is a 404 (`getCustomerOrder` checks `customer_id`).
- **Order again** (`features/account/order-again.ts`): downloads each design of the order
  (`GET /api/account/orders/<id>/designs/<designId>`, signed photo links) into this phone's asset store
  and adds the same lines (colour, size, quantity, design product) to the cart. Checkout then uploads and
  checks them as usual. The cart capacity is checked before anything is downloaded.
- **`/account/addresses`**: phone + default address (same validation as checkout), fills checkout.
- **`/account/profile`**: first/last name, email (read only: changing it safely needs a verification
  link, and Google sign-in matches on email; customers ask via Contact), **marketing preference**
  (customer meta `designbanana_marketing_optin`, no leading `_`: the customers REST API drops those; checkout starts ticked when it is on, and a signed-in checkout
  writes its choice back), **Email me a password link** (the reset flow, works for Google accounts
  too), sign out, **Delete my account**.
- **Delete account** (`server/account/service.ts`): type DELETE to confirm. Refused while an order is
  on-hold or processing. Otherwise deletes every saved design and photo (`accounts/<id>/`), the designs
  of all the account's orders, then the WooCommerce customer. Order records stay in WooCommerce;
  print files follow the normal 30-day retention. Ends on `/account/deleted`.
