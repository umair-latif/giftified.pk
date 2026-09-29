# 21 — Account area

**Branch:** `feat/account` · **Suggested owner:** any AI assistant (lead reviews) · **Needs:** 20

`/account` (overview), `/account/orders` + `/account/orders/[id]` (same timeline component as task
14, **Order again** copies the design into the cart), `/account/addresses` (default delivery address,
fills checkout), `/account/profile` (name, phone, email, change password, **marketing preference** — the same opt-in
as checkout, stored on the WooCommerce customer and used as the default for new orders — sign out,
delete account — which must also delete the customer's saved designs and their photos from storage;
order records stay in WooCommerce for the 3-year accounting period).
Data through the commerce adapter methods added in task 20. Detailed brief when 20 lands.
