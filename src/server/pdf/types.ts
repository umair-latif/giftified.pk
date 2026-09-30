import type { ProductId } from "@/config/products";
import type { OrderId } from "@/types/order";

/**
 * SHARED CONTRACT — input for the standardised VendorProof.pdf.
 * No customer phone or street address: vendors don't need them.
 */
export interface VendorProofInput {
  orderId: OrderId;
  createdAt: string; // ISO 8601
  productId: ProductId;
  productName: string;
  /** Title of the ready-made design this line was bought as (design products, task 26). */
  designTitle?: string;
  colourName: string;
  size?: string;
  quantity: number;
  /** Physical print area and where it sits on the product. */
  print: {
    widthMm: number;
    heightMm: number;
    dpi: number;
    /** Human-readable placement reference, e.g. "Centred on mug front, handle on right". */
    placement: string;
    /** Offset of the print area from the placement reference, in mm. */
    offsetXMm: number;
    offsetYMm: number;
  };
  /** The 300 DPI transparent PNG (embedded as a thumbnail, attached separately in full). */
  printPng: Uint8Array;
  /** Optional product mockup/preview PNG. */
  mockupPng?: Uint8Array;
  customerCity: string;
  notes?: string;
}

export type BuildVendorProof = (input: VendorProofInput) => Promise<Uint8Array>;
