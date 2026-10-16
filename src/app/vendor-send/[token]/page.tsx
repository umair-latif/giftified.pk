import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/button";
import { lineSummary, whatsappUrl } from "@/server/vendors/handoff";
import { loadSend, readSendToken, vendorDeps } from "@/server/vendors";
import { sendToVendorAction } from "./actions";

export const metadata: Metadata = {
  title: "Send to vendor",
  robots: { index: false, follow: false },
};

/**
 * Admin page behind the "Email to …" button in the "Send to vendor" email.
 * A page with a Send button (not a link that sends) because mail apps open
 * links on their own to scan them. The link is signed per order + vendor.
 */
export default async function VendorSendPage({
  params,
  searchParams,
}: PageProps<"/vendor-send/[token]">) {
  const { token } = await params;
  const q = await searchParams;
  const claims = readSendToken(token);
  if (!claims)
    return (
      <Shell>
        <p>This link is invalid or has expired (links work for 30 days).</p>
      </Shell>
    );
  const page = await loadSend(claims, await vendorDeps());
  if (!page.ok)
    return (
      <Shell>
        <p>{page.message}</p>
      </Shell>
    );
  const { order, part, sent, text } = page;
  const send = sendToVendorAction.bind(null, token);
  return (
    <Shell>
      {q.sent && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800"
        >
          Sent to {part.vendor.name}. A note was added to the order.
        </p>
      )}
      {q.error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-800"
        >
          Sending failed. Please try again; if it keeps failing, use WhatsApp or
          send the files yourself.
        </p>
      )}
      <h1 className="text-ink text-2xl font-semibold">
        Order #{order.id} → {part.vendor.name}
      </h1>
      <ul className="list-disc pl-5">
        {part.lines.map(({ index, line }) => (
          <li key={index}>{lineSummary(line)}</li>
        ))}
      </ul>
      <p className="text-ink/70 text-sm">
        {part.vendor.email
          ? `To: ${part.vendor.email}`
          : "No address is saved for this vendor — type one below."}{" "}
        The PDF and the print file are attached when they fit (otherwise links).
        No customer details are sent.
      </p>
      {sent && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Already sent to {sent.to} on{" "}
          {new Date(sent.sentAt).toLocaleString("en-GB", {
            timeZone: "Asia/Karachi",
          })}
          . Sending again emails the vendor a second time.
        </p>
      )}
      <details className="border-ink/25 rounded-xl border p-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          Message to the vendor
        </summary>
        <pre className="mt-2 font-sans whitespace-pre-wrap">{text}</pre>
      </details>
      {q.noemail && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-800"
        >
          That doesn&rsquo;t look like an email address. Please check it.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          action={send}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          {!part.vendor.email && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">
                Vendor&rsquo;s email address
              </span>
              <input
                type="email"
                name="to"
                required
                autoComplete="email"
                placeholder="printer@example.com"
                data-testid="vendor-email"
                className="border-ink/30 focus-visible:ring-brand-600/30 h-11 rounded-xl border px-3 text-base focus-visible:ring-2 focus-visible:outline-none"
              />
              <span className="text-ink/60 text-xs">
                Used once, for this order. To save it for every order, add{" "}
                <code>vendor_email</code> to the product in WP admin.
              </span>
            </label>
          )}
          <button type="submit" className={buttonClass("primary")}>
            {sent ? "Send again by email" : "Send by email"}
          </button>
        </form>
        <a
          href={whatsappUrl(text, part.vendor.whatsapp)}
          className={buttonClass("secondary")}
        >
          WhatsApp instead
        </a>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8 text-base">
      <p className="text-ink/65 text-xs font-semibold tracking-wide uppercase">
        DesignBanana · Send to vendor
      </p>
      {children}
    </main>
  );
}
