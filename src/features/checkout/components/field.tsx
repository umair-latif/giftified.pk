import type { ReactNode } from "react";

export const inputClass = (invalid: boolean) =>
  `block h-12 w-full rounded-lg border bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none ${
    invalid ? "border-red-500" : "border-zinc-300"
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
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
        {hint && <span className="font-normal text-zinc-500"> · {hint}</span>}
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
