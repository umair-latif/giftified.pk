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
        className="bg-mint-100 text-brand-900 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
        data-testid="coupon-applied"
      >
        <span>
          Coupon <strong className="uppercase">{appliedCode}</strong>
          {discountPkr > 0 ? ` · you save ${formatPkr(discountPkr)}` : ""}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="focus-visible:ring-brand-600/20 h-9 rounded-full px-3 underline focus-visible:ring-2 focus-visible:outline-none"
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
        className="block text-sm font-medium text-zinc-900"
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
          className="focus:border-brand-600 h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base uppercase"
        />
        <button
          type="submit"
          disabled={!typed.trim()}
          className="text-ink border-ink hover:bg-mint-100 h-11 rounded-2xl border-[3px] bg-white px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:text-zinc-300 disabled:ring-zinc-200"
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
