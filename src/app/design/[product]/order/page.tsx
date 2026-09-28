import { redirect } from "next/navigation";

/** The old single-design order step; ordering now starts from the cart. */
export default function OrderPage(): never {
  redirect("/cart");
}
