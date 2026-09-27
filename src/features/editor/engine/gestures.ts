import type { Canvas, FabricObject } from "fabric";
import { Point } from "fabric";
import type { PrintArea } from "@/config/products";
import { clampScaleRatio } from "./constraints";

interface GestureStart {
  target: FabricObject;
  distance: number;
  angleDeg: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  widthMm: number;
}

/**
 * Two-finger pinch-to-scale and twist-to-rotate for the selected object.
 * Fabric v6+ ignores non-primary pointers, so we handle the second finger
 * with raw touch events and cancel Fabric's one-finger drag when it lands.
 */
export function attachTwoFingerGestures(
  canvas: Canvas,
  area: PrintArea,
  onChange: (target: FabricObject) => void,
): () => void {
  const el = canvas.upperCanvasEl;
  let start: GestureStart | null = null;

  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    const target = canvas.getActiveObject();
    if (!target) return;
    e.preventDefault();
    canvas.endCurrentTransform();
    const [a, b] = [e.touches[0]!, e.touches[1]!];
    start = {
      target,
      distance: dist(a, b),
      angleDeg: angle(a, b),
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      rotation: target.angle,
      widthMm: target.getScaledWidth(),
    };
  };

  const onMove = (e: TouchEvent) => {
    if (!start || e.touches.length !== 2) return;
    e.preventDefault();
    const [a, b] = [e.touches[0]!, e.touches[1]!];
    const { target } = start;
    const center = target.getCenterPoint();
    const ratio = clampScaleRatio(dist(a, b) / start.distance, start.widthMm, area);
    target.set({ scaleX: start.scaleX * ratio, scaleY: start.scaleY * ratio });
    target.rotate(start.rotation + (angle(a, b) - start.angleDeg));
    target.setPositionByOrigin(new Point(center.x, center.y), "center", "center");
    target.setCoords();
    canvas.requestRenderAll();
    onChange(target);
  };

  const onEnd = (e: TouchEvent) => {
    if (!start || e.touches.length >= 2) return;
    const { target } = start;
    start = null;
    canvas.fire("object:modified", { target });
    onChange(target);
  };

  const opts: AddEventListenerOptions = { passive: false };
  el.addEventListener("touchstart", onStart, opts);
  el.addEventListener("touchmove", onMove, opts);
  el.addEventListener("touchend", onEnd);
  el.addEventListener("touchcancel", onEnd);
  return () => {
    el.removeEventListener("touchstart", onStart, opts);
    el.removeEventListener("touchmove", onMove, opts);
    el.removeEventListener("touchend", onEnd);
    el.removeEventListener("touchcancel", onEnd);
  };
}

function dist(a: Touch, b: Touch): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1;
}

function angle(a: Touch, b: Touch): number {
  return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
}
