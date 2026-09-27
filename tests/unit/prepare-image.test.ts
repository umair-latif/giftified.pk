import { describe, expect, it } from "vitest";
import {
  ImageUploadError,
  MAX_UPLOAD_BYTES,
  previewSize,
  validateImageFile,
} from "@/features/editor/assets/prepare-image";

describe("upload validation", () => {
  it("accepts JPG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(() => validateImageFile({ type, size: 1000 })).not.toThrow();
    }
  });

  it("rejects other types and huge files with friendly errors", () => {
    expect(() => validateImageFile({ type: "image/heic", size: 1000 })).toThrow(
      ImageUploadError,
    );
    expect(() =>
      validateImageFile({ type: "application/pdf", size: 1000 }),
    ).toThrow(/JPG, PNG or WebP/);
    expect(() =>
      validateImageFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 }),
    ).toThrow(/25 MB/);
  });
});

describe("preview size", () => {
  it("downscales the long edge to 2048 px and keeps the aspect ratio", () => {
    expect(previewSize(8000, 6000)).toEqual({ width: 2048, height: 1536 });
    expect(previewSize(3000, 6000)).toEqual({ width: 1024, height: 2048 });
  });

  it("never upscales small images", () => {
    expect(previewSize(640, 480)).toEqual({ width: 640, height: 480 });
  });
});
