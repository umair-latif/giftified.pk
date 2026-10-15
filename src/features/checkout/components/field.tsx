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
  description,
  note,
  error,
  children,
}: {
  id: string;
  label: string;
  /** Short aside inside the label ("optional"). */
  hint?: string;
  /** Help on its own line under the label; the control should use `describedById(id)`. */
  description?: string;
  /** Small print under the control (e.g. what the number is used for); `noteId(id)`. */
  note?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-ink text-sm font-semibold">
        {label}
        {hint && <span className="text-ink/65 font-normal"> · {hint}</span>}
      </label>
      {description && (
        <p id={describedById(id)} className="text-ink/70 -mt-0.5 text-sm">
          {description}
        </p>
      )}
      {children}
      {note && (
        <p id={noteId(id)} className="text-ink/70 text-sm">
          {note}
        </p>
      )}
      {error && (
        <p id={errorId(id)} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const errorId = (id: string) => `${id}-error`;
export const describedById = (id: string) => `${id}-hint`;
export const noteId = (id: string) => `${id}-note`;
