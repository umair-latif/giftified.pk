import { FabricObject, type Canvas } from "fabric";

/**
 * Template layers (task 26). The template designer marks a layer
 * `customizable` (customers may change it) — everything else is locked.
 * When a customer starts from a template, `lockLayersForCustomer` (pure, in
 * `features/templates/lock-layers.ts`) stamps `templateLocked` on the locked
 * layers; this module makes Fabric honour it.
 */
export const LAYER_PROPS = ["customizable", "templateLocked"] as const;

// Serialised with every object (history, drafts, saved templates).
FabricObject.customProperties = [...LAYER_PROPS];

type LayerObject = FabricObject & {
  customizable?: boolean;
  templateLocked?: boolean;
};

/** Locked layers can't be picked, moved, scaled or rotated. Not serialised: re-applied after every load/restore. */
export function applyLayerLock(obj: FabricObject): void {
  const locked = (obj as LayerObject).templateLocked === true;
  obj.set({
    selectable: !locked,
    evented: !locked,
    hasControls: !locked,
    hasBorders: !locked,
  });
}

export function isCustomizable(obj: FabricObject | undefined): boolean {
  return !!obj && (obj as LayerObject).customizable === true;
}

/** Designer: let customers change (or not) the selected layer. One undo step. */
export function setCustomizable(canvas: Canvas, value: boolean): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  (obj as LayerObject).customizable = value || undefined;
  canvas.fire("object:modified", { target: obj });
  canvas.requestRenderAll();
}
