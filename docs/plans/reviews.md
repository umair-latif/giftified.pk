# Reviews (plan)

Status: decided in brainstorm (18 Oct 2026), not built. Task brief and status-board row come when this is approved.

## Decisions

- **Store:** WooCommerce native product reviews (`/wp-json/wc/v3/products/reviews`), server-side only through
  `src/lib/commerce/woocommerce.ts`. Stars + text in WC; the founder moderates in WP admin.
- **Photos:** optional, one per review in v1. Uploaded phone → R2 by presigned PUT (same path as design photos),
  never through our functions.
- **Who can review:** verified buyers only, no account. The form lives on the private order page
  (`/order/<id>?t=`) and opens only when the order is `completed` (delivered, cash collected).
- **Moderation:** every review is created with status `hold`; nothing shows until the founder approves it.
- **Request email:** the WC `order.updated` webhook (status `completed`) enqueues a job that sends
  "How was your order? Rate it" through `lib/email`, with the order link. Keyed by order ID (rule 8), so
  re-delivery never double-sends. The founder can also paste the same link in his manual delivery message.
  No WC email templates or custom PHP.
- **Display:** reviews list + star average on the product page (Server Component, ISR), plus schema.org
  `AggregateRating`. **Hidden until a product has real approved reviews** (no fake or empty states).
- **Per product, not per design:** designs are unique; the review is about the product, print quality, delivery.

## To verify on the staging store before building

1. Whether `POST /products/reviews` accepts custom meta. If not, keep the photo URL under
   `orders/<id>/reviews/…` in R2, map it to the review ourselves, and add it to the review text or an order
   note so the founder sees it when moderating.
2. Whether the API can set `verified`. If not, "verified" is enforced by us: the form is reachable only via the
   signed link of a completed order, once per order line.
3. Reviews attach to the parent product, not the variant; that is fine for display.

## Build outline (small PRs)

1. Commerce adapter: `listReviews`, `createReview` (+ mock). Shared contract change → separate PR approved by the lead.
2. Review form on the order page + photo upload + route handler (Zod, one review per order line).
3. Completed-order job + email.
4. Product-page reviews section + `AggregateRating`.

## Later

WhatsApp review request (behind `lib/messaging`), multiple photos, founder replies.
