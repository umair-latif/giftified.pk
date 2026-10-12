/**
 * Share / download a preview photo (Preview step). The customer gets the view
 * they're looking at as a JPEG — small enough for WhatsApp — with a small
 * DesignBanana logo in the corner: their friends see where it was made.
 *
 * Phones (and browsers that can share files): the phone's own share sheet
 * (WhatsApp, Instagram, Gallery…). Everywhere: a plain download.
 */

const LOGO_SRC = "/brand/designbanana-logo.png";
/** Logo width as a share of the photo's width. */
const LOGO_WIDTH = 0.24;
const JPEG_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** `designbanana-custom-mug-front.jpg` */
export function shareFileName(productName: string, viewLabel: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `designbanana-${slug(productName)}-${slug(viewLabel) || "view"}.jpg`;
}

/** The preview photo with the logo in the bottom-right corner, as a JPEG. */
export async function brandedPhoto(src: string): Promise<Blob> {
  const photo = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#ffffff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0);

  try {
    const logo = await loadImage(LOGO_SRC);
    const w = Math.round(canvas.width * LOGO_WIDTH);
    const h = Math.round((w * logo.naturalHeight) / logo.naturalWidth);
    const pad = Math.round(w * 0.12);
    const margin = Math.round(canvas.width * 0.03);
    const x = canvas.width - margin - w - pad;
    const y = canvas.height - margin - h - pad;
    // A soft white pill behind it, so it reads on dark photos too.
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(x, y, w + pad * 2, h + pad * 2, (h + pad * 2) / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(logo, x + pad, y + pad, w, h);
  } catch {
    // No logo (offline?): share the photo as it is.
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("could not encode"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

/** Can this browser share image files (the phone's share sheet)? */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File([new Uint8Array(1)], "probe.jpg", {
      type: "image/jpeg",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Opens the share sheet with the photo. Resolves "shared", "cancelled" (the
 * customer closed the sheet) or "unsupported" (caller falls back to download).
 */
export async function sharePhoto(
  blob: Blob,
  fileName: string,
  text: string,
  url: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  const file = new File([blob], fileName, { type: "image/jpeg" });
  if (!navigator.canShare?.({ files: [file] })) return "unsupported";
  try {
    // WhatsApp drops `url` when files are attached, so it's in the text too.
    await navigator.share({ files: [file], text: `${text} ${url}` });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError")
      return "cancelled";
    return "unsupported";
  }
}
