"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { listRecentOrders, recentOrderUrl, type RecentOrder } from "../recent";

const EMPTY: RecentOrder[] = [];
let cache: { raw: string; list: RecentOrder[] } | undefined;

/** Stable snapshot for useSyncExternalStore (same array while storage is unchanged). */
function snapshot(): RecentOrder[] {
  const list = listRecentOrders();
  const raw = JSON.stringify(list);
  if (cache?.raw !== raw) cache = { raw, list };
  return cache.list;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

const dateFormat = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});

function placedOn(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `Placed ${dateFormat.format(d)}`;
}

/** "Your recent orders on this phone" — links saved when an order page was opened. */
export function RecentOrders() {
  const orders = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  if (orders.length === 0) return null;
  return (
    <section aria-labelledby="recent-orders" data-testid="recent-orders">
      <h2 id="recent-orders" className="font-display text-ink text-lg">
        Your recent orders on this phone
      </h2>
      <ul className="mt-2 divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={recentOrderUrl(o)}
              className="focus-visible:ring-brand-600/20 flex min-h-12 items-center justify-between gap-2 px-4 py-2 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:bg-zinc-50"
            >
              <span className="font-medium text-zinc-900">Order #{o.id}</span>
              <span className="text-sm text-zinc-500">
                {placedOn(o.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
