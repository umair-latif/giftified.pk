import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const design = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
);

test("checkout step 1: store a design and upload its photo through the returned link", async ({
  request,
}) => {
  const withPhoto = {
    ...design,
    fabric: {
      ...design.fabric,
      objects: [
        ...design.fabric.objects,
        {
          type: "Image",
          src: "asset:photo1",
          assetId: "photo1",
          sourceWidthPx: 1200,
          sourceHeightPx: 800,
          width: 1200,
          height: 800,
          scaleX: 0.05,
          scaleY: 0.05,
        },
      ],
    },
  };
  const res = await request.post("/api/designs", {
    data: {
      design: withPhoto,
      assets: [{ assetId: "photo1", contentType: "image/png", size: 4 }],
    },
  });
  expect(res.status()).toBe(201);
  const ticket = (await res.json()) as {
    designId: string;
    uploads: { url: string; contentType: string }[];
  };
  expect(ticket.designId).toMatch(/^[0-9a-f-]{36}$/);
  expect(ticket.uploads).toHaveLength(1);

  const put = await request.put(ticket.uploads[0]!.url, {
    data: Buffer.from([137, 80, 78, 71]),
    headers: { "content-type": "image/png" },
  });
  expect(put.status()).toBe(200);
  const back = await request.get(ticket.uploads[0]!.url);
  expect((await back.body()).length).toBe(4);
});

test("rejects designs whose photos don't match", async ({ request }) => {
  const res = await request.post("/api/designs", {
    data: {
      design,
      assets: [{ assetId: "ghost", contentType: "image/png", size: 4 }],
    },
  });
  expect(res.status()).toBe(422);
});
