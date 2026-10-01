import "server-only";
import type { Customer } from "@/lib/commerce";
import { getSessionCustomer } from "@/server/auth/cookies";

/**
 * Who is a designer (may publish designs and manage sample photos): signed-in
 * customers whose email is listed in `DESIGNER_EMAILS` (or the older name
 * `TEMPLATE_EDITOR_EMAILS`; comma-separated, case-insensitive). Adding a
 * person = adding their email there and redeploying. This is the one place
 * that decides it; when the list outgrows an env var it can move to a role
 * on the WooCommerce account without touching callers.
 */
export function isTemplateEditorEmail(
  email: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const target = email.trim().toLowerCase();
  if (!target) return false;
  return [env.DESIGNER_EMAILS, env.TEMPLATE_EDITOR_EMAILS]
    .join(",")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}

/** The signed-in template editor, or null (not signed in, or not on the list). */
export async function getTemplateEditor(): Promise<Customer | null> {
  const customer = await getSessionCustomer();
  return customer && isTemplateEditorEmail(customer.email) ? customer : null;
}
