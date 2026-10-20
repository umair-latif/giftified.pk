"use client";

import { useState } from "react";
import { buttonClass, compactButtonClass } from "@/components/ui/button";
import { ImageIcon } from "@/components/ui/icons";
import { Field, inputClass } from "@/features/checkout/components/field";
import { compressReviewPhoto } from "../compress-photo";

interface Props {
  orderId: number;
  token: string;
  line: number;
  /** Product name shown above the form. */
  productName: string;
  defaultName: string;
}

async function post(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json as { error?: unknown } | null)?.error;
    throw new Error(
      typeof msg === "string" ? msg : "Something went wrong. Please try again.",
    );
  }
  return json;
}

/** One order line's review form: stars, a few words, optional photo. */
export function ReviewForm({
  orderId,
  token,
  line,
  productName,
  defaultName,
}: Props) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName);
  const [photo, setPhoto] = useState<File | null>(null);
  // Bumped on Remove so the file input empties and the same photo can be picked again.
  const [photoInput, setPhotoInput] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const id = `review-${line}`;

  if (done)
    return (
      <div className="card p-4" role="status">
        <p className="font-semibold">
          Thank you for your review of {productName}!
        </p>
        <p className="text-ink/70 mt-1 text-sm">
          It will appear on the shop once we’ve had a look.
        </p>
      </div>
    );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return setError("Please choose a star rating.");
    if (!text.trim()) return setError("Please write a few words.");
    setBusy(true);
    setError(undefined);
    try {
      const link = { orderId, token, line };
      if (photo) {
        const blob = await compressReviewPhoto(photo);
        const { uploadUrl } = (await post("/api/reviews/photo", {
          ...link,
          contentType: "image/webp",
        })) as { uploadUrl: string };
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": "image/webp" },
          body: blob,
        });
        if (!put.ok)
          throw new Error("Your photo didn’t upload. Please try again.");
      }
      await post("/api/reviews", {
        ...link,
        rating,
        text,
        name,
        hasPhoto: !!photo,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="card flex flex-col gap-4 p-4"
    >
      <h3 className="font-semibold">{productName}</h3>
      <fieldset>
        <legend className="text-ink text-sm font-semibold">Your rating</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="h-12 w-12 rounded-xl text-3xl"
            >
              <span aria-hidden>{n <= rating ? "★" : "☆"}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field id={`${id}-text`} label="Your review">
        <textarea
          id={`${id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={4}
          className={`${inputClass(false)} h-auto py-2`}
        />
      </Field>
      <Field id={`${id}-name`} label="Your name" note="Shown with your review.">
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="given-name"
          className={inputClass(false)}
        />
      </Field>
      <Field id={`${id}-photo`} label="Photo" hint="optional">
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={`${compactButtonClass("secondary")} cursor-pointer`}
          >
            <ImageIcon className="h-5 w-5" aria-hidden />
            {photo ? "Change photo" : "Add a photo"}
            <input
              key={photoInput}
              id={`${id}-photo`}
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          {photo && (
            <>
              <span className="text-ink/70 max-w-full min-w-0 truncate text-sm">
                {photo.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoInput((n) => n + 1);
                }}
                className="text-ink text-sm font-semibold underline"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </Field>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={buttonClass("primary")}>
        {busy ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}
