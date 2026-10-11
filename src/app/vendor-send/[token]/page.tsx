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
  const page = await loadSend(claims, vendorDeps());
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
          className="rounded-xl bg-emerald-50 px-4 py-3 font-medium text-emerald-800"
        >
          Sent to {part.vendor.name}. A note was added to the order.
        </p>
      )}
      {q.error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800"
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
      <p className="text-sm text-zinc-600">
        To: {part.vendor.email ?? "no email address set"} · the PDF and the
        print file are attached when they fit (otherwise links). No customer
        details are sent.
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
      <details className="rounded-xl border border-zinc-300 p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Message to the vendor
        </summary>
        <pre className="mt-2 font-sans whitespace-pre-wrap">{text}</pre>
      </details>
      <div className="flex flex-col gap-3 sm:flex-row">
        {part.vendor.email && (
          <form action={send}>
            <button type="submit" className={buttonClass("primary")}>
              {sent ? "Send again by email" : "Send by email"}
            </button>
          </form>
        )}
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
      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        DesignBanana · Send to vendor
      </p>
      {children}
    </main>
  );
}
