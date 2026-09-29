/**
 * Where to go after signing in. Only a path on this site is allowed —
 * anything else (other hosts, `//evil.com`, `/\evil.com`, `javascript:`) falls
 * back to `fallback`, so a crafted `?next=` can't send customers elsewhere.
 */
export function safeNextPath(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || next.length > 200) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  // Auth pages themselves would loop.
  if (/^\/(sign-in|sign-up|reset-password)(\/|\?|$)/.test(next))
    return fallback;
  return next;
}
