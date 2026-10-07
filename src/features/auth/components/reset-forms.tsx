"use client";

import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction } from "../actions";
import { PASSWORD_MIN, type AuthState } from "../schema";
import {
  FormMessage,
  formClass,
  SubmitButton,
  TextField,
  useAuthView,
} from "./auth-fields";

const initial: AuthState = { status: "idle" };

/** Step 1: ask for the link. The answer never says whether the email has an account. */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    forgotPasswordAction,
    initial,
  );
  const { fieldErrors, values } = useAuthView(state);
  if (state.status === "sent")
    return (
      <p
        className="card p-4 text-sm text-zinc-700"
        role="status"
        data-testid="reset-sent"
      >
        If there is an account with that email, we have sent a link to reset the
        password. It works for 1 hour. Check your spam folder too.
      </p>
    );
  return (
    <form action={action} className={formClass} noValidate>
      <TextField
        id="fp-email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={values?.email}
        error={fieldErrors?.email}
      />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Email me a reset link
      </SubmitButton>
    </form>
  );
}

/** Step 2: the emailed link opens this with `?token=`. */
export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const { fieldErrors, message } = useAuthView(state);
  return (
    <form action={action} className={formClass} noValidate>
      <input type="hidden" name="token" value={token} />
      <TextField
        id="np-password"
        name="password"
        label="New password"
        hint={`at least ${PASSWORD_MIN} characters`}
        type="password"
        autoComplete="new-password"
        error={fieldErrors?.password}
      />
      <FormMessage>{message}</FormMessage>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
