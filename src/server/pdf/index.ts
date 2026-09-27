import "server-only";
import type { BuildVendorProof } from "./types";

export type * from "./types";

/** Implemented in the vendor-proof task (docs/tasks/03-vendor-proof-pdf.md). */
export const buildVendorProof: BuildVendorProof = async () => {
  throw new Error(
    "buildVendorProof is not implemented yet (see docs/tasks/03-vendor-proof-pdf.md)",
  );
};
