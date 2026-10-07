import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getProduct } from "@/config/products";
import { formatPkr } from "@/features/checkout/format";
import { SavedDesignCard } from "@/features/saved-designs/components/saved-design-card";
import { getCommerce } from "@/lib/commerce";
import { MAX_SAVED_DESIGNS, type Customer } from "@/lib/commerce/types";
import { savedDesignDeps, thumbnailUrls } from "@/server/saved-designs";
import { formatDate, orderStatusLabel } from "../format";
import {
  AddressForm,
  DeleteAccountForm,
  PasswordLinkForm,
  ProfileForm,
} from "./account-forms";

/**
 * The account sections (task 21/22) as server components. Each is used twice:
 * on its own page (desktop: right column of the account layout) and inside a
 * card on the mobile account home, so both always show the same thing.
 */

export const card = "card";
const rowLink =
  "focus-visible:ring-brand-600/20 flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-mint-100 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:bg-mint-100";

export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-mint-100 text-brand-900 shrink-0 rounded-full px-3 py-1 text-sm font-medium">
      {children}
    </span>
  );
}

/** Orders placed while signed in, newest first. `limit` shows a short list with "See all". */
export async function OrdersSection({
  customerId,
  page = 1,
  limit,
  framed = true,
}: {
  customerId: number;
  page?: number;
  limit?: number;
  framed?: boolean;
}) {
  const { orders: all, totalPages } = await getCommerce().listCustomerOrders(
    customerId,
    page,
  );
  const orders = limit ? all.slice(0, limit) : all;
  if (orders.length === 0)
    return (
      <div data-testid="account-orders-empty">
        <p className="text-ink">No orders yet.</p>
        <p className="mt-1 text-sm text-zinc-600">
          Orders placed as a guest are on{" "}
          <Link href="/track" className="underline">
            Track your order
          </Link>
          .
        </p>
        <Link href="/products" className={buttonClass("primary", "mt-3")}>
          Browse products
        </Link>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <ul
        className={`divide-y divide-zinc-200 overflow-hidden ${framed ? card : "-mx-4 border-y border-zinc-200"}`}
        data-testid="account-orders"
      >
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/account/orders/${o.id}`}
              className={rowLink}
              data-testid="account-order"
            >
              <span className="min-w-0">
                <span className="text-ink block font-medium">
                  Order #{o.id}
                </span>
                <span className="block text-sm text-zinc-500">
                  {formatDate(o.createdAt)} ·{" "}
                  {o.lines.reduce((s, l) => s + l.quantity, 0)} item(s) ·{" "}
                  {formatPkr(o.totalPkr)}
                </span>
              </span>
              <StatusPill>{orderStatusLabel(o)}</StatusPill>
            </Link>
          </li>
        ))}
      </ul>
      {limit && (all.length > limit || totalPages > 1) && (
        <Link
          href="/account/orders"
          className="text-brand-700 text-sm font-medium underline"
        >
          See all orders
        </Link>
      )}
      {!limit && totalPages > 1 && (
        <nav aria-label="Pages" className="flex justify-between gap-3">
          {page > 1 ? (
            <Link
              href={`/account/orders?page=${page - 1}`}
              className={buttonClass("secondary")}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages && (
            <Link
              href={`/account/orders?page=${page + 1}`}
              className={buttonClass("secondary")}
            >
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/** Saved designs (task 22): open on any device, rename, delete. */
export async function DesignsSection({ customerId }: { customerId: number }) {
  const deps = savedDesignDeps();
  const designs = await deps.commerce.listSavedDesigns(customerId);
  const thumbs = await thumbnailUrls(customerId, designs, deps);
  return (
    <div className="flex flex-col gap-3">
      {designs.length === 0 ? (
        <div data-testid="saved-designs-empty">
          <p className="text-ink">No saved designs yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            In the editor, tap <strong>Save to my designs</strong>.
          </p>
          <Link href="/design/mug" className={buttonClass("primary", "mt-3")}>
            Start designing
          </Link>
        </div>
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
    </div>
  );
}

export function AddressSection({
  customer,
  framed = true,
}: {
  customer: Customer;
  framed?: boolean;
}) {
  return (
    <AddressForm
      framed={framed}
      initial={{
        ...(customer.phone ? { phone: customer.phone } : {}),
        ...(customer.address
          ? {
              city: customer.address.city,
              addressLine: customer.address.addressLine,
              ...(customer.address.landmark
                ? { landmark: customer.address.landmark }
                : {}),
            }
          : {}),
      }}
    />
  );
}

export function ProfileSection({
  customer,
  framed = true,
}: {
  customer: Customer;
  framed?: boolean;
}) {
  const divider = framed ? "" : "border-t border-zinc-200 pt-4";
  return (
    <div className="flex flex-col gap-4">
      <ProfileForm
        framed={framed}
        initial={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          marketingOptIn: customer.marketingOptIn === true,
        }}
      />
      <div className={divider}>
        <PasswordLinkForm email={customer.email} framed={framed} />
      </div>
      <div className={divider}>
        <DeleteAccountForm framed={framed} />
      </div>
    </div>
  );
}

/** Placeholder while a section's data loads (streamed with Suspense). */
export function SectionLoading() {
  return (
    <p className="text-sm text-zinc-500" role="status">
      Loading…
    </p>
  );
}
