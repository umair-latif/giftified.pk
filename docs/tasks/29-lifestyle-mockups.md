# 29 — Lifestyle mockups (railing, folded shirt) and fabric realism

Parked by the founder: these two photos need more attention before they go in the T-shirt preview.
They add depth to the mockup engine and point toward lifestyle photos for the customer.

Photos (parked in `docs/tasks/assets/`, move back to `public/mockups/` when used):

- `tshirt-railing.webp`: man leaning on a railing. The drawn rectangle is painted out.
  Print corners measured by the founder: tl (320,185), tr (586,171), bl (341,538); the body is
  turned, so the print needs a warp that follows the torso, and the top-left corner touches hair
  (hair must stay in front of the print: needs a mask).
- `tshirt-folded.webp`: folded shirt, angled on teal. The founder's rectangle was wider than the
  shirt (about 995 px), so the print must be clipped to the shirt and sized for the visible front only.

- `tshirt-flatlay.webp`: folded on concrete with tulips. Parked by the founder: the print does not
  look right on a folded shirt (only the top of the front shows). Previous quad: tl (313,365), tr (727,365), bl (313,917).

Work:

1. Warp the print along folds and the body curve (shading used as a height map), tuned per photo.
2. A hair/arm mask for photos where something is in front of the shirt.
3. Clip the print to the garment silhouette.
4. Add both specs back to `MOCKUP_SPECS.tshirt` (`mockup/specs.ts`), extend `tests/e2e/mockup.spec.ts`.

Also see the shared fabric realism work (texture/shadow split, ink absorption) in `mockup/compose-garment.ts`.
