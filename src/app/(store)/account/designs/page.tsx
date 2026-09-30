import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Page, PageTitle } from "@/components/ui/page";
import { getProduct } from "@/config/products";
import { SavedDesignCard } from "@/features/saved-designs/components/saved-design-card";
import { MAX_SAVED_DESIGNS } from "@/lib/commerce/types";
import { getSessionCustomer } from "@/server/auth/cookies";
import { savedDesignDeps, thumbnailUrls } from "@/server/saved-designs";

export const metadata: Metadata = {
  title: "My designs",
  robots: { index: false, follow: false },
};

/** Task 22: the customer's saved designs — continue on any device, rename, delete. */
export default async function SavedDesignsPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/sign-in?next=/account/designs");
  const deps = savedDesignDeps();
  const designs = await deps.commerce.listSavedDesigns(customer.id);
  const thumbs = await thumbnailUrls(customer.id, designs, deps);

  return (
    <Page width="content" className="flex flex-col gap-4">
      <div>
        <Link href="/account" className="text-sm text-zinc-600 underline">
          Your account
        </Link>
        <PageTitle className="mt-1">My designs</PageTitle>
        <p className="mt-1 text-sm text-zinc-600">
          Tap a design to keep working on it, on this phone or any other.
          Designs from orders you place while signed in are added here too.
        </p>
      </div>
      {designs.length === 0 ? (
        <section
          className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200"
          data-testid="saved-designs-empty"
        >
          <p className="text-ink">No saved designs yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            In the editor, tap <strong>Save to my designs</strong>.
          </p>
          <Link
            href="/design/mug"
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 mt-3 inline-flex h-12 items-center rounded-full px-5 font-semibold text-white"
          >
            Start designing
          </Link>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="saved-designs">
          {designs.map((d) => (
            <SavedDesignCard
              key={d.id}
              design={d}
              productName={getProduct(d.productId)?.name ?? d.productId}
              {...(thumbs[d.id] ? { thumbnailUrl: thumbs[d.id] } : {})}
            />
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-500">
        {designs.length} of {MAX_SAVED_DESIGNS} designs. Deleting a design also
        deletes its photos from our storage. Designs on an order we’re still
        making can be deleted once it’s delivered. See our{" "}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>
        .
      </p>
    </Page>
  );
}
