import Link from "next/link";
import type { ReactNode } from "react";
import { CONTENT_NOT_CONFIRMED } from "../messages";

const link =
  "text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 rounded font-medium underline";

/**
 * Marketing opt-in (optional), the required content confirmation, and the legal
 * small print — rendered right above Place order. The policy links open in a
 * new tab, so reading them never leaves checkout: the typed name, phone and
 * address would be lost (the cart itself survives, it lives in localStorage).
 */
export function Consents({
  contentConfirmed,
  onContentConfirmed,
  marketingOptIn,
  onMarketingOptIn,
  error,
}: {
  contentConfirmed: boolean;
  onContentConfirmed: (v: boolean) => void;
  marketingOptIn: boolean;
  onMarketingOptIn: (v: boolean) => void;
  error?: string;
}) {
  const hint = error ?? (contentConfirmed ? undefined : CONTENT_NOT_CONFIRMED);
  return (
    <div className="flex flex-col gap-1" data-testid="checkout-consents">
      <CheckboxRow
        id="marketingOptIn"
        checked={marketingOptIn}
        onChange={onMarketingOptIn}
      >
        Send me offers and discounts (Eid deals, new products)
      </CheckboxRow>
      <CheckboxRow
        id="contentConfirmed"
        checked={contentConfirmed}
        onChange={onContentConfirmed}
        required
        describedBy={hint ? "contentConfirmed-hint" : undefined}
        invalid={!!error}
      >
        I confirm my design follows Pakistani law (including PECA) and our{" "}
        <PolicyLink href="/printing-guidelines">Printing guidelines</PolicyLink>
        , and I have the right to print everything in it.
      </CheckboxRow>
      <p className="text-xs text-zinc-500">
        By placing your order you agree to our{" "}
        <PolicyLink href="/terms">Terms</PolicyLink>,{" "}
        <PolicyLink href="/privacy">Privacy notice</PolicyLink> and{" "}
        <PolicyLink href="/printing-guidelines">Printing guidelines</PolicyLink>
        .
      </p>
      {hint && (
        <p
          id="contentConfirmed-hint"
          className={`mt-1 text-sm ${error ? "text-red-700" : "text-zinc-600"}`}
          role={error ? "alert" : undefined}
          data-testid="confirm-hint"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/** The whole row is the label, so the tap target is the full width (≥ 44 px tall). */
export function CheckboxRow({
  id,
  checked,
  onChange,
  required,
  describedBy,
  invalid,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  describedBy?: string | undefined;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-zinc-800"
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="accent-brand-600 mt-0.5 size-5 shrink-0"
      />
      <span>{children}</span>
    </label>
  );
}

/** Opens in a new tab (and says so to screen readers) so checkout stays filled in. */
function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener" className={link}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  );
}
