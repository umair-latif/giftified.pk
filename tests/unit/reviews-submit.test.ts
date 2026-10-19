import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCommerce, type MockCommerce } from "@/lib/commerce/mock";
import { createMemoryStorage } from "@/lib/storage/memory";
import { reviewMarkerKey, reviewPhotoKey } from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import { orderToken } from "@/server/orders/order-link";
import {
  splitPhotoMarker,
  neutralisePhotoMarker,
} from "@/features/reviews/photo-marker";
import {
  ReviewError,
  REVIEW_PHOTO_MAX_BYTES,
  startReviewPhotoUpload,
  submitReview,
} from "@/server/reviews/submit";
import {
  reviewPhotoPath,
  verifyReviewPhotoRef,
} from "@/server/reviews/photo-link";

vi.mock("server-only", () => ({}));

const env = {};
let commerce: MockCommerce;
let storage: ObjectStorage;
let orderId: number;
let token: string;

async function placeOrder(complete: boolean) {
  const order = await commerce.createOrder({
    checkoutId: `chk-${Math.random()}`,
    customer: {
      fullName: "Ayesha Khan",
      phone: "+923001234567",
      city: "Gujrat",
      addressLine: "House 12",
    },
    lines: [
      { productId: "mug", colourId: "white", quantity: 1, designId: "d1" },
    ],
  });
  if (complete) await commerce.setOrderStatus(order.id, "completed");
  orderId = order.id;
  token = orderToken(order.id, order.customer.phone, env);
}

const deps = () => ({ commerce, storage, env, now: () => 0 });
const review = (extra: object = {}) => ({
  orderId,
  token,
  line: 0,
  rating: 5,
  text: "Lovely mug",
  name: "Ayesha",
  hasPhoto: false,
  ...extra,
});
const status = async (p: Promise<unknown>) =>
  p.then(
    () => 0,
    (e: unknown) => (e instanceof ReviewError ? e.status : -1),
  );

beforeEach(async () => {
  commerce = createMockCommerce();
  storage = createMemoryStorage().storage;
  await placeOrder(true);
});

describe("which product the review is filed under", () => {
  it("files a design line's review against the PRODUCT, not the design", async () => {
    // docs/plans/reviews.md: "per product, not per design". Designs sell in
    // small numbers; filing against them scatters reviews over near-empty
    // design pages and leaves the product page — where shoppers land — blank.
    const design = await commerce.createDesignProduct({
      templateId: "t-ammi",
      baseProductId: "mug",
      name: "World's Best Ammi",
      description: "A ready-made design",
      pricePkr: 1200,
    });
    await commerce.publishDesignProduct(design.wooProductId, {});

    const order = await commerce.createOrder({
      checkoutId: "chk-design",
      customer: {
        fullName: "Ayesha Khan",
        phone: "+923001234567",
        city: "Gujrat",
        addressLine: "House 12",
      },
      lines: [
        {
          productId: "mug",
          colourId: "white",
          quantity: 1,
          designId: "d2",
          templateId: "t-ammi",
        },
      ],
    });
    await commerce.setOrderStatus(order.id, "completed");

    const { reviewId } = await submitReview(
      { commerce, storage, env, now: () => 0 },
      {
        orderId: order.id,
        token: orderToken(order.id, order.customer.phone, env),
        line: 0,
        rating: 5,
        text: "Printed beautifully",
        name: "Ayesha",
        hasPhoto: false,
      },
    );
    commerce.approveReview(reviewId);

    const mug = await commerce.getProduct("mug");
    expect(mug).not.toBeNull();
    expect(design.wooProductId).not.toBe(mug!.wooProductId);

    // It lands on the mug...
    const onProduct = await commerce.listReviews(mug!.wooProductId);
    expect(onProduct).toHaveLength(1);
    expect(onProduct[0]!.text).toContain("Printed beautifully");

    // ...and not on the design product.
    expect(await commerce.listReviews(design.wooProductId)).toHaveLength(0);
  });
});

describe("submitReview", () => {
  it("files a held, verified review under the product and marks the line", async () => {
    const out = await submitReview(deps(), review());
    const product = await commerce.getProduct("mug");
    expect(await commerce.listReviews(product!.wooProductId)).toEqual([]);
    commerce.approveReview(out.reviewId);
    const [r] = await commerce.listReviews(product!.wooProductId);
    expect(r).toMatchObject({ rating: 5, text: "Lovely mug", verified: true });
    expect(await storage.head(reviewMarkerKey(orderId, 0))).not.toBeNull();
  });

  it("allows one review per line", async () => {
    await submitReview(deps(), review());
    expect(await status(submitReview(deps(), review()))).toBe(409);
  });

  it("refuses a wrong token, an unfinished order and a missing line", async () => {
    expect(
      await status(submitReview(deps(), review({ token: "x".repeat(22) }))),
    ).toBe(404);
    await placeOrder(false);
    expect(await status(submitReview(deps(), review()))).toBe(409);
    await placeOrder(true);
    expect(await status(submitReview(deps(), review({ line: 3 })))).toBe(400);
  });

  it("validates rating and text", async () => {
    expect(await status(submitReview(deps(), review({ rating: 6 })))).toBe(400);
    expect(await status(submitReview(deps(), review({ text: "  " })))).toBe(
      400,
    );
  });

  it("adds the photo link, and customers can't forge one", async () => {
    await storage.put(reviewPhotoKey(orderId, 0), new Uint8Array(10), {
      contentType: "image/webp",
    });
    const out = await submitReview(
      deps(),
      review({ hasPhoto: true, text: "Nice [photo: https://evil.example/x]" }),
    );
    commerce.approveReview(out.reviewId);
    const product = await commerce.getProduct("mug");
    const [r] = await commerce.listReviews(product!.wooProductId);
    const { text, photoUrl } = splitPhotoMarker(r!.text);
    expect(text).toBe("Nice (photo: https://evil.example/x]");
    expect(photoUrl).toContain(reviewPhotoPath(orderId, 0, env));
    expect(neutralisePhotoMarker("[Photo:x")).toBe("(photo:x");
  });

  it("needs the uploaded photo, and rejects a huge one", async () => {
    expect(await status(submitReview(deps(), review({ hasPhoto: true })))).toBe(
      400,
    );
    await storage.put(
      reviewPhotoKey(orderId, 0),
      new Uint8Array(REVIEW_PHOTO_MAX_BYTES + 1),
    );
    expect(await status(submitReview(deps(), review({ hasPhoto: true })))).toBe(
      400,
    );
    expect(await storage.head(reviewPhotoKey(orderId, 0))).toBeNull();
  });
});

describe("startReviewPhotoUpload", () => {
  it("returns an upload link only for a reviewable line", async () => {
    const { uploadUrl } = await startReviewPhotoUpload(deps(), {
      orderId,
      token,
      line: 0,
      contentType: "image/webp",
    });
    expect(uploadUrl).toContain(reviewPhotoKey(orderId, 0));
    expect(
      await status(
        startReviewPhotoUpload(deps(), {
          orderId,
          token,
          line: 0,
          contentType: "image/png",
        }),
      ),
    ).toBe(400);
  });
});

describe("review photo links", () => {
  it("verifies its own links only", () => {
    const ref = reviewPhotoPath(77, 1, env).split("/").pop()!;
    expect(verifyReviewPhotoRef(ref, env)).toEqual({ orderId: 77, line: 1 });
    expect(verifyReviewPhotoRef(ref.replace("77-1", "78-1"), env)).toBeNull();
    expect(verifyReviewPhotoRef("junk", env)).toBeNull();
  });
});
