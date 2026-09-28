import Link from "next/link";

/**
 * Shown for a missing or wrong order link. Deliberately the same for "no such
 * order" and "wrong token", so it reveals nothing about which orders exist.
 */
export default function OrderNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10 text-center">
      <h1 className="font-display text-ink text-2xl">
        We can’t open this order link
      </h1>
      <p className="text-zinc-700">
        The link may be incomplete. Find your order with its number and your
        mobile number instead.
      </p>
      <Link
        href="/track"
        className="bg-brand-600 active:bg-brand-700 grid h-12 place-items-center rounded-full font-semibold text-white"
      >
        Track your order
      </Link>
    </main>
  );
}
