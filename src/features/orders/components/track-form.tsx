"use client";

import { useActionState } from "react";
import {
  describedById,
  errorId,
  Field,
  inputClass,
  noteId,
} from "@/features/checkout/components/field";
import { whatsappUrl } from "@/config/site";
import { trackOrderAction } from "../actions";
import type { TrackState } from "../track";
import { buttonClass } from "@/components/ui/button";

const initial: TrackState = { status: "idle" };

/** Order number + mobile → Server Action → redirect to the private order link. */
export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, initial);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const message = state.status === "error" ? state.message : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="card flex flex-col gap-4 p-4" noValidate>
      <Field
        id="track-order"
        label="Order number"
        description="On your confirmation screen and message"
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
          aria-describedby={[
            describedById("track-order"),
            fieldErrors?.orderNumber ? errorId("track-order") : "",
          ]
            .filter(Boolean)
            .join(" ")}
          className={inputClass(!!fieldErrors?.orderNumber)}
        />
      </Field>
      <Field
        id="track-phone"
        label="Mobile number"
        description="The one you ordered with · e.g. 0300 1234567"
        note="Only used to find your order."
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
          aria-describedby={[
            describedById("track-phone"),
            noteId("track-phone"),
            fieldErrors?.phone ? errorId("track-phone") : "",
          ]
            .filter(Boolean)
            .join(" ")}
          className={inputClass(!!fieldErrors?.phone)}
        />
      </Field>
      {message && (
        <p
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          role="alert"
          data-testid="track-error"
        >
          {message}{" "}
          {whatsappUrl() && (
            <a
              href={whatsappUrl("Assalam o Alaikum! I can't find my order.")!}
              className="font-semibold underline"
            >
              Chat on WhatsApp
            </a>
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={buttonClass("primary")}
      >
        {pending ? "Checking…" : "Show my order"}
      </button>
    </form>
  );
}
