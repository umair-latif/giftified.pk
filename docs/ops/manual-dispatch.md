# Manual dispatch checklist (MVP)

**Vendors (once, and whenever a vendor changes):** in WP admin → Products, open **Custom Mug**,
**Custom T-Shirt** and **Custom Hoodie** → **Custom Fields** box (not visible? **Screen Options** →
tick **Custom Fields**) → **Add Custom Field** → **Enter new**, and add:

| Name              | Value                                    |
| ----------------- | ---------------------------------------- |
| `vendor_name`     | e.g. `Gujrat Mugs`                       |
| `vendor_email`    | the vendor's email                       |
| `vendor_whatsapp` | e.g. `0300 1234567` or `+92 300 1234567` |

Click **Update**. Products with the same vendor (same email) go in one message. Designs made from
a product use its vendor. The product must be **published**. Changes show within an hour (at once
if the catalog webhook is set up).

The "Send to vendor" email goes to the recipient of WooCommerce's **New order** email
(WooCommerce → Settings → Emails → New order). To send it elsewhere, set `VENDOR_HANDOFF_TO` in
Vercel.

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

   > Assalam o Alaikum {name}, DesignBanana se. Aap ka order #{id} mila: {product}, {colour},
   > {qty} pcs. Total Rs {total} (cash on delivery). Delivery address: {address}, {city}.
   > Kya yeh sab theek hai? Confirm karne ke liye "Yes" likh dein.

   > Hello {name}, this is DesignBanana. We received your order #{id}: {product}, {colour},
   > {qty} pcs. Total Rs {total}, cash on delivery, to {address}, {city}. Is everything
   > correct? Reply "Yes" to confirm.

4. **Confirmed?** Set the order to **Processing**. If they declined, or didn't reply within 48 h,
   set it to **Cancelled**. Never send an unconfirmed order to a vendor.
5. **Send to the vendor:** a few minutes after you set Processing, you get an email
   **"Send to vendor: order #…"** with one block per vendor (as set on the products, see above).
   - **Email to …** opens a page with what will be sent; press **Send by email**. The vendor gets
     the order number, product, colour, size, quantity and print size, with the proof PDF and the
     print PNG attached (very large PNGs as a download link). No customer name, phone or address:
     we ship the parcels. (The proof PDF still shows the customer's city.)
   - **WhatsApp to …** opens WhatsApp with the same message and the file links (WhatsApp links
     can't attach files). Without the vendor's number set, WhatsApp asks you which contact.
   - No email came? Check the New order recipient (or `VENDOR_HANDOFF_TO`) and the order notes;
     you can still send the files by hand as before (download the PNG and the PDF from the order
     note).
   - There's no test marking: what you send is what the vendor prints. Test vendors with real
     test orders.
6. **Order notes** record it: `"Send to vendor" email sent to …` and, after **Send by email**,
   `Sent to {vendor} ({email}) by email: line(s) …`. If you sent by WhatsApp, add a note
   yourself: "Sent to {vendor} on WhatsApp on {date}".
7. **When you ship:** add the courier details as order **custom fields** so the customer sees
   them on their order page (the "Shipped" step). In the order screen, open the **Custom Fields**
   box (if you can't see it: **Screen Options** at the top right → tick **Custom Fields**), then
   **Add Custom Field** → **Enter new**:

   | Name              | Value                                       | Needed?  |
   | ----------------- | ------------------------------------------- | -------- |
   | `courier`         | Courier name, e.g. `TCS`, `Leopards`, `M&P` | Yes      |
   | `tracking_number` | The consignment / tracking number           | Yes      |
   | `tracking_url`    | Full `https://` link to the courier's page  | Optional |

   Type the names exactly as shown (no leading underscore — WordPress refuses those in this box).
   The page shows "Shipped" only when **both** `courier` and `tracking_number` are filled in and
   the order is **Processing**; the "Track parcel" button appears only for an `https://` link.
   Click **Update** to save. (The site also reads `_courier` etc. if they were set through the
   REST API.)

8. After delivery and cash collected, set the order to **Completed**.

## Refused designs

If you refuse a design because it breaks the law (see `/printing-guidelines`, e.g. PECA), keep the
evidence: normally the photos and print files are deleted 30 days after the order is completed or
cancelled ([order-pipeline.md](order-pipeline.md#data-retention-30-day-purge)).

1. Open the order in WP admin → **Custom Fields** box (not visible? **Screen Options** → tick
   **Custom Fields**).
2. **Add Custom Field** → **Enter new**: Name `retain_for_review`, Value `yes`. Click **Update**.
3. Add an order note saying why (e.g. "Refused: … — kept for review").

Do this **within 30 days** of cancelling: files that are already deleted can't be restored. The
nightly job then never deletes this order's print files, design or photos. To release them later,
delete the custom field; the next night's run cleans them up.
