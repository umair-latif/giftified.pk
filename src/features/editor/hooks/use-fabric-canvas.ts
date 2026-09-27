"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FabricObject } from "fabric";
import type { ProductConfig } from "@/config/products";
import type {
  CanvasHistory,
  DesignCanvas,
  DesignDocument,
  GuideState,
} from "../engine";
import { loadDraft, saveDraft } from "../draft";

export type EditorStatus = "loading" | "ready" | "error";

export interface SelectionInfo {
  kind: string;
  /** Centre position and printed size, in mm from the print area's top-left. */
  centerXMm: number;
  centerYMm: number;
  widthMm: number;
  heightMm: number;
  /** Degrees, 0–360. */
  angle: number;
}

const NO_GUIDES: GuideState = { vertical: false, horizontal: false };
const AUTOSAVE_DELAY_MS = 300;

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
  const historyRef = useRef<CanvasHistory | null>(null);
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [layerCount, setLayerCount] = useState(0);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [guides, setGuides] = useState<GuideState>(NO_GUIDES);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let teardown: (() => void) | undefined;

    const start = async () => {
      const engine = await import("../engine");
      if (disposed) return;
      engineRef.current = engine;
      const el = document.createElement("canvas");
      host.appendChild(el);
      const dc = engine.createDesignCanvas(
        el,
        product.printArea,
        host.clientWidth,
      );
      designRef.current = dc;
      const { canvas } = dc;
      const restyle = (objs: FabricObject[]) =>
        objs.forEach(engine.applyTouchControls);

      // Restore autosaved work before history starts recording.
      const draft = loadDraft(product.id);
      if (draft) {
        try {
          await canvas.loadFromJSON(draft.fabric);
          restyle(canvas.getObjects());
          canvas.requestRenderAll();
        } catch (err) {
          console.warn("[editor] ignoring unreadable draft", err);
          canvas.clear();
        }
      }
      if (disposed) {
        void dc.dispose().finally(() => host.replaceChildren());
        return;
      }

      let frame = 0;
      const sync = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          setLayerCount(canvas.getObjects().length);
          setSelection(describe(canvas.getActiveObject()));
        });
      };

      let saveTimer: ReturnType<typeof setTimeout> | undefined;
      const saveNow = () => {
        clearTimeout(saveTimer);
        saveDraft(
          engine.toDesignDocument(canvas, product.id, product.printArea),
        );
      };

      const history = engine.attachHistory(canvas, {
        afterRestore: restyle,
        onChange: () => {
          setCanUndo(history.canUndo());
          setCanRedo(history.canRedo());
          sync();
          clearTimeout(saveTimer);
          saveTimer = setTimeout(saveNow, AUTOSAVE_DELAY_MS);
        },
      });
      historyRef.current = history;
      history.reset();

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
      const detachGestures = engine.attachTwoFingerGestures(
        canvas,
        product.printArea,
        sync,
      );
      const detachSnap = engine.attachCentreSnapping(
        canvas,
        product.printArea,
        dc.zoom,
        setGuides,
      );

      const ro = new ResizeObserver(([entry]) => {
        if (entry) dc.fit(entry.contentRect.width);
      });
      ro.observe(host);

      sync();
      setStatus("ready");
      teardown = () => {
        saveNow(); // never lose the last change when navigating away
        cancelAnimationFrame(frame);
        ro.disconnect();
        detachSnap();
        detachGestures();
        history.detach();
        offs.forEach((off) => off());
        historyRef.current = null;
        designRef.current = null;
        void dc.dispose().finally(() => host.replaceChildren());
      };
    };

    start().catch((err: unknown) => {
      console.error("[editor] failed to load canvas engine", err);
      if (!disposed) setStatus("error");
    });

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [product]);

  const undo = useCallback(() => void historyRef.current?.undo(), []);
  const redo = useCallback(() => void historyRef.current?.redo(), []);

  // Desktop shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // includes Fabric's text-edit textarea
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const run = useCallback((fn: (engine: Engine, dc: DesignCanvas) => void) => {
    const dc = designRef.current;
    const engine = engineRef.current;
    if (dc && engine) fn(engine, dc);
  }, []);

  const addText = useCallback(
    () => run((e, dc) => e.addText(dc.canvas, dc.area)),
    [run],
  );
  const deleteSelected = useCallback(
    () => run((e, dc) => e.deleteSelected(dc.canvas)),
    [run],
  );
  const straighten = useCallback(
    () => run((e, dc) => e.straightenSelected(dc.canvas)),
    [run],
  );
  const centre = useCallback(
    () => run((e, dc) => e.centreSelected(dc.canvas, dc.area, "x")),
    [run],
  );

  const getDesign = useCallback((): DesignDocument | null => {
    const dc = designRef.current;
    const engine = engineRef.current;
    if (!dc || !engine) return null;
    return engine.toDesignDocument(dc.canvas, product.id, product.printArea);
  }, [product]);

  return {
    hostRef,
    status,
    layerCount,
    selection,
    guides,
    canUndo,
    canRedo,
    undo,
    redo,
    addText,
    deleteSelected,
    straighten,
    centre,
    getDesign,
  };
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
    angle: ((obj.angle % 360) + 360) % 360,
  };
}
