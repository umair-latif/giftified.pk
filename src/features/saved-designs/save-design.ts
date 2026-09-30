import type { SavedDesign } from "@/lib/commerce/types";
import { collectAssetIds } from "@/features/editor/assets/asset-ref";
import {
  getAsset,
  type StoredAsset,
} from "@/features/editor/assets/asset-store";
import type { DesignDocument } from "@/types/design";

/**
 * "Save to my designs" (task 22), in the browser: the design JSON goes
 * through us, photos go straight from the phone to storage (same as
 * checkout), then `finish` records it in the account.
 */
export interface SaveDeps {
  fetch: typeof fetch;
  getAsset: (
    id: string,
  ) => Promise<Pick<StoredAsset, "original" | "mime"> | null>;
  onProgress?: (done: number, total: number) => void;
}

export class SaveDesignFailed extends Error {
  constructor(
    message: string,
    /** 401: signed out meanwhile. */
    readonly status?: number,
  ) {
    super(message);
  }
}

interface ApiError {
  error?: string;
}

export async function saveToMyDesigns(
  input: {
    design: DesignDocument;
    /** Update this saved design (the one the draft was opened from / last saved as). */
    savedId?: string;
    name?: string;
    /** Design product (task 26) the design was started from. */
    templateId?: string;
    thumbnail?: Blob | null;
  },
  deps: Partial<SaveDeps> = {},
): Promise<SavedDesign> {
  const d = {
    // Wrapped: the browser's fetch throws "Illegal invocation" as a method.
    fetch:
      deps.fetch ??
      ((i: RequestInfo | URL, init?: RequestInit) => fetch(i, init)),
    getAsset: deps.getAsset ?? getAsset,
    onProgress: deps.onProgress,
  };
  const ids = collectAssetIds(input.design.fabric);
  const assets = await Promise.all(
    ids.map(async (id) => ({ id, asset: await d.getAsset(id) })),
  );
  if (assets.some((a) => !a.asset))
    throw new SaveDesignFailed(
      "A photo in your design is no longer on this phone. Please add it again.",
    );

  const startRes = await d.fetch("/api/account/designs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(input.savedId ? { savedId: input.savedId } : {}),
      design: input.design,
      assets: assets.map(({ id, asset }) => ({
        assetId: id,
        contentType: asset!.mime,
        size: asset!.original.size,
      })),
      thumbnail: !!input.thumbnail,
    }),
  });
  const ticket = (await startRes.json().catch(() => ({}))) as ApiError & {
    savedId?: string;
    uploads?: { assetId: string; url: string; contentType: string }[];
    thumbnailUrl?: string;
  };
  if (!startRes.ok || !ticket.savedId || !ticket.uploads)
    throw new SaveDesignFailed(
      ticket.error ?? "Couldn't save your design. Please try again.",
      startRes.status,
    );

  let done = 0;
  d.onProgress?.(0, ticket.uploads.length);
  for (const u of ticket.uploads) {
    const asset = assets.find((a) => a.id === u.assetId)?.asset;
    if (!asset)
      throw new SaveDesignFailed("Upload mismatch. Please try again.");
    await put(d.fetch, u.url, asset.original, u.contentType);
    d.onProgress?.(++done, ticket.uploads.length);
  }
  if (ticket.thumbnailUrl && input.thumbnail)
    await put(
      d.fetch,
      ticket.thumbnailUrl,
      input.thumbnail,
      "image/webp",
    ).catch(
      () => undefined, // a plain tile is fine
    );

  const finishRes = await d.fetch(
    `/api/account/designs/${encodeURIComponent(ticket.savedId)}/finish`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(input.name ? { name: input.name } : {}),
        ...(input.templateId ? { templateId: input.templateId } : {}),
      }),
    },
  );
  const entry = (await finishRes.json().catch(() => ({}))) as ApiError &
    Partial<SavedDesign>;
  if (!finishRes.ok || !entry.id)
    throw new SaveDesignFailed(
      entry.error ?? "Couldn't save your design. Please try again.",
      finishRes.status,
    );
  return entry as SavedDesign;
}

async function put(
  doFetch: typeof fetch,
  url: string,
  body: Blob,
  contentType: string,
) {
  let last = "network error";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await doFetch(url, {
        method: "PUT",
        body,
        headers: { "content-type": contentType },
      });
      if (res.ok) return;
      last = `HTTP ${res.status}`;
      if (res.status < 500) break;
    } catch (err) {
      last = err instanceof Error ? err.message : "network error";
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  throw new SaveDesignFailed(
    `Couldn't upload your photo (${last}). Check your connection and try again.`,
  );
}
