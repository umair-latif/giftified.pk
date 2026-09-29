"use client";

import { useActionState } from "react";
import { signUpAction } from "../actions";
import { PASSWORD_MIN, type AuthState } from "../schema";
import {
  FormMessage,
  formClass,
  SubmitButton,
  TextField,
  useAuthView,
} from "./auth-fields";

const initial: AuthState = { status: "idle" };

export function SignUpForm({ next }: { next?: string | undefined }) {
  const [state, action, pending] = useActionState(signUpAction, initial);
  const { fieldErrors, message, values } = useAuthView(state);
  return (
    <form action={action} className={formClass} noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        id="su-name"
        name="name"
        label="Your name"
        autoComplete="name"
        defaultValue={values?.name}
        error={fieldErrors?.name}
      />
      <TextField
        id="su-email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={values?.email}
        error={fieldErrors?.email}
      />
      <TextField
        id="su-password"
        name="password"
        label="Password"
        hint={`at least ${PASSWORD_MIN} characters`}
        type="password"
        autoComplete="new-password"
        error={fieldErrors?.password}
      />
      <FormMessage>{message}</FormMessage>
      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
