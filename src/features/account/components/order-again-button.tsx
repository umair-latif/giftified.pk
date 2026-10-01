"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderLineInput } from "@/types/order";
import { orderAgain } from "../order-again";
import { buttonClass } from "@/components/ui/button";

type Line = Pick<
  OrderLineInput,
  "productId" | "colourId" | "size" | "quantity" | "designId" | "templateId"
>;

/** "Order again": the order's designs go back into the cart, then the cart opens. */
export function OrderAgainButton({
  orderId,
  lines,
}: {
  orderId: number;
  lines: Line[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy || lines.length === 0}
        onClick={async () => {
          setBusy(true);
          setError(undefined);
          try {
            await orderAgain(orderId, lines);
            router.push("/cart");
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "We couldn't add this order to your cart.",
            );
            setBusy(false);
          }
        }}
        className={buttonClass("primary", "mx-auto")}
        data-testid="order-again"
      >
        {busy ? "Adding to cart…" : "Order again"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Adds the same designs to your cart. You can change them, the colour or
        the size before you order.
      </p>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
