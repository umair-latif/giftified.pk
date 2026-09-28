# 17 — Photo frames ("Crop & shape")

**Branch:** `feat/photo-frames` · **Owner:** Lead

The crop sheet becomes **Crop & shape**: chips Original · Circle · Rounded · Heart · Arch · Star ·
Polaroid. The photo fills the shape and moves/zooms inside it; selection bar adds **Replace photo**.
Polaroid = white frame with thicker bottom, optional caption, slight tilt, drop shadow. Shapes are
serialised in `design.json` (clip paths) and render identically in the 300 DPI renderer; the DPI check
uses the visible part only. Soft shadows allowed on mugs; on apparel use a solid offset shadow or none
(confirm with vendors). Unit tests for shape geometry; renderer test for each shape; e2e for the sheet.
