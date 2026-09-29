"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "../actions";
import type { AuthState } from "../schema";
import {
  FormMessage,
  formClass,
  SubmitButton,
  TextField,
  useAuthView,
} from "./auth-fields";

const initial: AuthState = { status: "idle" };

export function SignInForm({ next }: { next?: string | undefined }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  const { fieldErrors, message, values } = useAuthView(state);
  return (
    <form action={action} className={formClass} noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        id="si-email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={values?.email}
        error={fieldErrors?.email}
      />
      <TextField
        id="si-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={fieldErrors?.password}
      />
      <FormMessage>{message}</FormMessage>
      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
      <Link
        href="/reset-password"
        className="text-brand-700 text-center text-sm font-medium"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
