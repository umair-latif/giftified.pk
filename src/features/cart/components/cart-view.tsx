"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProduct } from "@/config/products";
import { loadThumbnail } from "@/features/editor/draft";
import { CityPicker } from "@/features/checkout/components/city-picker";
import { formatPkr } from "@/features/checkout/format";
import { MAX_LINE_QUANTITY, type CartItem } from "@/types/cart";
import {
  cartVariants,
  quoteCart,
  type CartQuote,
  type CartVariants,
} from "../actions";
import { readCoupon, writeCoupon } from "../coupon-storage";
import { CouponBox } from "./coupon-box";
import { changeSize, removeFromCart, updateQuantity, useCart } from "../cart";
import {
  sizeOptionsFor,
  type SizeOption,
} from "@/features/editor/components/size-picker";
import { buttonClass } from "@/components/ui/button";

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
  // The store's sizes per product, for the size picker on apparel lines.
  const [variants, setVariants] = useState<CartVariants>({});
  useEffect(() => {
    let stale = false;
    cartVariants()
      .then((v) => !stale && setVariants(v))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, []);
  const [city, setCity] = useState("");
  const [quoteCity, setQuoteCity] = useState("");
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [coupon, setCoupon] = useState("");

  useEffect(() => {
    const saved = readCity();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setCity(saved);
    setQuoteCity(saved);
    setCoupon(readCoupon());
  }, []);

  const linesKey = JSON.stringify(
    cart?.map(({ productId, colourId, size, quantity, templateId }) => ({
      productId,
      colourId,
      size,
      quantity,
      templateId,
    })) ?? [],
  );
  useEffect(() => {
    let stale = false;
    quoteCart({
      lines: JSON.parse(linesKey) as unknown,
      city: quoteCity,
      ...(coupon ? { couponCode: coupon } : {}),
    })
      .then((q) => {
        if (stale) return;
        setQuote(q);
        // Only an accepted code is remembered for checkout.
        if (coupon) writeCoupon(q?.couponCode ? coupon : "");
      })
      .catch(() => !stale && setQuote(null));
    return () => {
      stale = true;
    };
  }, [linesKey, quoteCity, coupon]);

  if (cart === null)
    return <p className="text-ink/65 mt-6 text-sm">Loading your cart…</p>;

  if (cart.length === 0)
    return (
      <div className="card mt-6 p-5 text-sm" data-testid="cart-empty">
        <p className="text-ink/80">Your cart is empty.</p>
        <p className="text-ink/65 mt-1">
          Pick a mug, T-shirt or hoodie and add your photos and words — it takes
          a minute.
        </p>
        <Link href="/products" className={buttonClass("primary", "mt-4")}>
          Start designing
        </Link>
      </div>
    );

  const unavailable = quote?.unitPricePkr.some((p) => p === null) ?? false;

  return (
    <div className="mt-4 flex max-w-2xl flex-col gap-4 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-8">
      <ul className="flex flex-col gap-3" aria-label="Cart items">
        {cart.map((item, i) => (
          <CartLine
            key={item.id}
            item={item}
            unitPricePkr={quote ? quote.unitPricePkr[i] : undefined}
            sizes={sizeOptionsFor(
              variants[item.productId] ?? [],
              item.colourId,
            )}
            title={quote?.lineTitles[i] ?? undefined}
          />
        ))}
      </ul>

      {/* Summary column (from lg); on phones the wrapper dissolves and everything stacks. */}
      <div className="contents lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4">
        <section aria-label="Order summary" className="card p-4 text-sm">
          <label htmlFor="city" className="text-ink mb-1 block font-semibold">
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
          <div className="border-ink/10 mt-3 border-t pt-3">
            <CouponBox
              {...(quote?.couponCode ? { appliedCode: quote.couponCode } : {})}
              discountPkr={quote?.discountPkr ?? 0}
              {...(coupon && quote?.couponError
                ? { error: quote.couponError }
                : {})}
              onApply={setCoupon}
              onRemove={() => {
                setCoupon("");
                writeCoupon("");
              }}
            />
          </div>
          <dl className="border-ink/10 mt-3 grid grid-cols-2 gap-y-1 border-t pt-3">
            <dt className="text-ink/65">Subtotal</dt>
            <dd className="text-right" data-testid="cart-subtotal">
              {quote ? formatPkr(quote.subtotalPkr) : "…"}
            </dd>
            {quote && quote.discountPkr > 0 && (
              <>
                <dt className="text-ink/65">Coupon</dt>
                <dd className="text-right" data-testid="cart-discount">
                  −{formatPkr(quote.discountPkr)}
                </dd>
              </>
            )}
            <dt className="text-ink/65">Delivery</dt>
            <dd className="text-right" data-testid="cart-shipping">
              {quote?.shippingPkr != null
                ? formatPkr(quote.shippingPkr)
                : "Choose your city"}
            </dd>
            <dt className="text-ink font-semibold">Total</dt>
            <dd
              className="text-accent-text text-right font-semibold"
              data-testid="cart-total"
            >
              {quote ? formatPkr(quote.totalPkr) : "…"}
            </dd>
          </dl>
          <p className="text-ink/65 mt-2 text-xs">
            Pay in cash when it arrives. We’ll contact you to confirm before we
            print.
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
          className={buttonClass("primary")}
        >
          Checkout · Cash on Delivery
        </Link>
        <Link
          href="/products"
          className="text-accent-text hover:text-deep rounded-xl text-center text-sm font-semibold underline"
        >
          Design another one
        </Link>
      </div>
    </div>
  );
}

function CartLine({
  item,
  unitPricePkr,
  sizes,
  title,
}: {
  item: CartItem;
  unitPricePkr: number | null | undefined;
  /** Sizes on offer for this product in the line's colour (none for mugs). */
  sizes: readonly SizeOption[];
  /** Ready-made design title (design products). */
  title?: string;
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
    <li className="card flex gap-3 p-3" data-testid="cart-line">
      <div className="bg-page ring-ink/15 grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl ring-1">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img
            src={thumb}
            alt="Your design"
            className="size-full object-contain"
          />
        ) : (
          <span className="text-ink/60 text-xs">Your design</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-ink font-semibold" data-testid="line-title">
          {title ?? product?.name ?? item.productId}
        </p>
        <p className="text-ink/65 text-xs">
          {title ? `${product?.name ?? item.productId} · ` : ""}
          {colour}
          {item.size && sizes.length === 0 ? ` · ${item.size}` : ""}
        </p>
        {sizes.length > 0 && (
          // Change the size right here: no need to open the designer for it.
          <label className="text-ink/70 mt-1 flex items-center gap-2 text-xs">
            Size
            <select
              value={item.size ?? ""}
              onChange={(e) => changeSize(item.id, e.target.value)}
              data-testid="line-size"
              className="border-ink/25 text-ink h-9 rounded-xl border bg-white px-2 text-sm"
            >
              {!item.size && (
                <option value="" disabled>
                  Choose
                </option>
              )}
              {sizes.map((s) => (
                <option
                  key={s.size}
                  value={s.size}
                  disabled={!s.inStock && s.size !== item.size}
                >
                  {s.size}
                  {s.inStock ? "" : " (sold out)"}
                </option>
              ))}
            </select>
          </label>
        )}
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
              className="text-ink/80 hover:bg-soft active:bg-soft disabled:text-ink/40 size-9 rounded-full text-lg disabled:hover:bg-transparent"
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
              className="text-ink/80 hover:bg-soft active:bg-soft disabled:text-ink/40 size-9 rounded-full text-lg disabled:hover:bg-transparent"
            >
              +
            </button>
          </div>
          <div className="flex gap-3 text-xs font-semibold">
            <Link
              href={`/design/${item.productId}?item=${encodeURIComponent(item.id)}`}
              className="text-accent-text hover:text-deep rounded-xl underline"
            >
              {/* A ready-made design is fine as it is; changing it is optional. */}
              {item.templateId ? "Customise" : "Edit design"}
            </Link>
            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
              className="text-ink/65 hover:text-ink rounded-xl underline"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
