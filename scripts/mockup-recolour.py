#!/usr/bin/env python3
"""
Stand-in black garment photo made from a white one (alpha only).

  python3 scripts/mockup-recolour.py <white-photo> <out-photo> [--bg white|colour]

--bg white : the garment is on a plain white background (flat shirt photos).
--bg colour: the garment is the low-saturation part of a coloured background.
A photo with transparency (cut-out) needs no --bg: its alpha is the garment.

The garment's brightness is mapped onto black cotton (folds read as grey
highlights), the background is left alone. This is NOT a real black shirt: when
the vendor's black photos arrive, replace the output files by name.
Needs numpy, opencv-python, scipy.
"""
import argparse
import cv2, numpy as np
from scipy.ndimage import binary_fill_holes


def garment_mask(img, bg):
    L = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    if bg == "white":
        m = (L < 251).astype(np.uint8)
        _, lab = cv2.connectedComponents(1 - m)
        outside = np.isin(lab, np.unique(lab[[0, 0, -1, -1], [0, -1, 0, -1]]))
        m = (~outside).astype(np.uint8)
    else:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        m = (hsv[..., 1] < 70).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = binary_fill_holes(m).astype(np.uint8)
    return cv2.dilate(m, np.ones((3, 3), np.uint8))  # cover the light fringe


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("photo"); ap.add_argument("out")
    ap.add_argument("--bg", choices=["white", "colour"])
    a = ap.parse_args()
    raw = cv2.imread(a.photo, cv2.IMREAD_UNCHANGED)
    alpha = raw[..., 3] if raw.ndim == 3 and raw.shape[2] == 4 else None
    img = raw[..., :3].copy()
    if alpha is not None:
        m = (alpha > 128).astype(np.uint8)
        m = cv2.dilate(m, np.ones((3, 3), np.uint8)) & (alpha > 0)
    elif a.bg:
        m = garment_mask(img, a.bg)
    else:
        ap.error("--bg is required for a photo without transparency")
    L = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    white = np.percentile(L[m > 0], 97)
    n = np.clip(L / white, 0, 1.05)
    v = 7 + 60 * n**4
    black = np.dstack([v * 1.02, v, v * 0.98])  # BGR, faint cool tint
    al = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8)[..., None]
    out = np.clip(img.astype(np.float32) * (1 - al) + black * al, 0, 255).astype(np.uint8)
    if alpha is not None:
        out = np.dstack([out, alpha])
    cv2.imwrite(a.out, out, [cv2.IMWRITE_WEBP_QUALITY, 88])


if __name__ == "__main__":
    main()
