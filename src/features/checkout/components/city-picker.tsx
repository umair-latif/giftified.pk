"use client";

import { useId, useState } from "react";
import { canonicalCity, searchCities } from "@/config/cities";
import { inputClass } from "./field";

interface Props {
  value: string;
  onChange: (city: string) => void;
  /** Called when the customer picks a city or leaves the field (for the shipping quote). */
  onCommit: (city: string) => void;
  invalid: boolean;
  describedBy?: string;
}

/**
 * Searchable city field: type to filter the 30 largest cities, tap one to pick
 * it, or keep what you typed ("Other") if your city isn't listed.
 */
export function CityPicker({
  value,
  onChange,
  onCommit,
  invalid,
  describedBy,
}: Props) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const matches = searchCities(value);
  const typed = value.trim();
  const isKnown = typed !== "" && canonicalCity(typed) !== typed;
  const exact = matches.some((c) => c === typed);
  const pick = (city: string) => {
    onChange(city);
    onCommit(city);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        id="city"
        name="city"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="address-level2"
        placeholder="Search your city"
        className={inputClass(invalid)}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          const city = canonicalCity(value);
          if (city !== value) onChange(city);
          onCommit(city);
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Cities"
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-zinc-200"
          // Keep focus in the input so the tap lands on the option.
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((city) => (
            <li
              key={city}
              role="option"
              aria-selected={city === typed}
              className="hover:bg-brand-50 active:bg-brand-50 flex min-h-11 items-center px-4 text-base text-zinc-900"
              onClick={() => pick(city)}
            >
              {city}
            </li>
          ))}
          {typed.length >= 2 && !exact && !isKnown && (
            <li
              role="option"
              aria-selected={false}
              className="text-brand-700 hover:bg-brand-50 active:bg-brand-50 flex min-h-11 items-center px-4 text-base"
              onClick={() => pick(typed)}
            >
              Other: use “{typed}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
