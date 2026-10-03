# Publishing a design (for designers)

Designers make ready-made designs that customers can buy as they are or change first.
Every design you publish becomes a shop product with its own page, title, description and price.

## Who is a designer

Anyone signed in with an email listed in `DESIGNER_EMAILS` (Vercel → Settings → Environment
Variables, comma-separated). To add a person: add their email, redeploy, and ask them to sign up
on the site with that email.

## Make and publish a design

1. Open the editor for the product (for example `/design/mug`) while signed in.
2. Design as usual: text, photos, frames, artwork.
3. For each photo the **customer must swap for their own** (a family photo slot, say): tap it, then
   **Customer's photo**, and pick one of the **Placeholder images**. Need a new one? Tap **+ Add image**
   in the same sheet. Only library photos can sit in a customer's photo.
4. Every other photo or image (frames, splashes, Eid artwork, lines) is **part of the design**. It
   prints exactly as it is, from the full-size file you added, so use a sharp, large file. Very
   blurry images are refused when you publish.
5. Tap **Next → Preview**, then **Publish as product**. Fill in the name, a short description, the price
   (the plain product's price is shown for reference) and the occasions. Publish.
6. Open **View the product page** to check it. Title, description and price can be changed later in
   WP admin (Products).

## What customers see

- **No customer's photo:** **Add to cart** (buys it exactly as you made it) and **Make it yours**
  (opens it in the editor, where they can change anything).
- **With a customer's photo:** only **Make it yours**. They must replace each placeholder image before they
  can order.

## Placeholder images

- Placeholders are shown to customers on the product page and in the editor, but they are **never
  printed**, so normal phone-size photos are fine.
- No real people, logos or copyrighted images: use AI-generated or licensed pictures only.
- Crop away white bars before adding them.
- Removing a placeholder image doesn't break published designs: each design keeps its own copy.

## Removing a design

Move its product to **Trash** in WP admin first. Then use **Delete design** under its card in the shop.
