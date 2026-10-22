import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Unit tests price carts of two mugs everywhere: keep the launch offer off
    // unless a test switches it on (OFFER.enabled = true).
    env: { OFFER_ENABLED: "0" },
  },
});
