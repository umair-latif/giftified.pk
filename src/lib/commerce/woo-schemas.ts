import { z } from "zod";

/**
 * Zod schemas for the parts of the WooCommerce REST API v3 responses we use.
 * Only the fields we read are listed; unknown fields are ignored (Zod strips
 * them), so WC adding fields never breaks us. Money arrives as strings.
 */

export const wooMetaSchema = z.object({
  id: z.number().optional(),
  key: z.string(),
  value: z.unknown(),
});
export type WooMeta = z.infer<typeof wooMetaSchema>;

const wooAttributeOptionSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  option: z.string(),
});

export const wooProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().default(""),
  sku: z.string(),
  type: z.string(),
  status: z.string(),
  price: z.string(),
  stock_status: z.string(),
  variations: z.array(z.number()).default([]),
  images: z
    .array(z.object({ src: z.string(), alt: z.string().default("") }))
    .default([]),
  /** HTML from the WP editor; sanitised before it reaches a page. */
  description: z.string().optional(),
  short_description: z.string().optional(),
});
export type WooProduct = z.infer<typeof wooProductSchema>;

export const wooVariationSchema = z.object({
  id: z.number(),
  sku: z.string().default(""),
  price: z.string(),
  status: z.string().default("publish"),
  stock_status: z.string(),
  attributes: z.array(wooAttributeOptionSchema),
});
export type WooVariation = z.infer<typeof wooVariationSchema>;

const wooAddressSchema = z.object({
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  address_1: z.string().default(""),
  address_2: z.string().default(""),
  city: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().nullish(),
});

export const wooLineItemSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  variation_id: z.number(),
  quantity: z.number(),
  subtotal: z.string(),
  price: z.number().optional(),
  meta_data: z.array(wooMetaSchema).default([]),
});
export type WooLineItem = z.infer<typeof wooLineItemSchema>;

export const wooOrderSchema = z.object({
  id: z.number(),
  status: z.string(),
  date_created_gmt: z.string().nullable(),
  payment_method: z.string(),
  total: z.string(),
  shipping_total: z.string(),
  billing: wooAddressSchema,
  shipping: wooAddressSchema,
  line_items: z.array(wooLineItemSchema),
  meta_data: z.array(wooMetaSchema).default([]),
});
export type WooOrder = z.infer<typeof wooOrderSchema>;

export const wooShippingZoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  order: z.number().default(0),
});
export type WooShippingZone = z.infer<typeof wooShippingZoneSchema>;

export const wooZoneMethodSchema = z.object({
  instance_id: z.number(),
  method_id: z.string(),
  title: z.string().default(""),
  enabled: z.boolean(),
  order: z.number().default(0),
  settings: z
    .object({
      cost: z.object({ value: z.string() }).optional(),
    })
    .default({}),
});
export type WooZoneMethod = z.infer<typeof wooZoneMethodSchema>;

/** Webhook payload for order topics is the same shape as a REST order. */
export const wooWebhookOrderSchema = z.object({
  id: z.number(),
  status: z.string(),
});

/**
 * A term of a global attribute (Products → Attributes → Colour → terms).
 * For colours the term description holds the swatch hex, e.g. "#FFFFFF".
 */
export const wooAttributeTermSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().default(""),
  description: z.string().default(""),
});
export type WooAttributeTerm = z.infer<typeof wooAttributeTermSchema>;
