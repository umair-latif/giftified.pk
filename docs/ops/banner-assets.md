# Banner artwork

Two card shapes, both with artwork in `public/banners/`:

- **`BannerCard`** (`src/components/ui/banner-card.tsx`), the shape for new
  art: a 2:1 picture across the top on phones with the words underneath, and
  half picture, half words from `md` up.
- **`PromoCard`** (`src/components/ui/promo-card.tsx`), the older strip:
  picture on the right, words on the left on a flat colour. Kept for the art
  already drawn that way until it is redrawn at 2:1.

| File                                    | Card         | Where it shows                              | Card colour       |
| --------------------------------------- | ------------ | ------------------------------------------- | ----------------- |
| `public/banners/occasion-shaadi.webp`   | `BannerCard` | Home, the featured occasion tile (shaadi)   | `page` (mint)     |
| `public/banners/occasion-birthday.webp` | `PromoCard`  | Home, the featured occasion tile (birthday) | `brand` (teal)    |
| `public/banners/designs-mugs.webp`      | `PromoCard`  | `/products`, under the product grid         | `action` (yellow) |

All drawn by the founder in Canva, Oct–Nov 2026.

## BannerCard art (new banners)

- **1600 × 800 WebP (2:1), under about 60 KB.** Flat line art; a photograph
  will not get this small.
- **One flat ground colour across the whole picture**, and the card's `bg` set
  to the same colour: `page` `#f3fbf9`, `brand` `#14b8a6` or `action`
  `#ffe135`. On a desktop the words sit on that colour next to the picture,
  so it reads as one banner, not a picture with a band added. Lossy WebP may
  shift the ground by one step; that is invisible.
- **The picture is never cropped** (it keeps 2:1 on every screen), but keep
  objects a little away from the edges so they do not touch the card outline.
- **On a phone the whole picture is about 330 px wide**: lettering that is part
  of the artwork (the sample designs) is fine if it is large; small text is
  not. The headline and link are real HTML; never bake them in.
- **Desktop shows it at about 500 × 250**, next to the words.

## PromoCard art (older strip)

- **1200 × 400 WebP, under 40 KB.** Flat line art compresses to this easily; a
  photograph will not.
- **The left half flat, in one of our colours**, and the card's `bg` set to
  that same colour. The card paints the colour and the picture sits on top at
  the right, so the two meet with no seam. Sample the file before adding it:
  the hex must match the token exactly (`#14b8a6` brand, `#ffe135` action),
  or the join shows as a band.
- **Nothing important in the left 55%.** The words go there.
- **Nothing important in the far left of the art itself.** `object-right`
  keeps the picture's right edge, so a narrow card drops the left of the
  artwork.
- **A quiet band across the middle of the canvas**, where the picture can end.
  The card fades the left 30% of the picture into the flat colour, which hides
  the join wherever it lands — but a fade through a busy area still reads as
  haze. The birthday art gets this right by accident: separate objects on flat
  ground, so there is empty colour to fade through. The first mug banner did
  not, and its hard edge cut through a mug, which is what the fade was added
  to fix.
- **No text baked in.** At 360 px a 1200 px-wide banner renders about 360 px
  across, where baked text lands around 8 px tall and is unreadable. The
  headline and the link are real HTML, which also means they can change
  without a new export. (The first "NEW Dual Accent Mug" draft had its text
  baked in; that is why it was redrawn.)

## Adding one

1. Save the WebP in `public/banners/`.
2. For an occasion, add it to `OCCASION_ART` in `src/features/home/occasions.tsx`,
   keyed by slug, with `layout: "banner"` and its `bg` (or `layout: "promo"` for
   an old strip). Occasions with no entry fall back to the plain tile, so a new
   occasion can never ship a broken one.
3. Anywhere else, use `<BannerCard>` (or `<PromoCard>`) directly and give it
   `href`, `bg`, `art` and the words.
4. When an occasion is featured is set in `src/config/occasion-dates.ts`:
   dated occasions (Eid, Mother's Day, 14 August) and seasons (wedding season,
   November until Ramadan). A season in progress wins.
5. Check it at 360 px, not just on a desktop: that is where the picture and
   the words compete.

## Colour and contrast

The link line (`CardCta`) has a `tone`. On white cards it is the teal
`accent`; on a `brand` card teal-on-teal fails contrast, so it uses
`onColour` — ink, underlined, so it still reads as a link. Teal on `action`
yellow is fine and keeps `accent`.
