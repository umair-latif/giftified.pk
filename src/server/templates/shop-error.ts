/**
 * What the designer sees when WooCommerce refuses to create a design's
 * product (only designers use the template tools, so WooCommerce's own reason
 * is shown: without it the founder can't tell what to fix).
 */
export function shopProductErrorMessage(err: {
  message: string;
  code?: string;
}): string {
  // "WooCommerce POST /products failed (400): Ungültige oder doppelte Artikelnummer."
  const reason = err.message.replace(
    /^WooCommerce \S+ \S+ failed \(\d+\):?\s*/,
    "",
  );
  const sku =
    err.code === "product_invalid_sku" || /\bsku\b|artikelnummer/i.test(reason);
  if (sku)
    return (
      "The shop already has a product with this design's SKU, probably in the bin. " +
      "In WP admin → Products, open the Bin and delete it permanently (or give the design a new name), then save again. " +
      `Shop said: ${reason || err.code}`
    );
  return (
    "The shop couldn't create the product. Nothing was saved; please try again." +
    (reason || err.code ? ` Shop said: ${reason || err.code}` : "")
  );
}
