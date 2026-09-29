"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getProduct } from "@/config/products";
import { quoteCart, type CartQuote } from "@/features/cart/actions";
import { clearCart, useCart } from "@/features/cart/cart";
import { distinctDesigns } from "@/features/cart/cart-lines";
import { loadDraft, loadThumbnail } from "@/features/editor/draft";
import {
  DesignUploadFailed,
  uploadCartDesign,
} from "@/features/editor/upload-design";
import { saveRecentOrder } from "@/features/orders/recent";
import { newId } from "@/lib/id";
import { normalizePkMobile } from "@/lib/phone";
import { printQualityReport } from "@/lib/print-quality";
import type { CartItem } from "@/types/cart";
import { getCheckoutPrefill, placeOrder } from "../actions";
import { formatPkr } from "../format";
import type { FieldErrors } from "../schema";
import { CityPicker } from "./city-picker";
import { CheckboxRow, Consents } from "./consents";
import { Field, errorId, inputClass } from "./field";

const CITY_KEY = "giftified:city";
const FIELDS = [
  "fullName",
  "phone",
  "email",
  "city",
  "addressLine",
  "landmark",
  "deliveryName",
  "deliveryCity",
  "deliveryAddressLine",
  "deliveryLandmark",
] as const;
/** Same name as `SIGNED_IN_COOKIE` (server-only module): "someone is signed in". */
const SIGNED_IN_COOKIE = "giftified_signed_in=1";
type Values = Record<(typeof FIELDS)[number], string>;
/** Print quality per design, or "missing" when the design isn't on this phone any more. */
type DesignState = "ok" | "warn" | "block" | "missing";
/** A cart line that can't be ordered as it is. */
interface Problem {
  item: CartItem;
  index: number;
  state: "block" | "missing" | "unavailable";
}

function readCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
}

const lineKey = (items: CartItem[]) =>
  JSON.stringify(
    items.map((i) => ({
      productId: i.productId,
      colourId: i.colourId,
      ...(i.size ? { size: i.size } : {}),
      quantity: i.quantity,
    })),
  );

/** /checkout: the whole cart → one Cash on Delivery order. Prices come from the server. */
export function CheckoutForm() {
  const router = useRouter();
  const items = useCart();
  const [values, setValues] = useState<Values>({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    addressLine: "",
    landmark: "",
    deliveryName: "",
    deliveryCity: "",
    deliveryAddressLine: "",
    deliveryLandmark: "",
  });
  const [quoteCity, setQuoteCity] = useState("");
  const [deliveryQuoteCity, setDeliveryQuoteCity] = useState("");
  // Deliver somewhere other than the address above (e.g. a gift).
  const [deliveryDifferent, setDeliveryDifferent] = useState(false);
  // Signed-in customers: details prefilled from the account; offer to save them.
  const [signedIn, setSignedIn] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [designs, setDesigns] = useState<Map<string, DesignState> | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [placed, setPlaced] = useState(false);
  // Both unticked by default; the confirmation is required, the opt-in never is.
  const [contentConfirmed, setContentConfirmed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const inFlight = useRef(false);
  // designKey → uploaded designId, kept for the visit so a retry never re-uploads.
  const uploaded = useRef(new Map<string, string>());
  // One checkoutId per attempt: re-sending the same cart + details reuses it,
  // so a retry after a lost response can never create a second order.
  const attempt = useRef<{ key: string; id: string } | null>(null);

  // City remembered from the product page or the cart.
  useEffect(() => {
    const city = readCity();
    if (!city) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setValues((v) => (v.city ? v : { ...v, city }));
    setQuoteCity((c) => c || city);
  }, []);

  // Signed in (the page is static, so ask the server after mount): fill what is
  // still empty from the account. Never overwrites what the customer typed.
  useEffect(() => {
    if (!document.cookie.split("; ").includes(SIGNED_IN_COOKIE)) return;
    let stale = false;
    getCheckoutPrefill()
      .then((p) => {
        if (stale || !p) return;
        setSignedIn(true);
        setSaveToAccount(p.offerSave);
        setValues((v) => ({
          ...v,
          fullName: v.fullName || p.fullName || "",
          email: v.email || p.email || "",
          phone: v.phone || p.phone || "",
          city: v.city || p.city || "",
          addressLine: v.addressLine || p.addressLine || "",
          landmark: v.landmark || p.landmark || "",
        }));
        if (p.city) setQuoteCity((c) => c || p.city!);
      })
      .catch(() => {}); // guest experience is fine
    return () => {
      stale = true;
    };
  }, []);

  // Print quality of each design in the cart (read from this phone).
  const designKeys = items?.map((i) => `${i.productId}:${i.designKey}`).join();
  useEffect(() => {
    if (!items) return;
    const next = new Map<string, DesignState>();
    for (const d of distinctDesigns(items)) {
      const doc = loadDraft(d.productId, d.designKey);
      next.set(
        d.designKey,
        doc ? printQualityReport(doc.fabric).status : "missing",
      );
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saved designs live in localStorage
    setDesigns(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check only when the designs change
  }, [designKeys]);

  const linesKey = items ? lineKey(items) : null;
  useEffect(() => {
    if (!linesKey) return;
    let stale = false;
    // Delivery is priced for the city the parcel goes to.
    const city = deliveryDifferent ? deliveryQuoteCity : quoteCity;
    quoteCart({ lines: JSON.parse(linesKey) as unknown, city })
      .then((q) => !stale && setQuote(q))
      .catch(() => !stale && setQuote(null));
    return () => {
      stale = true;
    };
  }, [linesKey, quoteCity, deliveryQuoteCity, deliveryDifferent]);

  const problems = useMemo((): Problem[] => {
    if (!items || !designs) return [];
    return items.flatMap((item, index): Problem[] => {
      if (quote?.unitPricePkr[index] === null)
        return [{ item, index, state: "unavailable" }];
      const state = designs.get(item.designKey);
      return state === "block" || state === "missing"
        ? [{ item, index, state }]
        : [];
    });
  }, [items, designs, quote]);
  const anyWarn = !!designs && [...designs.values()].includes("warn");

  const set = (field: keyof Values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || !items?.length || problems.length > 0) return;
    if (!contentConfirmed) {
      document.getElementById("contentConfirmed")?.focus();
      return;
    }
    const key = JSON.stringify({
      values,
      items,
      marketingOptIn,
      deliveryDifferent,
      saveToAccount,
    });
    if (attempt.current?.key !== key) attempt.current = { key, id: newId() };
    inFlight.current = true;
    setSubmitting(true);
    setMessage(undefined);
    try {
      const toUpload = distinctDesigns(items);
      for (const [n, d] of toUpload.entries()) {
        if (uploaded.current.has(d.designKey)) continue;
        const label = `Uploading design ${n + 1} of ${toUpload.length}`;
        setProgress(`${label}…`);
        const { designId } = await uploadCartDesign(d.productId, d.designKey, {
          onProgress: (done, total) =>
            total > 0 &&
            done < total &&
            setProgress(`${label} (photo ${done + 1} of ${total})…`),
        });
        uploaded.current.set(d.designKey, designId);
      }
      setProgress("Placing order…");
      const {
        deliveryName,
        deliveryCity,
        deliveryAddressLine,
        deliveryLandmark,
        ...main
      } = values;
      const r = await placeOrder({
        ...main,
        ...(deliveryDifferent
          ? {
              deliveryDifferent,
              deliveryName,
              deliveryCity,
              deliveryAddressLine,
              deliveryLandmark,
            }
          : {}),
        ...(signedIn ? { saveToAccount } : {}),
        contentConfirmed,
        marketingOptIn,
        checkoutId: attempt.current.id,
        lines: items.map((i) => ({
          productId: i.productId,
          colourId: i.colourId,
          ...(i.size ? { size: i.size } : {}),
          quantity: i.quantity,
          designId: uploaded.current.get(i.designKey),
        })),
      });
      if (r.ok) {
        const t = new URL(r.statusUrl, location.origin).searchParams.get("t");
        if (t)
          saveRecentOrder({
            id: r.orderId,
            t,
            createdAt: new Date().toISOString(),
          });
        setPlaced(true);
        clearCart();
        router.push(r.statusUrl);
        return; // stay disabled while the order page loads
      }
      if (r.errors.lines) uploaded.current.clear(); // upload again next time
      setErrors(r.errors);
      setMessage(
        r.message ?? (r.errors.lines || "Please check the highlighted fields."),
      );
      const first =
        FIELDS.find((f) => r.errors[f]) ??
        (r.errors.contentConfirmed ? "contentConfirmed" : undefined);
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

  if (placed)
    return (
      <p className="py-8 text-center text-zinc-700" aria-live="polite">
        Order placed — opening your order…
      </p>
    );
  if (items === null) return null;
  if (items.length === 0)
    return (
      <div
        className="rounded-2xl bg-white p-5 text-center ring-1 ring-zinc-200"
        data-testid="checkout-empty"
      >
        <p className="text-zinc-700">Your cart is empty.</p>
        <Link
          href="/products"
          className="bg-brand-600 active:bg-brand-700 mt-4 inline-flex h-11 items-center rounded-full px-5 font-semibold text-white"
        >
          Browse products
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
      <OrderSummary items={items} quote={quote} />

      {problems.length > 0 && (
        <div
          className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200"
          data-testid="checkout-blocked"
          role="alert"
        >
          {problems.map(({ item, index, state }) => (
            <p key={item.id}>
              Item {index + 1} ({productName(item)}):{" "}
              {state === "block"
                ? "a photo is too blurry to print — make it smaller."
                : state === "missing"
                  ? "this design is no longer on this phone — remove it and design it again."
                  : "no longer available in this colour or size."}{" "}
              <Link
                href={
                  state === "block"
                    ? `/design/${item.productId}?item=${encodeURIComponent(item.id)}`
                    : "/cart"
                }
                className="font-medium underline"
              >
                {state === "block" ? "Edit design" : "Go to cart"}
              </Link>
            </p>
          ))}
        </div>
      )}
      {anyWarn && problems.length === 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          A photo may look a little soft when printed. You can still order, or
          edit the design from your{" "}
          <Link href="/cart" className="font-medium underline">
            cart
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
      <Field
        id="email"
        label="Email"
        hint="optional — for your receipt and updates"
        error={errors.email}
      >
        <input
          {...input("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
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

      {signedIn && (
        <CheckboxRow
          id="saveToAccount"
          checked={saveToAccount}
          onChange={setSaveToAccount}
        >
          Save these details to my account for next time
        </CheckboxRow>
      )}
      <CheckboxRow
        id="deliveryDifferent"
        checked={deliveryDifferent}
        onChange={setDeliveryDifferent}
      >
        Deliver to a different place (a gift, or my office)
      </CheckboxRow>
      {deliveryDifferent && (
        <fieldset
          className="flex flex-col gap-4 rounded-lg bg-white p-4 ring-1 ring-zinc-200"
          data-testid="delivery-block"
        >
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            Delivery details
          </legend>
          <Field
            id="deliveryName"
            label="Receiver’s name"
            hint="optional — if not you"
            error={errors.deliveryName}
          >
            <input {...input("deliveryName")} autoComplete="off" />
          </Field>
          <Field
            id="deliveryCity"
            label="Delivery city"
            error={errors.deliveryCity}
          >
            <CityPicker
              id="deliveryCity"
              value={values.deliveryCity}
              onChange={set("deliveryCity")}
              onCommit={setDeliveryQuoteCity}
              invalid={!!errors.deliveryCity}
              describedBy={
                errors.deliveryCity ? errorId("deliveryCity") : undefined
              }
            />
          </Field>
          <Field
            id="deliveryAddressLine"
            label="Delivery location"
            error={errors.deliveryAddressLine}
          >
            <input
              {...input("deliveryAddressLine")}
              autoComplete="off"
              placeholder="House, street, area"
            />
          </Field>
          <Field
            id="deliveryLandmark"
            label="Delivery landmark"
            hint="optional"
            error={errors.deliveryLandmark}
          >
            <input
              {...input("deliveryLandmark")}
              autoComplete="off"
              placeholder="Near the mosque, school…"
            />
          </Field>
        </fieldset>
      )}

      <dl className="grid grid-cols-2 gap-y-1 rounded-lg bg-white p-4 text-sm ring-1 ring-zinc-200">
        <dt className="text-zinc-500">Items</dt>
        <dd className="text-right" data-testid="subtotal">
          {quote ? formatPkr(quote.subtotalPkr) : "…"}
        </dd>
        <dt className="text-zinc-500">Delivery</dt>
        <dd className="text-right" data-testid="shipping">
          {quote?.shippingPkr != null
            ? formatPkr(quote.shippingPkr)
            : deliveryDifferent
              ? "Choose the delivery city"
              : "Choose your city"}
        </dd>
        <dt className="font-semibold text-zinc-900">Total</dt>
        <dd className="text-right font-semibold" data-testid="total">
          {quote?.shippingPkr != null ? formatPkr(quote.totalPkr) : "…"}
        </dd>
        <dd className="col-span-2 mt-2 text-xs text-zinc-500">
          Pay in cash when it arrives. We’ll call or message you to confirm
          before we print.
        </dd>
      </dl>

      <Consents
        contentConfirmed={contentConfirmed}
        onContentConfirmed={(v) => {
          setContentConfirmed(v);
          if (v && errors.contentConfirmed)
            setErrors((e) => ({ ...e, contentConfirmed: undefined }));
        }}
        marketingOptIn={marketingOptIn}
        onMarketingOptIn={setMarketingOptIn}
        error={errors.contentConfirmed}
      />

      {message && (
        <p className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || problems.length > 0 || !contentConfirmed}
        className="bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 h-12 rounded-full text-base font-semibold text-white"
      >
        {submitting
          ? (progress ?? "Placing order…")
          : "Place order · Cash on Delivery"}
      </button>
    </form>
  );
}

function productName(item: CartItem): string {
  return getProduct(item.productId)?.name ?? item.productId;
}

function colourName(item: CartItem): string {
  return (
    getProduct(item.productId)?.baseColors.find((c) => c.id === item.colourId)
      ?.name ?? item.colourId
  );
}

/** Each cart line with its thumbnail and server price. */
function OrderSummary({
  items,
  quote,
}: {
  items: CartItem[];
  quote: CartQuote | null;
}) {
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const keys = items.map((i) => i.designKey).join();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- thumbnails live in localStorage
    setThumbs(
      Object.fromEntries(
        items.map((i) => [i.designKey, loadThumbnail(i.designKey)]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the designs change
  }, [keys]);

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-lg bg-white p-4 ring-1 ring-zinc-200"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="summary-heading" className="font-semibold text-zinc-900">
          Your order
        </h2>
        <Link href="/cart" className="text-brand-700 text-sm underline">
          Edit cart
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-zinc-100">
        {items.map((item, i) => {
          const unit = quote?.unitPricePkr[i];
          const thumb = thumbs[item.designKey];
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 py-2"
              data-testid="checkout-line"
            >
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-zinc-100">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local data-URL thumbnail
                  <img
                    src={thumb}
                    alt=""
                    className="size-full object-contain"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-zinc-900">{productName(item)}</p>
                <p className="text-xs text-zinc-500">
                  {colourName(item)}
                  {item.size ? ` · ${item.size}` : ""} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-right text-sm" data-testid="line-price">
                {unit === undefined
                  ? "…"
                  : unit === null
                    ? "Not available"
                    : formatPkr(unit * item.quantity)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
