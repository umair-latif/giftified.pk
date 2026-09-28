import { normalizePkMobile } from "@/lib/phone";
import type { CommerceClient } from "@/lib/commerce/types";
import type { Order } from "@/types/order";
import type { RateLimiter } from "./rate-limit";

/**
 * Guest order lookup behind `/track` (order number + mobile → private status
 * link). Framework-free so it can be unit-tested; `actions.ts` wires it to
 * the request (IP, redirect).
 *
 * Security:
 * - "No such order" and "wrong phone" give the SAME message and take the same
 *   minimum time, so the form can't be used to find out which numbers exist.
 * - Failed lookups are rate-limited per IP; the limit is checked BEFORE the
 *   store is asked, so a limited client learns nothing more.
 */

export const TRACK_LIMIT = 10;
export const TRACK_WINDOW_MS = 60 * 60 * 1000;
/** Every failed lookup takes at least this long (slows guessing, hides timing). */
export const TRACK_FAILURE_MIN_MS = 1000;

export const NOT_FOUND_MESSAGE =
  "We couldn’t find an order with that number and mobile number. Please check both and try again.";
export const TOO_MANY_MESSAGE =
  "Too many tries. Please wait an hour, or message us on WhatsApp and we’ll help.";
export const UNAVAILABLE_MESSAGE =
  "We couldn’t check your order just now. Please try again in a minute.";

export interface TrackFieldErrors {
  orderNumber?: string;
  phone?: string;
}

export type TrackState =
  | { status: "idle" }
  | {
      status: "error";
      message?: string;
      fieldErrors?: TrackFieldErrors;
      /** What was typed, so the form can show it again after React resets it. */
      values: { orderNumber: string; phone: string };
    };

export type TrackResult =
  | { ok: true; order: Order }
  | { ok: false; message?: string; fieldErrors?: TrackFieldErrors };

export interface TrackDeps {
  commerce: Pick<CommerceClient, "findOrderForTracking">;
  limiter: RateLimiter;
  /** Rate-limit key, normally the client IP. */
  clientKey: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  minFailureMs?: number;
}

/** "#1234", " 1234 " → 1234. Null for anything else. */
export function parseOrderNumber(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const s = input.trim().replace(/^#\s*/, "");
  return /^\d{1,12}$/.test(s) ? Number(s) : null;
}

export async function trackOrder(
  input: { orderNumber: unknown; phone: unknown },
  deps: TrackDeps,
): Promise<TrackResult> {
  const now = deps.now ?? Date.now;
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const started = now();

  const id = parseOrderNumber(input.orderNumber);
  const phone =
    typeof input.phone === "string" && input.phone.length <= 30
      ? normalizePkMobile(input.phone)
      : null;
  if (id === null || phone === null) {
    const fieldErrors: TrackFieldErrors = {};
    if (id === null)
      fieldErrors.orderNumber =
        "Please enter your order number, e.g. 1234 (it’s in your confirmation).";
    if (phone === null)
      fieldErrors.phone =
        "Please enter the Pakistani mobile number you ordered with, e.g. 0300 1234567.";
    return { ok: false, fieldErrors };
  }

  if (deps.limiter.isLimited(deps.clientKey))
    return { ok: false, message: TOO_MANY_MESSAGE };

  let order: Order | null;
  try {
    order = await deps.commerce.findOrderForTracking(id, phone);
  } catch (err) {
    console.error("[track] lookup failed", err);
    return { ok: false, message: UNAVAILABLE_MESSAGE };
  }
  if (order) return { ok: true, order };

  deps.limiter.hit(deps.clientKey);
  const wait = (deps.minFailureMs ?? TRACK_FAILURE_MIN_MS) - (now() - started);
  if (wait > 0) await sleep(wait);
  return { ok: false, message: NOT_FOUND_MESSAGE };
}

/**
 * Client IP for rate limiting. `x-real-ip` / the first `x-forwarded-for`
 * entry are set by the hosting proxy (Vercel and most CDNs overwrite them).
 * On a host that passes client-supplied X-Forwarded-For through untouched,
 * this is spoofable — revisit when choosing the host.
 */
export function clientKeyFromHeaders(h: Headers): string {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const first = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}
