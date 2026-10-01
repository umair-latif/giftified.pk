"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { SAVED_DESIGN_NAME_MAX } from "@/lib/commerce/saved-designs";
import type { SavedDesign } from "@/lib/commerce/types";
import { deleteSavedDesignAction, renameSavedDesignAction } from "../actions";

type Mode = "view" | "rename" | "confirm-delete";

/** One tile on /account/designs: open in the editor, rename, delete (task 22). */
export function SavedDesignCard({
  design,
  productName,
  thumbnailUrl,
}: {
  design: SavedDesign;
  productName: string;
  thumbnailUrl?: string;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [name, setName] = useState(design.name);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const run = (step: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const r = await step();
      if (r.ok) setMode("view");
      else setError(r.message);
    });

  const updated = new Date(design.updatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <li
      className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200"
      data-testid="saved-design"
    >
      <Link
        href={`/design/${design.productId}?saved=${encodeURIComponent(design.id)}`}
        className="bg-cream grid aspect-[5/2] place-items-center"
        aria-label={`Open ${design.name}`}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, nothing to optimise
          <img
            src={thumbnailUrl}
            alt=""
            className="size-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-zinc-500">{productName}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {mode === "rename" ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => renameSavedDesignAction(design.id, name));
            }}
          >
            <label className="sr-only" htmlFor={`name-${design.id}`}>
              Design name
            </label>
            <input
              id={`name-${design.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={SAVED_DESIGN_NAME_MAX}
              autoFocus
              className="text-ink focus:ring-brand-600/20 h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm focus:ring-2 focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 disabled:bg-brand-300 disabled:hover:bg-brand-300 h-11 rounded-full px-4 text-sm font-semibold text-white"
            >
              Save
            </button>
          </form>
        ) : (
          <div>
            <p className="text-ink font-medium" data-testid="saved-design-name">
              {design.name}
            </p>
            <p className="text-xs text-zinc-500">
              {productName} · {updated}
              {design.source === "order" && design.orderId
                ? ` · from order #${design.orderId}`
                : ""}
            </p>
          </div>
        )}

        {mode === "confirm-delete" ? (
          <div className="flex flex-col gap-2" role="group">
            <p className="text-sm text-zinc-600">
              Delete this design and its photos? This can’t be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteSavedDesignAction(design.id))}
                className="h-11 flex-1 rounded-full bg-red-700 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                data-testid="saved-design-confirm-delete"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setMode("view")}
                className="text-ink h-11 flex-1 rounded-full border border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap gap-2">
            <Link
              href={`/design/${design.productId}?saved=${encodeURIComponent(design.id)}`}
              className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-white"
              data-testid="saved-design-open"
            >
              Open
            </Link>
            {mode === "view" ? (
              <button
                type="button"
                onClick={() => setMode("rename")}
                className="text-ink h-11 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
              >
                Rename
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setName(design.name);
                  setMode("view");
                }}
                className="text-ink h-11 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("confirm-delete")}
              className="h-11 rounded-full px-3 text-sm font-medium text-red-700 hover:bg-red-50"
              data-testid="saved-design-delete"
            >
              Delete
            </button>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
