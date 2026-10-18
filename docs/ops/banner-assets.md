# Banner artwork

Artwork for `PromoCard` (`src/components/ui/promo-card.tsx`): a tappable card
with the picture on the right and the words on the left. Files live in
`public/banners/`.

| File                                    | Where it shows                              | Card colour       |
| --------------------------------------- | ------------------------------------------- | ----------------- |
| `public/banners/occasion-birthday.webp` | Home, the featured occasion tile (birthday) | `brand` (teal)    |
| `public/banners/designs-mugs.webp`      | `/products`, under the product grid         | `action` (yellow) |

Both drawn by the founder in Canva, Oct 2026.

## What a banner file must be

- **1200 × 400 WebP, under 40 KB.** Flat line art compresses to this easily; a
  photograph will not.
- **The left half flat, in one of our colours**, and the card's `bg` set to
  that same colour. The card paints the colour and the picture sits on top at
  the right, so the two meet with no seam. Sample the file before adding it:
  the hex must match the token exactly (`#14b8a6` brand, `#ffe135` action),
  or the join shows as a band.
- **Nothing important in the left 55%.** The words go there.
- **Nothing important in the far left of the art itself.** On a phone the
  picture is 34% of the card and `object-right` keeps its right edge, so the
  left of the artwork is dropped.
- **No text baked in.** At 360 px a 1200 px-wide banner renders about 360 px
  across, where baked text lands around 8 px tall and is unreadable. The
  headline and the link are real HTML, which also means they can change
  without a new export. (The first "NEW Dual Accent Mug" draft had its text
  baked in; that is why it was redrawn.)

## Adding one

1. Save the WebP in `public/banners/`.
2. For an occasion, add it to `OCCASION_ART` in `src/features/home/occasions.tsx`,
   keyed by slug. Occasions with no entry fall back to the plain tile, so a new
   occasion can never ship a broken one.
3. Anywhere else, use `<PromoCard>` directly and give it `href`, `bg`, `art`
   and the words.
4. Check it at 360 px, not just on a desktop: that is where the picture and
   the words compete.

## Colour and contrast

The link line (`CardCta`) has a `tone`. On white cards it is the teal
`accent`; on a `brand` card teal-on-teal fails contrast, so it uses
`onColour` — ink, underlined, so it still reads as a link. Teal on `action`
yellow is fine and keeps `accent`.
