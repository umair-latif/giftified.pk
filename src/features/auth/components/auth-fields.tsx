"use client";

import { useState, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import {
  errorId,
  Field,
  inputClass,
} from "@/features/checkout/components/field";
import type { AuthState } from "../schema";

/** Values and errors from the last submit, in the shape the inputs need. */
export function useAuthView(state: AuthState) {
  return {
    fieldErrors: state.status === "error" ? state.fieldErrors : undefined,
    message: state.status === "error" ? state.message : undefined,
    values: state.status === "error" ? state.values : undefined,
  };
}

export function TextField({
  id,
  name,
  label,
  hint,
  type = "text",
  autoComplete,
  defaultValue,
  error,
  inputMode,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  defaultValue?: string | undefined;
  error?: string | undefined;
  inputMode?: "email" | "text";
}) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const input = (
    <input
      id={id}
      name={name}
      type={isPassword && shown ? "text" : type}
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      inputMode={inputMode}
      required
      maxLength={isPassword ? 128 : 254}
      aria-invalid={!!error}
      aria-describedby={error ? errorId(id) : undefined}
      autoCapitalize={type === "text" ? "words" : "none"}
      spellCheck={false}
      className={`${inputClass(!!error)} ${isPassword ? "pr-12" : ""}`}
    />
  );
  return (
    <Field
      id={id}
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            aria-controls={id}
            className="absolute top-0 right-0 grid size-12 place-items-center rounded-full text-zinc-500 active:text-zinc-900"
            data-testid={`${id}-toggle`}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

export function FormMessage({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
      role="alert"
      data-testid="auth-error"
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
}: {
  pending: boolean;
  children: ReactNode;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:hover:bg-brand-600 h-12 rounded-full font-semibold text-white disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export const formClass =
  "flex flex-col gap-4 rounded-lg bg-white p-4 ring-1 ring-zinc-200";
