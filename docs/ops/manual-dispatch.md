# Manual dispatch checklist (MVP)

For every new order in WP admin → WooCommerce → Orders (status **On hold**):

1. **Wait for the "Print files ready" note** (usually under a minute). If there's a
   "Couldn't make print files" note instead, see [order-pipeline.md](order-pipeline.md).
2. **Open the print PNG** and check it: the design is the right way up, text is spelled correctly,
   and nothing important is cut off at the edges.
3. **Confirm with the customer** by call or WhatsApp from your own phone:
   - name, full address, city, nearest landmark
   - product, colour, size, quantity
   - total amount to pay in cash on delivery

   Draft message (adjust freely):

   > Assalam o Alaikum {name}, Giftified.pk se. Aap ka order #{id} mila: {product}, {colour},
   > {qty} pcs. Total Rs {total} (cash on delivery). Delivery address: {address}, {city}.
   > Kya yeh sab theek hai? Confirm karne ke liye "Yes" likh dein.

   > Hello {name}, this is Giftified.pk. We received your order #{id}: {product}, {colour},
   > {qty} pcs. Total Rs {total}, cash on delivery, to {address}, {city}. Is everything
   > correct? Reply "Yes" to confirm.

4. **Confirmed?** Set the order to **Processing**. If they declined, or didn't reply within 48 h,
   set it to **Cancelled**. Never send an unconfirmed order to a vendor.
5. **Send to the vendor:** download the PNG and the Vendor PDF and send the **files**
   (not the links) on WhatsApp or email, together with: order number, product, colour, size,
   quantity and the customer's city. Share the customer's phone or address only if the vendor
   ships the parcel.
6. **Add an order note:** "Sent to {vendor} on {date}".
7. **When you ship:** add the courier details as order **custom fields** so the customer sees
   them on their order page (the "Shipped" step). In the order screen, open the **Custom Fields**
   box (if you can't see it: **Screen Options** at the top right → tick **Custom Fields**), then
   **Add Custom Field** → **Enter new**:

   | Name               | Value                                       | Needed?  |
   | ------------------ | ------------------------------------------- | -------- |
   | `_courier`         | Courier name, e.g. `TCS`, `Leopards`, `M&P` | Yes      |
   | `_tracking_number` | The consignment / tracking number           | Yes      |
   | `_tracking_url`    | Full `https://` link to the courier's page  | Optional |

   Type the names exactly as shown, including the leading underscore. The page shows "Shipped"
   only when **both** `_courier` and `_tracking_number` are filled in and the order is
   **Processing**; the "Track parcel" button appears only for an `https://` link. Click
   **Update** to save.

   > **Known issue (waiting for the lead):** WordPress treats field names that start with `_` as
   > hidden, and WooCommerce's Custom Fields box refuses to add them (`protected_meta` error).
   > Until the site reads names without the underscore, ask the lead to set these fields for you
   > (they can be set through the WooCommerce REST API).

8. After delivery and cash collected, set the order to **Completed**.
