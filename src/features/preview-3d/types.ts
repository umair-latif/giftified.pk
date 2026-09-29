/**
 * SHARED CONTRACT — 3D preview components. The design arrives as an image
 * (PNG data URL or object URL) produced by `renderDesignToDataUrl`, so the 3D
 * code never needs to know about Fabric.
 */
export interface MugPreviewProps {
  /** Flat print-area image; its aspect ratio equals the print area (228:89 for the mug). */
  textureUrl: string;
  /** Mug body colour (hex). */
  baseColor: string;
  className?: string;
}
