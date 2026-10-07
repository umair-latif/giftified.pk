import type { ProductId } from "@/config/products";
import type { DesignDocument } from "@/types/design";

/**
 * SHARED CONTRACT (task 18 → task 19 gallery, task 23 shared templates).
 * Change only with the lead developer's approval.
 *
 * A template is the stored file of a published design. Its photos are either
 * "customer's photos" (`placeholder: true` + `sampleId`: a sample from the
 * library the customer must replace) or artwork (`templateAsset: <id>`: the
 * ORIGINAL is stored with the design and printed as it is). Customers may
 * change anything; nothing is locked.
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
  /**
   * The one base colour this design is made and sold in (a `baseColors` id).
   * Absent on older templates: treat as the product's first colour.
   */
  colourId?: string;
  /**
   * Shared by the same artwork published in other colours, so a product page
   * can later list "same design in other colours". Set when publishing.
   */
  groupId?: string;
  occasions: OccasionSlug[];
  /** Only published templates are shown to customers. */
  published: boolean;
  hasThumbnail: boolean;
  /** Product images (mockups) stored with the template, in display order (task 26). */
  images?: { label: string }[];
  /** ISO 8601 (UTC). */
  createdAt: string;
  /** Email of the template editor who saved it (absent on older templates). */
  createdBy?: string;
  /** Design products (task 26): shown/sold as a product page. */
  product?: {
    /** URL slug: `/designs/<slug>`. */
    slug: string;
    /** WooCommerce simple product holding the price, description and status. */
    wooProductId: number;
    /** Whole rupees at publish time (WooCommerce is the source of truth afterwards). */
    pricePkr: number;
    description: string;
  };
}

export interface TemplateDetail {
  meta: TemplateMeta;
  /** `asset:<id>` refs point at `assetIds`. */
  design: DesignDocument;
  /** Every photo stored with the template (asset ids from the design). */
  assetIds: string[];
  /** The subset of `assetIds` that are customer's photos (samples). */
  placeholderIds: string[];
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
  /** Required for published designs; must be one of the product's colours. */
  colourId?: string;
  groupId?: string;
  occasions: OccasionSlug[];
  published: boolean;
  createdBy?: string;
  /**
   * Reserved by `createTemplateUploads` when the design has artwork photos
   * (their originals are already uploaded under it); otherwise a new id.
   */
  id?: string;
  product?: TemplateMeta["product"];
  /**
   * Customer's photos need a `sampleId` (the server copies the sample). Artwork
   * photos must be uploaded first (`createTemplateUploads`), or carry
   * `templateAsset` of the published design they came from (copied too).
   */
  design: DesignDocument;
  thumbnail?: Uint8Array;
  /** Product images (mockups of the design on the product), first = main image. */
  images?: { label: string; bytes: Uint8Array }[];
}
