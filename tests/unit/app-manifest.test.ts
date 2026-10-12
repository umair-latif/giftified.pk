import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const root = process.cwd();

describe("installed app manifest", () => {
  const m = manifest();

  it("is installable: name, standalone, start page", () => {
    expect(m.name).toBe("DesignBanana");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.theme_color).toBe("#14b8a6");
  });

  it("has 192 + 512 icons and a maskable one, all present in public/", () => {
    const icons = m.icons ?? [];
    expect(icons.map((i) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of icons)
      expect(existsSync(join(root, "public", i.src))).toBe(true);
  });

  it("shortcuts point at real routes", () => {
    expect((m.shortcuts ?? []).map((s) => s.url)).toEqual([
      "/design/mug",
      "/design/tshirt",
      "/design/hoodie",
      "/track",
    ]);
  });
});

describe("service worker", () => {
  const sw = readFileSync(join(root, "public/sw.js"), "utf8");

  it("only handles page navigations (no stale-asset caching)", () => {
    expect(sw).toContain('request.mode !== "navigate"');
    expect(sw).not.toMatch(/cache\.put|addAll\(\[?\s*["']\/_next/);
  });

  it("precaches the offline page, which exists as a route", () => {
    expect(sw).toContain('const OFFLINE_URL = "/offline"');
    expect(existsSync(join(root, "src/app/offline/route.ts"))).toBe(true);
  });
});
