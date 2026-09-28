"use client";

import { useEffect } from "react";
import { saveRecentOrder } from "../recent";

/**
 * Remembers this order's private link in the browser (for "Your recent
 * orders" on /track). Rendered only after the token has been verified.
 */
export function RememberOrder({
  id,
  t,
  createdAt,
}: {
  id: number;
  t: string;
  createdAt: string;
}) {
  useEffect(() => {
    saveRecentOrder({ id, t, createdAt });
  }, [id, t, createdAt]);
  return null;
}
