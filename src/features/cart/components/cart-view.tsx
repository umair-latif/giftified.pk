"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProduct } from "@/config/products";
import { loadThumbnail } from "@/features/editor/draft";
import { CityPicker } from "@/features/checkout/components/city-picker";
import { formatPkr } from "@/features/checkout/format";
import { MAX_LINE_QUANTITY, type CartItem } from "@/types/cart";
import { quoteCart, type CartQuote } from "../actions";
import { removeFromCart, updateQuantity, useCart } from "../cart";

const CITY_KEY = "giftified:city";

function readCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Cart lines, prices from the server, delivery estimate, Checkout. */
export function CartView() {
  const cart = useCart();
  const [city, setCity] = useState("");
  const [quoteCity, setQuoteCity] = useState("");
  const [quote, setQuote] = useState<CartQuote | null>(null);

  useEffect(() => {
    const saved = readCity();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setCity(saved);
    setQuoteCity(saved);
  }, []);

  const linesKey = JSON.stringify(
    cart?.map(({ productId, colourId, size, quantity }) => ({
      productId,
      colourId,
      size,
      quantity,
    })) ?? [],
  );
  useEffect(() => {
    let stale = false;
    quoteCart({ lines: JSON.parse(linesKey) as unknown, city: quoteCity })
      .then((q) => !stale && setQuote(q))
      .catch(() => !stale && setQuote(null));
    return () => {
      stale = true;
    };
  }, [linesKey, quoteCity]);

  if (cart === null)
    return <p className="mt-6 text-sm text-zinc-500">Loading your cart…</p>;

  if (cart.length === 0)
    return (
      <div
        className="mt-6 rounded-lg bg-white p-5 text-sm ring-1 ring-zinc-200"
        data-testid="cart-empty"
      >
        <p className="text-zinc-700">Your cart is empty.</p>
        <p className="mt-1 text-zinc-500">
          Design a mug with your photo and a message — it takes a minute.
        </p>
        <Link
          href="/design/mug"
          className="bg-brand-600 active:bg-brand-700 mt-4 inline-flex h-11 items-center rounded-full px-5 font-medium text-white"
        >
          Start designing
        </Link>
      </div>
    );

  const unavailable = quote?.unitPricePkr.some((p) => p === null) ?? false;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <ul className="flex flex-col gap-3" aria-label="Cart items">
        {cart.map((item, i) => (
          <CartLine
            key={item.id}
            item={item}
            unitPricePkr={quote ? quote.unitPricePkr[i] : undefined}
          />
        ))}
      </ul>

      <section
        aria-label="Order summary"
        className="rounded-lg bg-white p-4 text-sm ring-1 ring-zinc-200"
      >
        <label htmlFor="city" className="mb-1 block font-medium text-zinc-900">
          Delivery city
        </label>
        <CityPicker
          value={city}
          onChange={setCity}
          onCommit={(c) => {
            setQuoteCity(c);
            try {
              localStorage.setItem(CITY_KEY, c);
            } catch {
              /* not remembered, fine */
            }
          }}
          invalid={false}
        />
        <dl className="mt-3 grid grid-cols-2 gap-y-1 border-t border-zinc-100 pt-3">
          <dt className="text-zinc-500">Subtotal</dt>
          <dd className="text-right" data-testid="cart-subtotal">
            {quote ? formatPkr(quote.subtotalPkr) : "…"}
          </dd>
          <dt className="text-zinc-500">Delivery</dt>
          <dd className="text-right" data-testid="cart-shipping">
            {quote?.shippingPkr != null
              ? formatPkr(quote.shippingPkr)
              : "Choose your city"}
          </dd>
          <dt className="font-semibold text-zinc-900">Total</dt>
          <dd className="text-right font-semibold" data-testid="cart-total">
            {quote ? formatPkr(quote.totalPkr) : "…"}
          </dd>
        </dl>
        <p className="mt-2 text-xs text-zinc-500">
          Pay in cash when it arrives. We’ll call or message you to confirm
          before we print.
        </p>
      </section>

      {unavailable && (
        <p className="text-sm text-red-700" role="alert">
          One design can’t be ordered any more. Please remove it to continue.
        </p>
      )}
      <Link
        href="/checkout"
        aria-disabled={unavailable || undefined}
        className={`flex h-12 items-center justify-center rounded-full text-base font-semibold text-white ${
          unavailable
            ? "pointer-events-none bg-zinc-300"
            : "bg-brand-600 active:bg-brand-700"
        }`}
      >
        Checkout · Cash on Delivery
      </Link>
      <Link
        href="/design/mug"
        className="text-brand-700 text-center text-sm font-medium underline"
      >
        Design another one
      </Link>
    </div>
  );
}

function CartLine({
  item,
  unitPricePkr,
}: {
  item: CartItem;
  unitPricePkr: number | null | undefined;
}) {
  const product = getProduct(item.productId);
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setThumb(loadThumbnail(item.designKey));
  }, [item.designKey]);
  const colour =
    product?.baseColors.find((c) => c.id === item.colourId)?.name ??
    item.colourId;

  return (
    <li
      className="flex gap-3 rounded-lg bg-white p-3 ring-1 ring-zinc-200"
      data-testid="cart-line"
    >
      <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded bg-zinc-50 ring-1 ring-zinc-200">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img
            src={thumb}
            alt="Your design"
            className="size-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-zinc-400">Your design</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900">
          {product?.name ?? item.productId}
        </p>
        <p className="text-xs text-zinc-500">
          {colour}
          {item.size ? ` · ${item.size}` : ""}
        </p>
        <p className="mt-1 text-sm" data-testid="line-price">
          {unitPricePkr === undefined ? (
            "…"
          ) : unitPricePkr === null ? (
            <span className="text-red-700">Not available</span>
          ) : (
            formatPkr(unitPricePkr * item.quantity)
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex items-center" role="group" aria-label="Quantity">
            <button
              type="button"
              aria-label="One less"
              disabled={item.quantity <= 1}
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="size-9 rounded-full text-lg text-zinc-700 active:bg-zinc-100 disabled:text-zinc-300"
            >
              −
            </button>
            <output
              className="w-6 text-center text-sm"
              data-testid="line-quantity"
            >
              {item.quantity}
            </output>
            <button
              type="button"
              aria-label="One more"
              disabled={item.quantity >= MAX_LINE_QUANTITY}
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="size-9 rounded-full text-lg text-zinc-700 active:bg-zinc-100 disabled:text-zinc-300"
            >
              +
            </button>
          </div>
          <div className="flex gap-3 text-xs font-medium">
            <Link
              href={`/design/${item.productId}?item=${encodeURIComponent(item.id)}`}
              className="text-brand-700 underline"
            >
              Edit design
            </Link>
            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
              className="text-zinc-500 underline"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
