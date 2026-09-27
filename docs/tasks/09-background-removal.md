# 09 — Photo background removal (postponed)

> **POSTPONED** by the founder until the order pipeline and storage exist (tasks 01, 07, 08).
> Recorded here so the design decision isn't lost.

## Goal

A "Remove background" action in the photo selection bar that cuts the subject out, looks
right in the editor, and is applied to the **full-resolution original** in the print file.

## Options considered (Sept 2026)

| Option                                                                          | Cost                                                                                                     | Quality              | Customer data                                                                | Ops                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Paid API** (e.g. remove.bg; first 50 calls/month free) called from our server | per image; keep low by using a small preview cut-out in the editor and full-res only for ordered designs | best, incl. hair     | almost none                                                                  | API key only                                                  |
| In-browser model (e.g. `@imgly/background-removal`)                             | free                                                                                                     | good; weaker on hair | one-time model download of several MB to tens of MB; slow on budget Androids | none — but **AGPL-3.0** unless a commercial licence is bought |
| Self-hosted open-source model (e.g. rembg)                                      | server cost                                                                                              | good                 | almost none                                                                  | run and maintain a separate server                            |

Lead's recommendation when this resumes: **paid API behind an adapter** (`src/lib/background-removal/`),
so the provider can be swapped. Check model/library licences before choosing any open-source option
(several popular models are non-commercial only).

## Design (whichever option)

- Store the result as a **mask asset** (`maskAssetId` on the image, a greyscale PNG), not a new photo.
  The editor applies the mask to the preview; the print renderer applies it (upscaled, smoothed) to
  the original. This keeps rule 5 (print from originals) and makes "Restore background" trivial.
- Crop, DPI and undo keep working unchanged: the mask covers the full, uncropped image.
- One undo step for apply/restore; show progress; handle failures with a friendly message.
