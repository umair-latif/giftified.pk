/**
 * Share / download a product photo (Preview step: share + download, no link;
 * published design pages: share with the design's link). The view on screen
 * becomes a JPEG — small enough for WhatsApp — with the
 * DesignBanana logo and "designbanana.pk" in the bottom-right corner, so
 * friends see where it was made. Designers (template editors) get it clean.
 *
 * Phones (and browsers that can share files): the phone's own share sheet
 * (WhatsApp, Instagram, Gallery…). Everywhere: a plain download.
 */

const LOGO_SRC = "/brand/designbanana-logo.png";
/** Logo width as a share of the photo's width (corner mark, founder's pick). */
const LOGO_WIDTH = 0.28;
const SITE_TEXT = "designbanana.pk";
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

/**
 * The preview photo as a JPEG. With `watermark` (customers): a corner mark in
 * the bottom-right, the logo with "designbanana.pk" under it on a soft white
 * card, clear of the design in the middle. Designers share theirs clean.
 */
export async function brandedPhoto(
  src: string,
  { watermark = true }: { watermark?: boolean } = {},
): Promise<Blob> {
  const photo = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#ffffff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0);
  if (watermark) await drawCornerMark(ctx, canvas.width, canvas.height);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("could not encode"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

async function drawCornerMark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): Promise<void> {
  let logo: HTMLImageElement;
  try {
    logo = await loadImage(LOGO_SRC);
  } catch {
    return; // No logo (offline?): share the photo as it is.
  }
  const w = Math.round(width * LOGO_WIDTH);
  const h = Math.round((w * logo.naturalHeight) / logo.naturalWidth);
  const textSize = Math.round(h * 0.42);
  const gap = Math.round(h * 0.18);
  const pad = Math.round(w * 0.09);
  const cardW = w + pad * 2;
  const cardH = h + gap + textSize + pad * 2;
  const margin = Math.round(width * 0.03);
  const x = width - margin - cardW;
  const y = height - margin - cardH;

  // Soft white card, so it reads on dark photos too.
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  if (ctx.roundRect)
    ctx.roundRect(x, y, cardW, cardH, Math.round(cardH * 0.18));
  else ctx.rect(x, y, cardW, cardH);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(logo, x + pad, y + pad, w, h);
  // The site's own text font (next/font gives it a generated family name).
  const family =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  ctx.font = `600 ${textSize}px ${family}`;
  ctx.fillStyle = "#121212";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(SITE_TEXT, x + cardW / 2, y + pad + h + gap, w);
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
 * Opens the share sheet with the photo (and the link, if any). Resolves
 * "shared", "cancelled" (the customer closed the sheet) or "unsupported".
 */
export async function sharePhoto(
  blob: Blob,
  fileName: string,
  text: string,
  url?: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  const file = new File([blob], fileName, { type: "image/jpeg" });
  if (!navigator.canShare?.({ files: [file] })) return "unsupported";
  try {
    // WhatsApp drops `url` when files are attached, so it goes in the text.
    await navigator.share({
      files: [file],
      text: url ? `${text} ${url}` : text,
    });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError")
      return "cancelled";
    return "unsupported";
  }
}

/**
 * Where photos can't be shared (most computers): share just the link, or
 * copy it when there's no share sheet at all.
 */
export async function shareLink(
  text: string,
  url: string,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError")
        return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
