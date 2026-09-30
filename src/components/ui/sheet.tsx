"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Generic bottom sheet: up to 50% of the screen height, the canvas/page
 * above it stays visible and interactive. Closes on Escape, on tapping
 * anywhere outside it, or on dragging its handle down.
 */
export function Sheet({ title, onClose, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    // Registered after mount so the tap that opened the sheet isn't also
    // the tap that closes it.
    const id = requestAnimationFrame(() =>
      document.addEventListener("pointerdown", onDown),
    );
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const onHandleDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  };
  const endDrag = () => {
    if (dragY > 60) onClose();
    setDragY(0);
    dragStartY.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="sheet"
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[50dvh] flex-col rounded-t-2xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
      style={{
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragging ? "none" : "transform 150ms ease-out",
      }}
    >
      <div className="flex shrink-0 flex-col items-center">
        {/* Only the grip itself drags — the title/close row stays ordinary
            buttons, or a tap on Close would also start a drag (pointer
            capture on a wrapping element swallows the click). */}
        <div
          className="touch-none px-8 pt-2 pb-1"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span
            aria-hidden
            className="block h-1 w-10 rounded-full bg-zinc-300"
          />
        </div>
        <div className="flex w-full items-center justify-between px-4 pb-2">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-visible:ring-brand-600/20 -mr-2 grid size-9 place-items-center rounded-full text-lg text-zinc-500 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100"
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
