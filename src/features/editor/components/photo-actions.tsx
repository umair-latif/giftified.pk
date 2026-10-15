"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, ShareIcon } from "@/components/ui/icons";
import { iconButtonClass } from "@/components/ui/button";
import {
  brandedPhoto,
  canShareFiles,
  downloadBlob,
  sharePhoto,
  shareLink,
} from "../share-mockup";

const BUTTON = `${iconButtonClass} size-11`;

/**
 * Share / Download buttons for the photo on screen, in its top-right corner.
 * The photo is the JPEG from `share-mockup.ts`: with the corner mark, or
 * clean for designers (`watermark={false}`).
 *
 * - Preview (own design): Share (photo only, no link: there's no public page
 *   for it) where the browser can share photos, and Download.
 * - Published design page: Share with the design's link, no Download. Where
 *   photos can't be shared (most computers) it shares or copies the link.
 */
export function PhotoActions({
  src,
  fileName,
  watermark = true,
  share,
  download = false,
}: {
  src: string;
  fileName: string;
  /** Corner mark on the photo. Off for designers (template editors). */
  watermark?: boolean;
  /** Share button: the text, and the page to link to (if there is one). */
  share?: { text: string; url?: () => string };
  download?: boolean;
}) {
  const [canFiles, setCanFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability, only known after mount
    setCanFiles(canShareFiles());
  }, []);

  // Without photo sharing, Share only makes sense when there's a link.
  const showShare = !!share && (canFiles || !!share.url);

  const onShare = async () => {
    if (busy || !share) return;
    setBusy(true);
    try {
      const url = share.url?.();
      if (canFiles) {
        const blob = await brandedPhoto(src, { watermark });
        const r = await sharePhoto(blob, fileName, share.text, url);
        if (r !== "unsupported" || !url) return;
      }
      if (url && (await shareLink(share.text, url)) === "copied") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("[photo] share failed", err);
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      downloadBlob(await brandedPhoto(src, { watermark }), fileName);
    } catch (err) {
      console.error("[photo] download failed", err);
    } finally {
      setBusy(false);
    }
  };

  if (!showShare && !download) return null;
  return (
    <div
      className="absolute top-2 right-2 z-10 flex items-center gap-2"
      data-testid="photo-actions"
    >
      {copied && (
        <span
          role="status"
          className="bg-ink rounded-full px-3 py-1 text-xs font-semibold text-white"
        >
          Link copied
        </span>
      )}
      {showShare && (
        <button
          type="button"
          aria-label="Share this photo"
          disabled={busy}
          onClick={() => void onShare()}
          className={BUTTON}
          data-testid="photo-share"
        >
          <ShareIcon width={20} height={20} />
        </button>
      )}
      {download && (
        <button
          type="button"
          aria-label="Download this photo"
          disabled={busy}
          onClick={() => void onDownload()}
          className={BUTTON}
          data-testid="photo-download"
        >
          <DownloadIcon width={20} height={20} />
        </button>
      )}
    </div>
  );
}
