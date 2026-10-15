"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { canonicalCity, cityKey, searchCities } from "@/config/cities";
import { feeFor, type DeliveryRates } from "@/lib/delivery";
import { formatPkr } from "../format";
import { useDeliveryRates } from "../use-delivery-rates";
import { inputClass } from "./field";

interface Props {
  /** Input id/name; "city" by default. */
  id?: string;
  value: string;
  onChange: (city: string) => void;
  /** Called when the customer picks a city or leaves the field (for the delivery fee). */
  onCommit: (city: string) => void;
  invalid: boolean;
  /** Extra ids for aria-describedby (an error message, a result line). */
  describedBy?: string;
  /** Delivery rates rendered on the server; otherwise loaded on first use. */
  rates?: DeliveryRates | null;
}

interface Row {
  city: string;
  /** The shopper's own text (always first): "Deliver to Khanewal". */
  own: boolean;
}

/**
 * The city field (product page delivery box and checkout). Any text is a valid
 * city: suggestions help but never limit, and the first suggestion is always
 * what the shopper typed ("Deliver to Khanewal · Rs 300"). Never "no results".
 * ARIA combobox: arrow keys move, Enter picks, Escape closes.
 */
export function CityPicker({
  id = "city",
  value,
  onChange,
  onCommit,
  invalid,
  describedBy,
  rates: initialRates,
}: Props) {
  const rates = useDeliveryRates(initialRates);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const hintId = `${id}-hint`;
  const rateCities = rates?.cities.map((c) => c.city) ?? [];
  const typed = value.trim();
  const own = typed ? canonicalCity(typed, rateCities) : "";
  const suggestions = searchCities(typed, rateCities).filter(
    (c) => cityKey(c) !== cityKey(own),
  );
  const rows: Row[] = [
    ...(own ? [{ city: own, own: true }] : []),
    ...suggestions.slice(0, 8).map((city) => ({ city, own: false })),
  ];
  const fee = (city: string) => {
    if (!rates) return null;
    const pkr = feeFor(city, rates).shippingPkr;
    return pkr === null ? null : formatPkr(pkr);
  };
  const otherFee =
    rates?.otherCitiesPkr != null ? formatPkr(rates.otherCitiesPkr) : null;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const pick = (city: string) => {
    onChange(city);
    onCommit(city);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (!open) return;
      const row = rows[active] ?? rows[0];
      if (row) {
        e.preventDefault();
        pick(row.city);
      }
    } else if (e.key === "Escape") {
      if (open) e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? optionId(active) : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
        autoComplete={id === "city" ? "address-level2" : "off"}
        placeholder="Type your city or town"
        className={inputClass(invalid)}
        value={value}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          if (!typed) return;
          if (own !== value) onChange(own);
          onCommit(own);
        }}
      />
      <p id={hintId} className="text-ink/70 mt-1 text-sm">
        We deliver to every city and town in Pakistan.
      </p>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Delivery city"
          className="border-ink absolute inset-x-0 top-12 z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 bg-white py-1"
          // Keep focus in the input so the tap lands on the option.
          onMouseDown={(e) => e.preventDefault()}
        >
          {!own && (
            <li
              role="presentation"
              className="text-ink/70 flex min-h-11 items-center px-4 text-sm"
              data-testid="city-anywhere"
            >
              Anywhere else in Pakistan{otherFee ? ` · ${otherFee}` : ""}
            </li>
          )}
          {rows.map((row, i) => (
            <li
              key={`${row.own ? "own-" : ""}${row.city}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={`text-ink flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-base ${
                i === active ? "bg-soft" : "hover:bg-soft active:bg-soft"
              }`}
              onClick={() => pick(row.city)}
              data-testid={row.own ? "city-own" : undefined}
            >
              <span className="min-w-0 truncate">
                {row.own ? (
                  <>
                    Deliver to{" "}
                    <strong className="font-semibold">{row.city}</strong>
                  </>
                ) : (
                  row.city
                )}
              </span>
              {fee(row.city) && (
                <span className="text-ink/70 shrink-0 text-sm">
                  {fee(row.city)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
