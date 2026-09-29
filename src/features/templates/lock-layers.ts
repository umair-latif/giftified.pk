/**
 * When a customer starts from a template, every layer the designer did not
 * mark customizable (and every sample photo, which they must replace) is
 * locked: `templateLocked: true`. Pure; the editor enforces it
 * (`engine/layer-lock.ts`). The rest of the design is untouched.
 */
export function lockLayersForCustomer(
  fabric: Record<string, unknown>,
): Record<string, unknown> {
  const objects = Array.isArray(fabric.objects) ? fabric.objects : [];
  return {
    ...fabric,
    objects: objects.map((o: Record<string, unknown>) => {
      const editable = o.customizable === true || o.placeholder === true;
      return { ...o, templateLocked: editable ? undefined : true };
    }),
  };
}
