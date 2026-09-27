"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FabricObject } from "fabric";
import type { ProductConfig } from "@/config/products";
import type { DesignCanvas, DesignDocument } from "../engine";

export type EditorStatus = "loading" | "ready" | "error";

export interface SelectionInfo {
  kind: string;
  /** Centre position and printed size, in mm from the print area's top-left. */
  centerXMm: number;
  centerYMm: number;
  widthMm: number;
  heightMm: number;
  angle: number;
}

type Engine = typeof import("../engine");

/**
 * Mounts a Fabric canvas for one product and exposes a small command API.
 * Fabric is loaded lazily here, so pages using this hook don't pay for it
 * in their initial bundle. React never renders children into `hostRef`;
 * Fabric owns that DOM subtree.
 */
export function useFabricCanvas(product: ProductConfig) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const designRef = useRef<DesignCanvas | null>(null);
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [layerCount, setLayerCount] = useState(0);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let teardown: (() => void) | undefined;

    import("../engine")
      .then((engine) => {
        if (disposed) return;
        engineRef.current = engine;
        const el = document.createElement("canvas");
        host.appendChild(el);
        const dc = engine.createDesignCanvas(el, product.printArea, host.clientWidth);
        designRef.current = dc;
        const { canvas } = dc;

        let frame = 0;
        const sync = () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            setLayerCount(canvas.getObjects().length);
            setSelection(describe(canvas.getActiveObject()));
          });
        };
        const events = [
          "object:added",
          "object:removed",
          "object:modified",
          "object:moving",
          "object:scaling",
          "object:rotating",
          "selection:created",
          "selection:updated",
          "selection:cleared",
        ] as const;
        const offs = events.map((name) => canvas.on(name, sync));
        const detachGestures = engine.attachTwoFingerGestures(canvas, product.printArea, sync);

        const ro = new ResizeObserver(([entry]) => {
          if (entry) dc.fit(entry.contentRect.width);
        });
        ro.observe(host);

        setStatus("ready");
        teardown = () => {
          cancelAnimationFrame(frame);
          ro.disconnect();
          detachGestures();
          offs.forEach((off) => off());
          designRef.current = null;
          void dc.dispose().finally(() => host.replaceChildren());
        };
      })
      .catch((err: unknown) => {
        console.error("[editor] failed to load canvas engine", err);
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [product]);

  const addText = useCallback(() => {
    const dc = designRef.current;
    const engine = engineRef.current;
    if (!dc || !engine) return;
    engine.addText(dc.canvas, dc.area);
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = designRef.current?.canvas;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  const getDesign = useCallback((): DesignDocument | null => {
    const dc = designRef.current;
    const engine = engineRef.current;
    if (!dc || !engine) return null;
    return engine.toDesignDocument(dc.canvas, product.id, product.printArea);
  }, [product]);

  return { hostRef, status, layerCount, selection, addText, deleteSelected, getDesign };
}

function describe(obj: FabricObject | undefined): SelectionInfo | null {
  if (!obj) return null;
  const c = obj.getCenterPoint();
  return {
    kind: obj.type,
    centerXMm: c.x,
    centerYMm: c.y,
    widthMm: obj.getScaledWidth(),
    heightMm: obj.getScaledHeight(),
    angle: obj.angle,
  };
}
