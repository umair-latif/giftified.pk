import type { DpiStatus } from "@/lib/dpi";

const COPY: Record<
  DpiStatus,
  { label: string; hint: string; className: string }
> = {
  ok: {
    label: "Sharp print",
    hint: "",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  warn: {
    label: "May look soft",
    hint: "Make the photo a little smaller for a sharper print.",
    className: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  block: {
    label: "Too blurry to print",
    hint: "Make the photo smaller, or use a larger photo.",
    className: "bg-red-50 text-red-800 ring-red-200",
  },
};

/** Live print-quality indicator for the selected photo (effective DPI at its current size). */
export function PrintQualityBadge({
  dpi,
  status,
}: {
  dpi: number;
  status: DpiStatus;
}) {
  const c = COPY[status];
  return (
    <div
      role="status"
      data-testid="dpi-badge"
      data-status={status}
      className={`rounded-md px-3 py-2 text-xs ring-1 ${c.className}`}
    >
      <span className="font-semibold">{c.label}</span> · {dpi} DPI
      {c.hint && <span className="block">{c.hint}</span>}
    </div>
  );
}
