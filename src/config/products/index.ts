import { hoodie } from "./hoodie";
import { mug } from "./mug";
import { tshirt } from "./tshirt";
import type { ProductConfig, ProductId } from "./types";

export type { BaseColor, PrintArea, ProductConfig, ProductId } from "./types";

/** Products the editor can open. */
export const PRODUCTS: Partial<Record<ProductId, ProductConfig>> = {
  mug,
  tshirt,
  hoodie,
};

export function getProduct(id: string): ProductConfig | null {
  return Object.hasOwn(PRODUCTS, id)
    ? (PRODUCTS[id as ProductId] ?? null)
    : null;
}

export function editableProductIds(): ProductId[] {
  return Object.keys(PRODUCTS) as ProductId[];
}
