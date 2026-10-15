import type { ReactNode } from "react";

export const inputClass = (invalid: boolean) =>
  `block h-12 w-full rounded-xl border-2 bg-white px-3 text-base text-ink placeholder:text-ink/60 focus:border-ink ${
    invalid ? "border-red-500" : "border-ink"
  }`;

/** Label + control + inline error. The control must use `id` and `errorId(id)`. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-ink text-sm font-semibold">
        {label}
        {hint && <span className="text-ink/65 font-normal"> · {hint}</span>}
      </label>
      {children}
      {error && (
        <p id={errorId(id)} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const errorId = (id: string) => `${id}-error`;
