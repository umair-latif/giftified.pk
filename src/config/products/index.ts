import { hoodie } from "./hoodie";
import { mug } from "./mug";
import { twoToneMug } from "./two-tone-mug";
import { tshirt } from "./tshirt";
import type { BaseColor, ProductConfig, ProductId } from "./types";

export { PRODUCT_IDS } from "./types";
export type { BaseColor, PrintArea, ProductConfig, ProductId } from "./types";

/** Products the editor can open. */
export const PRODUCTS: Partial<Record<ProductId, ProductConfig>> = {
  mug,
  "two-tone-mug": twoToneMug,
  tshirt,
  hoodie,
};

/**
 * The colour the design is printed on: a Dual Accent Mug is picked by its rim
 * colour but printed on its white body. Use this for the editor canvas, the
 * preview background and the dark-text rule — not for the swatch itself.
 */
export function bodyHex(colour: BaseColor | undefined): string {
  return colour?.bodyHex ?? colour?.hex ?? "#ffffff";
}

export function getProduct(id: string): ProductConfig | null {
  return Object.hasOwn(PRODUCTS, id)
    ? (PRODUCTS[id as ProductId] ?? null)
    : null;
}

export function editableProductIds(): ProductId[] {
  return Object.keys(PRODUCTS) as ProductId[];
}
