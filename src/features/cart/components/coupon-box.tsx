"use client";

import { useState } from "react";
import { formatPkr } from "@/features/checkout/format";

interface Props {
  /** The code the server accepted (lower-case), if any. */
  appliedCode?: string;
  discountPkr: number;
  /** Why the last code was refused. */
  error?: string;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/** "Have a coupon?" — the server decides whether the code is valid for this cart. */
export function CouponBox({
  appliedCode,
  discountPkr,
  error,
  onApply,
  onRemove,
}: Props) {
  const [typed, setTyped] = useState("");
  if (appliedCode)
    return (
      <div
        className="bg-soft text-deep flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
        data-testid="coupon-applied"
      >
        <span>
          Coupon <strong className="uppercase">{appliedCode}</strong>
          {discountPkr > 0 ? ` · you save ${formatPkr(discountPkr)}` : ""}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="h-9 rounded-full px-3 underline"
        >
          Remove
        </button>
      </div>
    );
  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (typed.trim()) onApply(typed.trim());
      }}
    >
      <label
        htmlFor="coupon-code"
        className="text-ink block text-sm font-semibold"
      >
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={60}
          className="focus:border-ink border-ink/25 h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base uppercase"
        />
        <button
          type="submit"
          disabled={!typed.trim()}
          className="text-ink border-ink disabled:text-ink/40 disabled:ring-ink/15 lift press h-11 rounded-2xl border-[3px] bg-white px-4 text-sm font-semibold"
        >
          Apply
        </button>
      </div>
      {error && (
        <p
          className="text-sm text-red-700"
          role="alert"
          data-testid="coupon-error"
        >
          {error}
        </p>
      )}
    </form>
  );
}
