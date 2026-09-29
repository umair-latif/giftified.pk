import type { ProductId } from "@/config/products";
import type { DesignDocument } from "@/types/design";

/**
 * SHARED CONTRACT (task 18 → task 19 gallery, task 23 shared templates).
 * Change only with the lead developer's approval.
 *
 * A template is a saved design whose photos are all placeholders: sample
 * photos the customer replaces with their own ("Tap to add photo").
 */
export const OCCASION_SLUGS = [
  "eid",
  "birthday",
  "shaadi",
  "anniversary",
  "mothers-day",
  "14-august",
  "team-corporate",
] as const;
export type OccasionSlug = (typeof OCCASION_SLUGS)[number];

export interface TemplateMeta {
  id: string;
  name: string;
  productId: ProductId;
  occasions: OccasionSlug[];
  /** Only published templates are shown to customers. */
  published: boolean;
  hasThumbnail: boolean;
  /** ISO 8601 (UTC). */
  createdAt: string;
}

export interface TemplateDetail {
  meta: TemplateMeta;
  /** Every photo carries `placeholder: true`; `asset:<id>` refs point at `assetIds`. */
  design: DesignDocument;
  /** Sample photos stored with the template (asset ids from the design). */
  assetIds: string[];
}

export interface ListTemplatesFilter {
  productId?: ProductId;
  occasion?: OccasionSlug;
  /** Founder tools only; customers never see unpublished templates. */
  includeUnpublished?: boolean;
}

export interface SaveTemplateInput {
  name: string;
  productId: ProductId;
  occasions: OccasionSlug[];
  published: boolean;
  design: DesignDocument;
  /** Sample photos: one per asset id referenced by the design. */
  assets: { assetId: string; bytes: Uint8Array; contentType: string }[];
  thumbnail?: Uint8Array;
}
