import { describe, expect, it } from "vitest";
import { shareFileName } from "@/features/editor/share-mockup";

describe("shareFileName", () => {
  it("is a tidy, brand-first file name", () => {
    expect(shareFileName("Custom Mug", "Front")).toBe(
      "designbanana-custom-mug-front.jpg",
    );
    expect(shareFileName("Custom T-Shirt", "On the table")).toBe(
      "designbanana-custom-t-shirt-on-the-table.jpg",
    );
    expect(shareFileName("Custom Mug", "")).toBe(
      "designbanana-custom-mug-view.jpg",
    );
  });
});
