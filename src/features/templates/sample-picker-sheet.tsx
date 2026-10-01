"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import {
  ACCEPTED_IMAGE_TYPES,
  prepareImage,
  previewSize,
} from "@/features/editor/assets/prepare-image";

interface Sample {
  id: string;
  widthPx: number;
  heightPx: number;
  url: string;
}

export interface PickedSample {
  id: string;
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

interface Props {
  /** The selected photo is already a customer's photo (showing this sample). */
  current: { sampleId: string | null } | null;
  onPick: (sample: PickedSample) => void;
  /** Make the photo ordinary artwork again. */
  onClear: () => void;
  onClose: () => void;
}

/**
 * Designers: make the selected photo a "customer's photo". Only photos from
 * the sample library may sit in one (customers replace them; they are never
 * printed). Designers can add photos to the library here.
 */
export function SamplePickerSheet({
  current,
  onPick,
  onClear,
  onClose,
}: Props) {
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/samples");
      if (!res.ok) throw new Error();
      setSamples(((await res.json()) as { samples: Sample[] }).samples);
    } catch {
      setError("Couldn't load the sample photos");
      setSamples([]);
    }
  }, []);
  useEffect(() => {
    // Fetching on open; the result lands in state asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function pick(s: Sample) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(s.url);
      if (!res.ok) throw new Error();
      onPick({
        id: s.id,
        blob: await res.blob(),
        widthPx: s.widthPx,
        heightPx: s.heightPx,
      });
      onClose();
    } catch {
      setError("Couldn't load that photo. Please try again.");
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      // Samples are never printed: the ≤2048 px copy is all we keep.
      const prepared = await prepareImage(file);
      const preview = previewSize(prepared.widthPx, prepared.heightPx);
      const form = new FormData();
      form.set("photo", prepared.preview, "sample.webp");
      form.set("widthPx", String(preview.width));
      form.set("heightPx", String(preview.height));
      const res = await fetch("/api/admin/samples", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Couldn't add the photo");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the photo");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Sample) {
    if (
      !window.confirm(
        "Remove this photo from the sample library? Designs that use it keep their copy.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/samples/${encodeURIComponent(s.id)}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res?.ok) setError("Couldn't remove it");
    await load();
    setBusy(false);
  }

  return (
    <Sheet title="Customer's photo" onClose={onClose}>
      <div className="space-y-3 pt-1 pb-2 text-sm" data-testid="sample-picker">
        <p className="text-zinc-600">
          Customers must replace this photo with their own before ordering. Pick
          the sample they see until then.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Add a sample photo"
          data-testid="sample-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        {samples === null ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <ul
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            aria-label="Sample photos"
          >
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="border-brand-300 text-brand-700 focus-visible:ring-brand-600/20 grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed text-xs font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              >
                + Add sample
              </button>
            </li>
            {samples.map((s, i) => (
              <li key={s.id} className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void pick(s)}
                  aria-label={`Sample photo ${i + 1}`}
                  aria-pressed={current?.sampleId === s.id}
                  className={`focus-visible:ring-brand-600/40 block aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${
                    current?.sampleId === s.id
                      ? "ring-brand-600 ring-2"
                      : "ring-1 ring-zinc-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                  <img
                    src={s.url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(s)}
                  aria-label={`Remove sample photo ${i + 1}`}
                  className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-white/90 text-xs text-zinc-600 shadow ring-1 ring-zinc-200"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {samples?.length === 0 && !error && (
          <p className="text-xs text-zinc-500">
            The library is empty. Add the first sample photo.
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        {current && (
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="focus-visible:ring-brand-600/20 h-10 w-full rounded-full border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none"
          >
            Make it part of the design
          </button>
        )}
      </div>
    </Sheet>
  );
}
