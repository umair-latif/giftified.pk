#!/usr/bin/env python3
"""
Draft a displacement map for a garment mockup photo (docs/ops/mockup-layer-pack.md).

  python3 scripts/mockup-draft.py <photo> <out-prefix> [--box x0,y0,x1,y1]
         [--body 3.0] [--folds 2.5]

Writes <out-prefix>-displace.png, <out-prefix>-shadow.png, <out-prefix>-highlight.png.

How: (1) MiDaS v2.1 small (ONNX, ~67 MB, downloaded once to .cache/) estimates the
broad shape of the garment (chest, sleeves). (2) Fold-sized detail comes from the
photo's own brightness: a band-pass, relative to local brightness. (3) The slope of
both is turned into an x/y shift in pixels (--body / --folds = the largest typical
shift of each) and written as a PNG: red = x, green = y, 128 = none, 16 levels/px.
(4) Shadow = the photo's large-scale brightness relative to the garment's white
(255 = lit). (5) Highlight = the bright side of the fold detail (0-255).
A retoucher can replace any PNG; the engine only reads the files.
Needs: numpy, opencv-python, onnxruntime.
"""
import argparse, os, sys, urllib.request
import numpy as np, cv2, onnxruntime as ort

MODEL_URL = "https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx"
CACHE = os.path.join(os.path.dirname(__file__), "..", ".cache", "midas-small.onnx")
SCALE = 16  # levels per px, must match DISP_SCALE in compose-garment.ts


def model():
    if not os.path.exists(CACHE):
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        print("downloading MiDaS small ...", file=sys.stderr)
        urllib.request.urlretrieve(MODEL_URL, CACHE)
    return ort.InferenceSession(CACHE)


def depth(img, box):
    x0, y0, x1, y1 = box
    c = cv2.cvtColor(cv2.resize(img[y0:y1, x0:x1], (256, 256), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    c = (c.astype(np.float32) / 255 - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    d = model().run(None, {"0": c.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    return cv2.resize(d, (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC)


def grad(a):
    return cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3) / 8, cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3) / 8


def to_px(gx, gy, target, ref):
    """Scale a slope field so its 99th percentile magnitude (inside ref) is `target` px."""
    mag = np.hypot(gx, gy)
    p = np.percentile(mag[ref], 99) if ref.any() else 1
    k = target / max(p, 1e-6)
    return gx * k, gy * k


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("photo"); ap.add_argument("prefix")
    ap.add_argument("--box"); ap.add_argument("--body", type=float, default=3.0)
    ap.add_argument("--folds", type=float, default=2.5)
    a = ap.parse_args()
    img = cv2.imread(a.photo)
    H, W = img.shape[:2]
    box = tuple(int(v) for v in a.box.split(",")) if a.box else (0, 0, W, H)
    d = np.zeros((H, W), np.float32)
    d[box[1]:box[3], box[0]:box[2]] = depth(img, box)
    # Broad shape: smooth the depth, then its slope.
    body = cv2.GaussianBlur(d, (0, 0), 14)
    bx, by = to_px(*grad(body), a.body, np.ones_like(d, bool))
    # Fold detail: band-pass of brightness relative to local brightness.
    L = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    rel = (cv2.GaussianBlur(L, (0, 0), 2.5) - cv2.GaussianBlur(L, (0, 0), 12)) / (cv2.GaussianBlur(L, (0, 0), 30) + 0.05)
    rel = np.clip(rel, -0.1, 0.1)
    fx, fy = to_px(*grad(cv2.GaussianBlur(rel, (0, 0), 2)), a.folds, np.ones_like(d, bool))
    dx = np.clip(bx + fx, -7.9, 7.9); dy = np.clip(by + fy, -7.9, 7.9)
    out = np.dstack([np.full_like(dx, 128), 128 + dy * SCALE, 128 + dx * SCALE])  # BGR: B=128, G=y, R=x
    def save(name, img):
        # Smooth maps: half size is plenty and keeps downloads small (the engine
        # scales them up to the photo).
        img = cv2.resize(np.clip(np.round(img), 0, 255).astype(np.uint8), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f"{a.prefix}-{name}.png", img, [cv2.IMWRITE_PNG_COMPRESSION, 9])

    save("displace", out)
    # Shadow: broad brightness relative to the garment's white (97th percentile in the box).
    low = cv2.GaussianBlur(L, (0, 0), 22)
    white = np.percentile(low[box[1]:box[3], box[0]:box[2]], 97)
    save("shadow", np.clip(low / max(white, 1e-3), 0, 1) * 255)
    # Highlight: light catching ridges and folds.
    hl = cv2.GaussianBlur(np.clip(rel, 0, 0.06) / 0.06, (0, 0), 1.0)
    save("highlight", hl * 255)
    print(f"wrote {a.prefix}-{{displace,shadow,highlight}}.png  |shift| p99 = {np.percentile(np.hypot(dx, dy), 99):.2f}px", file=sys.stderr)


if __name__ == "__main__":
    main()
