"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProductConfig } from "@/config/products";
import { loadDraft } from "@/features/editor/draft";
import {
  DesignUploadFailed,
  uploadDesignForOrder,
} from "@/features/editor/upload-design";
import { newId } from "@/lib/id";
import { normalizePkMobile } from "@/lib/phone";
import { printQualityReport } from "@/lib/print-quality";
import { placeOrder, quoteOrder, type OrderQuote } from "../actions";
import { formatPkr } from "../format";
import type { FieldErrors } from "../schema";
import { CityPicker } from "./city-picker";
import { Field, errorId, inputClass } from "./field";

/** Same as MAX_QUANTITY in schema.ts — not imported so zod stays out of the client bundle. */
const MAX_QTY = 10;
type DraftState = "loading" | "empty" | "ok" | "warn" | "block";
const FIELDS = [
  "fullName",
  "phone",
  "city",
  "addressLine",
  "landmark",
] as const;
type Values = Record<(typeof FIELDS)[number], string>;

/** The Order step: COD form + order summary. Prices come from the server. */
export function CheckoutForm({ product }: { product: ProductConfig }) {
  const router = useRouter();
  const colourId = product.baseColors[0]?.id ?? "white";
  const editorHref = `/design/${product.id}`;
  const [draft, setDraft] = useState<DraftState>("loading");
  const [values, setValues] = useState<Values>({
    fullName: "",
    phone: "",
    city: "",
    addressLine: "",
    landmark: "",
  });
  const [quantity, setQuantity] = useState(1);
  const [quoteCity, setQuoteCity] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string>();
  const inFlight = useRef(false);
  // Uploaded once per visit: a retry after a failed order reuses it.
  const designId = useRef<string | null>(null);
  // One checkoutId per attempt: re-sending the same details reuses it, so a
  // retry after a lost response can never create a second order.
  const attempt = useRef<{ key: string; id: string } | null>(null);

  useEffect(() => {
    const doc = loadDraft(product.id);
    const layers = (doc?.fabric.objects as unknown[] | undefined)?.length ?? 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setDraft(
      !doc || layers === 0 ? "empty" : printQualityReport(doc.fabric).status,
    );
  }, [product.id]);

  useEffect(() => {
    let stale = false;
    quoteOrder({ productId: product.id, colourId, quantity, city: quoteCity })
      .then((q) => !stale && setQuote(q))
      .catch(() => !stale && setQuote(null));
    return () => {
      stale = true;
    };
  }, [product.id, colourId, quantity, quoteCity]);

  const set = (field: keyof Values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const data = { productId: product.id, colourId, quantity, ...values };
    const key = JSON.stringify(data);
    if (attempt.current?.key !== key) attempt.current = { key, id: newId() };
    inFlight.current = true;
    setSubmitting(true);
    setMessage(undefined);
    try {
      if (!designId.current) {
        setProgress("Saving your design…");
        designId.current = (
          await uploadDesignForOrder(product.id, {
            onProgress: (done, total) =>
              total > 0 &&
              setProgress(
                done < total
                  ? `Uploading photo ${done + 1} of ${total}…`
                  : "Placing order…",
              ),
          })
        ).designId;
      }
      setProgress("Placing order…");
      const r = await placeOrder({
        ...data,
        designId: designId.current,
        checkoutId: attempt.current.id,
      });
      if (r.ok) {
        router.push(`/order/${r.orderId}`);
        return; // stay disabled while the confirmation page loads
      }
      if (r.errors.designId) designId.current = null; // upload again next time
      setErrors(r.errors);
      setMessage(
        r.message ??
          (r.errors.productId || "Please check the highlighted fields."),
      );
      const first = FIELDS.find((f) => r.errors[f]);
      if (first) document.getElementById(first)?.focus();
    } catch (err) {
      console.error("[checkout]", err);
      setMessage(
        err instanceof DesignUploadFailed
          ? err.message
          : "No connection. Please check your internet and try again.",
      );
    }
    inFlight.current = false;
    setSubmitting(false);
    setProgress(undefined);
  }

  if (draft === "loading") return null;
  if (draft === "empty" || draft === "block")
    return (
      <div
        className="rounded-lg bg-white p-4 text-sm ring-1 ring-zinc-200"
        data-testid="checkout-blocked"
      >
        <p className={draft === "block" ? "text-red-700" : "text-zinc-700"}>
          {draft === "block"
            ? "A photo is too blurry to print — go back and make it smaller."
            : "Nothing designed yet."}
        </p>
        <Link
          href={editorHref}
          className="bg-brand-600 mt-3 inline-flex h-11 items-center rounded-full px-5 font-medium text-white"
        >
          Back to the editor
        </Link>
      </div>
    );

  const input = (field: keyof Values) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: (e: { target: { value: string } }) => set(field)(e.target.value),
    className: inputClass(!!errors[field]),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {draft === "warn" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          A photo may look a little soft when printed. You can still order, or{" "}
          <Link href={editorHref} className="font-medium underline">
            make it smaller
          </Link>{" "}
          for a sharper print.
        </p>
      )}
      <Field id="fullName" label="Full name" error={errors.fullName}>
        <input {...input("fullName")} autoComplete="name" />
      </Field>
      <Field id="phone" label="Mobile number" error={errors.phone}>
        <input
          {...input("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          onBlur={() => {
            if (values.phone.trim() && !normalizePkMobile(values.phone))
              setErrors((e) => ({
                ...e,
                phone:
                  "Please write a Pakistani mobile number, like 0300 1234567.",
              }));
          }}
        />
      </Field>
      <Field id="city" label="City" error={errors.city}>
        <CityPicker
          value={values.city}
          onChange={set("city")}
          onCommit={setQuoteCity}
          invalid={!!errors.city}
          describedBy={errors.city ? errorId("city") : undefined}
        />
      </Field>
      <Field id="addressLine" label="Address" error={errors.addressLine}>
        <input
          {...input("addressLine")}
          autoComplete="street-address"
          placeholder="House, street, area"
        />
      </Field>
      <Field
        id="landmark"
        label="Landmark"
        hint="optional"
        error={errors.landmark}
      >
        <input
          {...input("landmark")}
          autoComplete="address-line2"
          placeholder="Near the mosque, school…"
        />
      </Field>

      <section
        aria-label="Order summary"
        className="rounded-lg bg-white p-4 text-sm ring-1 ring-zinc-200"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">{product.name}</p>
            <p className="truncate text-xs text-zinc-500">{product.subtitle}</p>
          </div>
          <div className="flex items-center" role="group" aria-label="Quantity">
            <button
              type="button"
              aria-label="One less"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="size-11 rounded-full text-xl text-zinc-700 active:bg-zinc-100 disabled:text-zinc-300"
            >
              −
            </button>
            <output className="w-6 text-center" data-testid="quantity">
              {quantity}
            </output>
            <button
              type="button"
              aria-label="One more"
              disabled={quantity >= MAX_QTY}
              onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
              className="size-11 rounded-full text-xl text-zinc-700 active:bg-zinc-100 disabled:text-zinc-300"
            >
              +
            </button>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 border-t border-zinc-100 pt-3">
          <dt className="text-zinc-500">Price</dt>
          <dd className="text-right">
            {quote ? `${quantity} × ${formatPkr(quote.unitPricePkr)}` : "…"}
          </dd>
          <dt className="text-zinc-500">Delivery</dt>
          <dd className="text-right" data-testid="shipping">
            {quote?.shippingPkr != null
              ? formatPkr(quote.shippingPkr)
              : "Choose your city"}
          </dd>
          <dt className="font-semibold text-zinc-900">Total</dt>
          <dd className="text-right font-semibold" data-testid="total">
            {quote?.shippingPkr != null ? formatPkr(quote.totalPkr) : "…"}
          </dd>
        </dl>
        <p className="mt-2 text-xs text-zinc-500">
          Pay in cash when it arrives. We’ll call or message you to confirm
          before we print.
        </p>
      </section>

      {message && (
        <p className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 h-12 rounded-full text-base font-semibold text-white"
      >
        {submitting
          ? (progress ?? "Placing order…")
          : "Place order · Cash on Delivery"}
      </button>
    </form>
  );
}
