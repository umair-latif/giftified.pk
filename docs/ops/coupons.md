# Coupons (founder guide)

Create coupons in **WordPress admin → Marketing → Coupons** (WooCommerce). Customers type the code in the
cart or at checkout; our server checks it against WooCommerce, so nothing else to set up.

## What works

- **Discount type:** percentage, fixed cart discount, fixed product discount.
- **Limits:** expiry date, usage limit (total), minimum spend, maximum spend, **free shipping**.
- **Which products:** _Products_ / _Exclude products_ and _Product categories_ / _Exclude categories_
  (Usage restriction tab). Every ready-made design is its own WooCommerce product, filed under
  **"Ready-made <product>"** plus one category per occasion (e.g. **Eid**, **Birthday**), so you can make:
  - "10 % off all ready-made mugs" → category _Ready-made Custom Mug_;
  - "Eid designs 15 % off" → category _Eid_;
  - "Rs 200 off this one design" → that product under _Products_.
    Plain (customer-designed) mugs are only affected by coupons that have no product/category restriction or
    that list the plain mug product.

## What does not (yet)

- **Email restrictions:** a coupon limited to certain emails is refused online ("can't be used online yet").
- **Usage limit per customer** and **exclude sale items** are ignored.
- **Individual use only** is not needed: one code per order.

## Good to know

- Codes are case-insensitive. A refused code shows why (unknown, expired, used up, minimum spend, doesn't apply
  to the cart).
- The discount is checked again when the order is placed. WooCommerce calculates the order's discount from its
  own coupon; if it ever differs from what the cart showed (exotic rounding), the order total in WP admin is
  the truth.
- "Usage count" goes up when the order is created (status on-hold), so a usage limit counts unconfirmed orders
  too; cancel an order to give the use back.
