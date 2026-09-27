/**
 * Validates an uploaded photo, reads its real pixel size, and makes a small
 * preview copy for the editor. The original file is never modified.
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Long edge of the preview copy. Plenty for a phone screen, small in memory. */
export const PREVIEW_MAX_EDGE_PX = 2048;

export class ImageUploadError extends Error {
  constructor(
    message: string,
    readonly code: "type" | "size" | "decode",
  ) {
    super(message);
  }
}

export function validateImageFile(file: { type: string; size: number }): void {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageUploadError(
      "Please choose a JPG, PNG or WebP photo.",
      "type",
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageUploadError(
      "That photo is over 25 MB. Please choose a smaller one.",
      "size",
    );
  }
}

/** Fits (w, h) inside a square of `maxEdge`, never upscaling. */
export function previewSize(
  w: number,
  h: number,
  maxEdge = PREVIEW_MAX_EDGE_PX,
) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export interface PreparedImage {
  widthPx: number;
  heightPx: number;
  preview: Blob;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  validateImageFile(file);
  const { width: widthPx, height: heightPx } = await readDimensions(file);
  const target = previewSize(widthPx, heightPx);
  const preview = await makePreview(file, target.width, target.height);
  return { widthPx, heightPx, preview };
}

/** Header-level decode via <img>; naturalWidth respects EXIF orientation. */
function readDimensions(
  file: Blob,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } else
        reject(new ImageUploadError("We couldn't read that photo.", "decode"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new ImageUploadError(
          "We couldn't open that photo. Try a JPG or PNG.",
          "decode",
        ),
      );
    };
    img.src = url;
  });
}

async function makePreview(
  file: Blob,
  width: number,
  height: number,
): Promise<Blob> {
  // Downscale during decode where supported (keeps memory low for 48 MP phone photos).
  let source: CanvasImageSource;
  try {
    source = await createImageBitmap(file, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
      imageOrientation: "from-image",
    });
  } catch {
    source = await loadImage(file);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new ImageUploadError(
      "Your browser couldn't process that photo.",
      "decode",
    );
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source && typeof source.close === "function") source.close();
  const blob = await toBlob(canvas, "image/webp", 0.85);
  canvas.width = canvas.height = 0; // release memory on low-end phones
  return blob;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new ImageUploadError("We couldn't open that photo.", "decode"));
    img.src = url;
  });
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Browsers without WebP encoding silently return PNG — that's fine.
        if (blob) resolve(blob);
        else
          reject(
            new ImageUploadError(
              "Your browser couldn't process that photo.",
              "decode",
            ),
          );
      },
      type,
      quality,
    );
  });
}
