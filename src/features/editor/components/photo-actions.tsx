"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, ShareIcon } from "@/components/ui/icons";
import {
  brandedPhoto,
  canShareFiles,
  downloadBlob,
  shareFileName,
  sharePhoto,
} from "../share-mockup";

const BUTTON =
  "focus-visible:ring-brand-600/40 grid size-11 place-items-center rounded-full border-2 border-ink bg-white text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-mint-100 active:translate-y-0.5 active:shadow-none focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60";

/**
 * Share and Download for the preview photo on screen, in its top-right
 * corner. Share only where the browser can share image files (phones, some
 * desktops); Download everywhere. Both give the JPEG from `share-mockup.ts`:
 * with the corner mark for customers, clean for designers.
 */
export function PhotoActions({
  src,
  productId,
  productName,
  viewLabel,
  watermark = true,
}: {
  src: string;
  /** Corner mark on the photo. Off for designers (template editors). */
  watermark?: boolean;
  productId: string;
  productName: string;
  viewLabel: string;
}) {
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability, only known after mount
    setCanShare(canShareFiles());
  }, []);

  const fileName = shareFileName(productName, viewLabel);
  const run = async (mode: "share" | "download") => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await brandedPhoto(src, { watermark });
      if (mode === "share") {
        const r = await sharePhoto(
          blob,
          fileName,
          "My design on DesignBanana. Kuch khaas banao!",
          `${location.origin}/products/${productId}`,
        );
        if (r === "unsupported") downloadBlob(blob, fileName);
      } else {
        downloadBlob(blob, fileName);
      }
    } catch (err) {
      console.error("[preview] share/download failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="absolute top-2 right-2 z-10 flex gap-2"
      data-testid="photo-actions"
    >
      {canShare && (
        <button
          type="button"
          aria-label="Share this photo"
          disabled={busy}
          onClick={() => void run("share")}
          className={BUTTON}
          data-testid="photo-share"
        >
          <ShareIcon width={20} height={20} />
        </button>
      )}
      <button
        type="button"
        aria-label="Download this photo"
        disabled={busy}
        onClick={() => void run("download")}
        className={BUTTON}
        data-testid="photo-download"
      >
        <DownloadIcon width={20} height={20} />
      </button>
    </div>
  );
}
