"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import {
  errorId,
  Field,
  inputClass,
} from "@/features/checkout/components/field";
import { CityPicker } from "@/features/checkout/components/city-picker";
import {
  deleteAccountAction,
  saveAddressAction,
  saveProfileAction,
  sendPasswordLinkAction,
} from "../actions";
import { DELETE_CONFIRM_WORD, type FormState } from "../schema";
import { buttonClass } from "@/components/ui/button";

const idle: FormState = { status: "idle" };
const card =
  "flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200";
/** Inside a card already (mobile account home): no frame of its own. */
const plain = "flex flex-col gap-4";
const frame = (framed: boolean) => (framed ? card : plain);
const primary = buttonClass("primary");
const secondary = buttonClass("secondary");

/**
 * Submits a form to its Server Action WITHOUT React's automatic form reset.
 * With `<form action>`, React resets uncontrolled fields after a successful
 * action, back to the values the page was first rendered with — so a ticked
 * box un-ticked itself and a changed address showed the old one after
 * "Saved.". Here the fields keep exactly what the customer saved.
 */
function submitWithoutReset(dispatch: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}

function Input({
  id,
  label,
  hint,
  placeholder,
  defaultValue,
  error,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string | undefined;
  error?: string | undefined;
  autoComplete: string;
  inputMode?: "tel" | "text";
}) {
  return (
    <Field
      id={id}
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? errorId(id) : undefined}
        className={inputClass(!!error)}
      />
    </Field>
  );
}

function Status({ state, saved }: { state: FormState; saved: string }) {
  if (state.status === "saved" || state.status === "sent")
    return (
      <p
        className="text-sm text-emerald-700"
        role="status"
        data-testid="form-saved"
      >
        {saved}
      </p>
    );
  if (state.status === "error" && state.message)
    return (
      <p
        className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200"
        role="alert"
      >
        {state.message}
      </p>
    );
  return null;
}

/** /account/addresses: the default delivery address, used to fill checkout. */
export function AddressForm({
  initial,
  framed = true,
}: {
  framed?: boolean;
  initial: {
    phone?: string;
    city?: string;
    addressLine?: string;
    landmark?: string;
  };
}) {
  const [state, action, pending] = useActionState(saveAddressAction, idle);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [city, setCity] = useState(v.city ?? initial.city ?? "");
  return (
    <form
      onSubmit={submitWithoutReset(action)}
      className={frame(framed)}
      noValidate
      data-testid="address-form"
    >
      <Input
        id="phone"
        label="Mobile number"
        hint="for delivery and order calls"
        autoComplete="tel"
        inputMode="tel"
        defaultValue={v.phone ?? initial.phone}
        error={e.phone}
      />
      <Field id="city" label="City" {...(e.city ? { error: e.city } : {})}>
        <CityPicker
          value={city}
          onChange={setCity}
          onCommit={setCity}
          invalid={!!e.city}
          {...(e.city ? { describedBy: errorId("city") } : {})}
        />
      </Field>
      <Input
        id="addressLine"
        label="Address"
        hint="house, street, area"
        autoComplete="street-address"
        defaultValue={v.addressLine ?? initial.addressLine}
        error={e.addressLine}
      />
      <Input
        id="landmark"
        label="Additional info"
        placeholder="Landmark, floor, nearby mosque or school…"
        hint="optional"
        autoComplete="off"
        defaultValue={v.landmark ?? initial.landmark}
        error={e.landmark}
      />
      <Status state={state} saved="Saved. Checkout will use this address." />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}

/** /account/profile: name and the marketing preference (email can't be changed here). */
export function ProfileForm({
  initial,
  framed = true,
}: {
  framed?: boolean;
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    marketingOptIn: boolean;
  };
}) {
  const [state, action, pending] = useActionState(saveProfileAction, idle);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  return (
    <form
      onSubmit={submitWithoutReset(action)}
      className={frame(framed)}
      noValidate
      data-testid="profile-form"
    >
      <Input
        id="firstName"
        label="First name"
        autoComplete="given-name"
        defaultValue={v.firstName ?? initial.firstName}
        error={e.firstName}
      />
      <Input
        id="lastName"
        label="Last name"
        hint="optional"
        autoComplete="family-name"
        defaultValue={v.lastName ?? initial.lastName}
        error={e.lastName}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-800">Email</span>
        <p className="text-ink" data-testid="profile-email">
          {initial.email}
        </p>
        <p className="text-xs text-zinc-500">
          To change your email, message us from the Contact page.
        </p>
      </div>
      <label className="flex items-start gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="marketingOptIn"
          defaultChecked={initial.marketingOptIn}
          className="accent-brand-600 mt-0.5 size-5 shrink-0"
          data-testid="profile-marketing"
        />
        <span>
          Send me offers and discounts by SMS, WhatsApp or email. You can change
          this any time.
        </span>
      </label>
      <Status state={state} saved="Saved." />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

/** Emails a link to choose a new password (the same link as "Forgot password"). */
export function PasswordLinkForm({
  email,
  framed = true,
}: {
  email: string;
  framed?: boolean;
}) {
  const [state, action, pending] = useActionState(sendPasswordLinkAction, idle);
  return (
    <form action={action} className={frame(framed)}>
      <div>
        <h2 className="text-ink font-semibold">Password</h2>
        <p className="text-sm text-zinc-600">
          We’ll email a link to {email} to choose a new password. It works for 1
          hour.
        </p>
      </div>
      <Status state={state} saved={`Sent. Check ${email}.`} />
      <button type="submit" disabled={pending} className={secondary}>
        {pending ? "Sending…" : "Email me a password link"}
      </button>
    </form>
  );
}

/** Deletes the account, saved designs and their photos (after typing DELETE). */
export function DeleteAccountForm({ framed = true }: { framed?: boolean }) {
  const [state, action, pending] = useActionState(deleteAccountAction, idle);
  const [open, setOpen] = useState(false);
  const error = state.fieldErrors?.confirm;
  return (
    <section className={frame(framed)} aria-labelledby="delete-account">
      <div>
        <h2 id="delete-account" className="font-semibold text-red-700">
          Delete my account
        </h2>
        <p className="text-sm text-zinc-600">
          Deletes your account, your saved designs and all their photos. Records
          of past orders are kept for accounting (see our privacy notice). This
          can’t be undone.
        </p>
      </div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 rounded-full border border-red-200 bg-white font-semibold text-red-700 hover:bg-red-50"
          data-testid="delete-account-start"
        >
          Delete my account
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-3" noValidate>
          <Field
            id="confirm"
            label={`Type ${DELETE_CONFIRM_WORD} to confirm`}
            {...(error ? { error } : {})}
          >
            <input
              id="confirm"
              name="confirm"
              autoComplete="off"
              autoCapitalize="characters"
              aria-invalid={!!error}
              aria-describedby={error ? errorId("confirm") : undefined}
              className={inputClass(!!error)}
            />
          </Field>
          <Status state={state} saved="" />
          <button
            type="submit"
            disabled={pending}
            className="h-12 rounded-full bg-red-700 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            data-testid="delete-account-confirm"
          >
            {pending ? "Deleting…" : "Delete my account for good"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={secondary}
          >
            Keep my account
          </button>
        </form>
      )}
    </section>
  );
}
