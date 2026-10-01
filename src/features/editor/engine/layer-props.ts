import { FabricObject } from "fabric";

/**
 * Custom props saved with every object (history, drafts, designs).
 * `autoWidth` is the text box flag of engine/text-fit.ts. (Image props live in
 * `assets/asset-ref.ts` IMAGE_CUSTOM_PROPS.)
 */
export const LAYER_PROPS = ["autoWidth"] as const;

FabricObject.customProperties = [...LAYER_PROPS];
