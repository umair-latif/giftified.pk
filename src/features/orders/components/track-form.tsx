"use client";

import { useActionState } from "react";
import {
  errorId,
  Field,
  inputClass,
} from "@/features/checkout/components/field";
import { trackOrderAction } from "../actions";
import type { TrackState } from "../track";

const initial: TrackState = { status: "idle" };

/** Order number + mobile → Server Action → redirect to the private order link. */
export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, initial);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const message = state.status === "error" ? state.message : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg bg-white p-4 ring-1 ring-zinc-200"
      noValidate
    >
      <Field
        id="track-order"
        label="Order number"
        hint="from your confirmation"
        error={fieldErrors?.orderNumber}
      >
        <input
          id="track-order"
          name="orderNumber"
          defaultValue={values?.orderNumber}
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 1234"
          maxLength={14}
          required
          aria-invalid={!!fieldErrors?.orderNumber}
          aria-describedby={
            fieldErrors?.orderNumber ? errorId("track-order") : undefined
          }
          className={inputClass(!!fieldErrors?.orderNumber)}
        />
      </Field>
      <Field
        id="track-phone"
        label="Mobile number"
        hint="the one you ordered with"
        error={fieldErrors?.phone}
      >
        <input
          id="track-phone"
          name="phone"
          defaultValue={values?.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          maxLength={20}
          required
          aria-invalid={!!fieldErrors?.phone}
          aria-describedby={
            fieldErrors?.phone ? errorId("track-phone") : undefined
          }
          className={inputClass(!!fieldErrors?.phone)}
        />
      </Field>
      {message && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          role="alert"
          data-testid="track-error"
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-brand-600 active:bg-brand-700 h-12 rounded-full font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Checking…" : "Show my order"}
      </button>
    </form>
  );
}
