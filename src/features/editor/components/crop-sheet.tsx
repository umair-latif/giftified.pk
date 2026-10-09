"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FULL_RECT,
  MAX_CROP_ZOOM,
  panView,
  rectToView,
  viewToRect,
  type CropView,
  type NormRect,
} from "../engine/crop";
import {
  FRAME_SHAPES,
  FRAME_SHAPE_INFO,
  type FrameShape,
} from "../engine/frame-shape";
import { POLAROID } from "../engine/polaroid";
import type { CropTarget } from "../hooks/use-fabric-canvas";

interface Props {
  target: CropTarget;
  onCancel: () => void;
  onApply: (rect: NormRect, shape: FrameShape | null) => void;
}

/**
 * Full-screen crop: the frame stays still, the photo moves under it.
 * Drag to move, pinch or use the slider to zoom, pick a shape and proportions below.
 */
export function CropSheet({ target, onCancel, onApply }: Props) {
  const { imageAspect } = target;
  const presets = useMemo(
    () => [
      { id: "original", label: "Original", aspect: imageAspect },
      { id: "square", label: "Square", aspect: 1 },
      { id: "4:3", label: "4:3", aspect: 4 / 3 },
      { id: "3:4", label: "3:4", aspect: 3 / 4 },
      { id: "16:9", label: "Wide", aspect: 16 / 9 },
    ],
    [imageAspect],
  );
  const [view, setView] = useState<CropView>(() =>
    rectToView(imageAspect, target.rect),
  );
  const [shape, setShape] = useState<FrameShape | null>(target.shape);
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 320, h: 320 });

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([e]) =>
        e && setArea({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Frame fits the available space with 24 px breathing room.
  // A polaroid's border sits outside the photo frame: leave it room.
  const polaroid = shape === "polaroid";
  const room = polaroid ? 0.8 : 1;
  const frameW = Math.max(
    40,
    Math.min(area.w - 48, (area.h - 48) * view.frameAspect) * room,
  );
  const frameH = frameW / view.frameAspect;
  const rect = viewToRect(imageAspect, view);
  const imgW = frameW / rect.w;
  const imgH = frameH / rect.h;

  // Pointer gestures: one finger pans, two fingers zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2)
      pinchStart.current = { dist: dist(), zoom: view.zoom };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinchStart.current) {
      const start = pinchStart.current;
      setView((v) => ({
        ...v,
        zoom: clampZoom((start.zoom * dist()) / Math.max(1, start.dist)),
      }));
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setView((v) => panView(imageAspect, v, dx, dy, frameW));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const activePreset = presets.find(
    (p) => Math.abs(p.aspect - view.frameAspect) < 0.01,
  )?.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop and frame photo"
      className="fixed inset-0 z-40 flex flex-col bg-zinc-950 text-white"
    >
      <header className="flex h-14 items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md px-3 text-sm text-zinc-300 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          Cancel
        </button>
        <h2 className="text-sm font-semibold">Crop &amp; frames</h2>
        <button
          type="button"
          onClick={() => onApply(viewToRect(imageAspect, view), shape)}
          className="bg-brand-500 hover:bg-brand-400 h-9 rounded-full px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          Done
        </button>
      </header>

      <div
        ref={areaRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
      >
        <div
          data-testid="crop-frame"
          className="relative touch-none select-none"
          style={{ width: frameW, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {shape && FRAME_SHAPE_INFO[shape].path && (
            <svg width={0} height={0} aria-hidden className="absolute">
              <clipPath id="crop-shape-clip" clipPathUnits="objectBoundingBox">
                <path
                  d={FRAME_SHAPE_INFO[shape].path}
                  transform="scale(0.01)"
                />
              </clipPath>
            </svg>
          )}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath:
                shape && FRAME_SHAPE_INFO[shape].path
                  ? "url(#crop-shape-clip)"
                  : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img
              src={target.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: imgW,
                height: imgH,
                left: -rect.x * imgW,
                top: -rect.y * imgH,
              }}
            />
          </div>
          {/* Dim everything outside the frame; thin border + thirds grid inside. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 border border-white/90 shadow-[0_0_0_9999px_rgba(9,9,11,0.7)]"
          >
            <div className="absolute inset-y-0 left-1/3 border-l border-white/30" />
            <div className="absolute inset-y-0 left-2/3 border-l border-white/30" />
            <div className="absolute inset-x-0 top-1/3 border-t border-white/30" />
            <div className="absolute inset-x-0 top-2/3 border-t border-white/30" />
          </div>
          {polaroid && (
            <div
              aria-hidden
              data-testid="polaroid-border"
              // A white RING: the photo stays visible in the middle.
              className="pointer-events-none absolute box-border border-solid border-white"
              style={{
                left: -frameW * POLAROID.side,
                top: -frameW * POLAROID.top,
                width: frameW * (1 + 2 * POLAROID.side),
                height: frameH + frameW * (POLAROID.top + POLAROID.bottom),
                borderLeftWidth: frameW * POLAROID.side,
                borderRightWidth: frameW * POLAROID.side,
                borderTopWidth: frameW * POLAROID.top,
                borderBottomWidth: frameW * POLAROID.bottom,
              }}
            />
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 text-xs text-zinc-300">
          <label htmlFor="crop-zoom">Zoom</label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={MAX_CROP_ZOOM}
            step={0.01}
            value={view.zoom}
            onChange={(e) =>
              setView((v) => ({
                ...v,
                zoom: clampZoom(Number(e.target.value)),
              }))
            }
            className="accent-brand-400 flex-1"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setView(rectToView(imageAspect, FULL_RECT))}
            className="h-9 shrink-0 rounded-full px-2 text-xs text-zinc-300 underline hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            Reset
          </button>
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto"
          role="radiogroup"
          aria-label="Shape"
        >
          {[null, ...FRAME_SHAPES].map((id) => {
            const on = shape === id;
            return (
              <button
                key={id ?? "none"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setShape(id);
                  const aspect = id && FRAME_SHAPE_INFO[id].aspect;
                  if (aspect) setView((v) => ({ ...v, frameAspect: aspect }));
                }}
                className={chipClass(on)}
              >
                {id ? FRAME_SHAPE_INFO[id].label : "No frame"}
              </button>
            );
          })}
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto"
          role="radiogroup"
          aria-label="Proportions"
        >
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={activePreset === p.id}
              onClick={() => setView((v) => ({ ...v, frameAspect: p.aspect }))}
              className={chipClass(activePreset === p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const clampZoom = (z: number) => Math.min(MAX_CROP_ZOOM, Math.max(1, z));

const chipClass = (on: boolean) =>
  `h-9 shrink-0 rounded-full px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
    on
      ? "bg-white text-zinc-900 hover:bg-zinc-200"
      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
  }`;
