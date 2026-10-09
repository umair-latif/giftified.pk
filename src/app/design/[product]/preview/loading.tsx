import { AppHeader } from "@/components/ui/app-header";
import { StepBar } from "@/components/ui/step-bar";

/**
 * Preview renders on request (sizes come from the store): show its header and
 * step bar at once, with the product picture as a placeholder, so tapping
 * "Preview" responds immediately.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true">
      <AppHeader title="Preview" />
      <StepBar current="Preview" />
      <div className="mx-auto w-full max-w-md flex-1 animate-pulse px-4 py-4 motion-reduce:animate-none">
        <div className="aspect-square rounded-2xl bg-zinc-200" />
        <div className="mt-4 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="size-14 rounded-xl bg-zinc-200" />
          ))}
        </div>
        <div className="mt-6 h-12 rounded-2xl bg-zinc-200" />
      </div>
      <span className="sr-only">Loading the preview…</span>
    </div>
  );
}
