"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FabricObject } from "fabric";
import { fontForFamily } from "@/config/fonts";
import type { ProductConfig } from "@/config/products";
import type {
  CanvasHistory,
  DesignCanvas,
  DesignDocument,
  GuideState,
  NormRect,
  TextStyle,
} from "../engine";
import { dpiStatus, type DpiStatus } from "@/lib/dpi";
import { newId } from "@/lib/id";
import { putAsset, pruneAssets, previewUrl } from "../assets/asset-store";
import { ImageUploadError, prepareImage } from "../assets/prepare-image";
import { resolveAssetRefs } from "../assets/resolve";
import { allDraftAssetIds, loadDraft, saveDraft } from "../draft";
import {
  DEFAULT_TEXT_FACE,
  loadFaces,
  onFontLoaded,
} from "../fonts/load-fonts";
import { designFontFaces, migrateDesignFonts } from "../fonts/migrate";
// Only type imports from Fabric inside, so this does not pull Fabric into the initial bundle.
import type { FrameShape } from "../engine/frame-shape";
import { getTextStyle } from "../engine/text-style";

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
  /** Template designers: customers may change this layer. */
  customizable: boolean;
  /** Present when the selection is text. */
  text: TextStyle | null;
  /** Effective print DPI when the selection is an image. */
  dpi: number | null;
  dpiStatus: DpiStatus | null;
}

export interface CropTarget {
  /** Preview image URL to show in the crop screen. */
  src: string;
  /** Width ÷ height of the full, uncropped image. */
  imageAspect: number;
  /** Current crop (normalised). */
  rect: NormRect;
  /** Current frame shape, null = plain rectangle. */
  shape: FrameShape | null;
}

export interface PrintQuality {
  /** Lowest effective DPI of any image on the design (null = no images). */
  worstDpi: number | null;
  status: DpiStatus;
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
/**
 * @param designKey edit a saved cart design instead of the product's draft.
 */
export function useFabricCanvas(product: ProductConfig, designKey?: string) {
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
  const [quality, setQuality] = useState<PrintQuality>({
    worstDpi: null,
    status: "ok",
  });
  const [placeholders, setPlaceholders] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

      // Fonts: the face new text uses, plus (below) every face the draft
      // uses — awaited before its first render. A late face re-measures text.
      void loadFaces([DEFAULT_TEXT_FACE]);
      const offFonts = onFontLoaded(() => engine.relayoutText(canvas));

      // Restore autosaved work before history starts recording.
      const draft = loadDraft(product.id, designKey);
      if (draft) {
        try {
          // Old device-font stacks → our self-hosted families (task 16).
          const migrated = migrateDesignFonts(draft.fabric);
          const [{ fabric, missing }] = await Promise.all([
            resolveAssetRefs(migrated),
            loadFaces(designFontFaces(migrated)),
          ]);
          await canvas.loadFromJSON(fabric);
          restyle(canvas.getObjects());
          canvas.requestRenderAll();
          if (missing.length > 0) {
            setNotice(
              "A photo from your last visit couldn’t be found on this device, so it was removed.",
            );
          }
        } catch (err) {
          console.warn("[editor] ignoring unreadable draft", err);
          canvas.clear();
        }
      }
      if (disposed) {
        offFonts();
        void dc.dispose().finally(() => host.replaceChildren());
        return;
      }
      // Forget photos no draft uses any more (keeps IndexedDB small).
      void pruneAssets(allDraftAssetIds());

      let frame = 0;
      const sync = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const objects = canvas.getObjects();
          setLayerCount(objects.length);
          setSelection(describe(engine, canvas.getActiveObject()));
          setPlaceholders(
            objects.filter(
              (o) => engine.isAssetImage(o) && o.placeholder === true,
            ).length,
          );
          const dpis = objects
            .map(engine.objectDpi)
            .filter((d): d is number => d !== null);
          const worstDpi = dpis.length ? Math.min(...dpis) : null;
          setQuality((prev) => {
            const status = worstDpi === null ? "ok" : dpiStatus(worstDpi);
            const rounded = worstDpi === null ? null : Math.round(worstDpi);
            return prev.worstDpi === rounded && prev.status === status
              ? prev
              : { worstDpi: rounded, status };
          });
        });
      };

      let saveTimer: ReturnType<typeof setTimeout> | undefined;
      const saveNow = () => {
        clearTimeout(saveTimer);
        saveDraft(
          engine.toDesignDocument(canvas, product.id, product.printArea),
          designKey,
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

      // Reloads, tab closes and app switches don't run React cleanup: save now.
      const onHide = () => saveNow();
      const onVisibility = () =>
        document.visibilityState === "hidden" && saveNow();
      window.addEventListener("pagehide", onHide);
      document.addEventListener("visibilitychange", onVisibility);

      const ro = new ResizeObserver(([entry]) => {
        if (entry) dc.fit(entry.contentRect.width);
      });
      ro.observe(host);

      // Test probe (font-parity e2e only; the flag is set by Playwright).
      const probe = window as unknown as {
        __GIFTIFIED_E2E__?: boolean;
        __giftifiedTextLayout?: () => unknown;
      };
      if (probe.__GIFTIFIED_E2E__)
        probe.__giftifiedTextLayout = () =>
          engine.textLayouts(canvas.getObjects());

      sync();
      setStatus("ready");
      teardown = () => {
        saveNow(); // never lose the last change when navigating away
        offFonts();
        delete probe.__giftifiedTextLayout;
        window.removeEventListener("pagehide", onHide);
        document.removeEventListener("visibilitychange", onVisibility);
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
  }, [product, designKey]);

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

  const applyTextStyle = useCallback(
    (style: Partial<TextStyle>) =>
      run((e, dc) => {
        e.applyTextStyle(dc.canvas, style);
        // Fetch the face the text now uses (e.g. first Bold tap); when it
        // arrives, onFontLoaded re-measures the text.
        const t = getTextStyle(dc.canvas.getActiveObject());
        const font = t && fontForFamily(t.fontFamily);
        if (t && font)
          void loadFaces([{ font, weight: t.fontWeight, style: t.fontStyle }]);
      }),
    [run],
  );
  const setText = useCallback(
    (text: string) => applyTextStyle({ text }),
    [applyTextStyle],
  );

  /** Validates, stores (original + preview) and places an uploaded photo (or, with `replace`, swaps the selected one). */
  const addImage = useCallback(async (file: File, replace = false) => {
    const dc = designRef.current;
    const engine = engineRef.current;
    if (!dc || !engine) return;
    setBusy(true);
    setNotice(null);
    try {
      const prepared = await prepareImage(file);
      const id = newId();
      await putAsset({
        id,
        name: file.name,
        mime: file.type,
        widthPx: prepared.widthPx,
        heightPx: prepared.heightPx,
        original: file,
        preview: prepared.preview,
        createdAt: Date.now(),
      });
      const url = await previewUrl(id);
      if (!url)
        throw new ImageUploadError(
          "We couldn't add that photo. Please try again.",
          "decode",
        );
      const meta = {
        assetId: id,
        sourceWidthPx: prepared.widthPx,
        sourceHeightPx: prepared.heightPx,
      };
      if (replace) await engine.replaceImage(dc.canvas, url, meta);
      else await engine.addImage(dc.canvas, dc.area, url, meta);
    } catch (err) {
      console.error("[editor] image upload failed", err);
      setNotice(
        err instanceof ImageUploadError
          ? err.message
          : "We couldn't add that photo. Please try another one.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const copySelected = useCallback(
    () => run((e, dc) => void e.duplicateSelected(dc.canvas, dc.area)),
    [run],
  );

  /** What the crop screen needs for the selected photo, or null if it isn't a photo. */
  const getCropTarget = useCallback((): CropTarget | null => {
    const engine = engineRef.current;
    const obj = designRef.current?.canvas.getActiveObject();
    if (!engine || !engine.isAssetImage(obj)) return null;
    const full = engine.getCrop(obj);
    const previewW = obj.width / full.w;
    const previewH = obj.height / full.h;
    return {
      src: obj.getSrc(),
      imageAspect: previewW / previewH,
      rect: full,
      shape: engine.getFrameShape(obj),
    };
  }, []);

  const setCustomizable = useCallback(
    (value: boolean) => run((e, dc) => e.setCustomizable(dc.canvas, value)),
    [run],
  );

  const applyCrop = useCallback(
    (rect: NormRect, shape: FrameShape | null) =>
      // Soft shadows are only OK on mugs; apparel prints none (vendors unconfirmed).
      run((e, dc) => e.applyCrop(dc.canvas, rect, shape, product.id === "mug")),
    [run, product.id],
  );

  /** Clear the selection (e.g. tap on empty space around the canvas). */
  const deselect = useCallback(
    () =>
      run((_, dc) => {
        if (!dc.canvas.getActiveObject()) return;
        dc.canvas.discardActiveObject();
        dc.canvas.requestRenderAll();
      }),
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
    placeholders,
    selection,
    guides,
    canUndo,
    canRedo,
    undo,
    redo,
    addText,
    addImage,
    busy,
    notice,
    dismissNotice,
    deselect,
    copySelected,
    getCropTarget,
    applyCrop,
    setCustomizable,
    quality,
    deleteSelected,
    straighten,
    centre,
    applyTextStyle,
    setText,
    getDesign,
  };
}

function describe(
  engine: Engine,
  obj: FabricObject | undefined,
): SelectionInfo | null {
  if (!obj) return null;
  const c = obj.getCenterPoint();
  const dpi = engine.objectDpi(obj);
  return {
    kind: obj.type,
    centerXMm: c.x,
    centerYMm: c.y,
    widthMm: obj.getScaledWidth(),
    heightMm: obj.getScaledHeight(),
    angle: ((obj.angle % 360) + 360) % 360,
    customizable: engine.isCustomizable(obj),
    text: getTextStyle(obj),
    dpi: dpi === null ? null : Math.round(dpi),
    dpiStatus: dpi === null ? null : dpiStatus(dpi),
  };
}
