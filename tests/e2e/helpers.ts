import { expect, type Page } from "@playwright/test";

export const status = (page: Page) => page.getByTestId("editor-status");

export interface Readout {
  x: number;
  y: number;
  w: number;
  angle: number;
}

export async function readout(page: Page): Promise<Readout> {
  const text = (await status(page).textContent()) ?? "";
  const m = text.match(/centre (\d+), (\d+) mm · (\d+) × \d+ mm · (\d+)°/);
  expect(m, `unexpected status: ${text}`).not.toBeNull();
  return {
    x: Number(m![1]),
    y: Number(m![2]),
    w: Number(m![3]),
    angle: Number(m![4]),
  };
}

export async function canvasBox(page: Page) {
  const box = (await page.locator("canvas.upper-canvas").boundingBox())!;
  return {
    ...box,
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    pxPerMm: box.width / 216,
  };
}

export async function openEditorWithText(page: Page) {
  await page.goto("/design/mug");
  await expect(status(page)).toHaveText(/0 layers/);
  await expect(
    page.getByRole("button", { name: "Text", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(status(page)).toHaveText(/textbox · centre 108, 45 mm/);
}

/** Two-finger pinch/twist around (cx, cy) via raw CDP touch events. */
export async function pinch(
  page: Page,
  cx: number,
  cy: number,
  opts: {
    fromRadius: number;
    toRadius: number;
    degrees: number;
    steps?: number;
  },
) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: string, pts: { x: number; y: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: pts.map((p, id) => ({ ...p, id })),
    } as never);
  const at = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [
      { x: cx - r * Math.cos(a), y: cy - r * Math.sin(a) },
      { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) },
    ];
  };
  const steps = opts.steps ?? 5;
  await send("touchStart", at(opts.fromRadius, 0));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await send(
      "touchMove",
      at(
        opts.fromRadius + (opts.toRadius - opts.fromRadius) * t,
        opts.degrees * t,
      ),
    );
  }
  await send("touchEnd", []);
  await cdp.detach();
}
