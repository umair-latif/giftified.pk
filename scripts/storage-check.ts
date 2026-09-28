/**
 * pnpm storage:check — checks the R2/S3 settings in .env.local end to end:
 * write, read, signed download link, signed upload link, and the CORS rule
 * that lets phones upload directly. Leaves nothing behind.
 */
import { loadEnvConfig } from "@next/env";
import { createS3Storage } from "../src/lib/storage/s3";

loadEnvConfig(process.cwd());
const {
  STORAGE_ENDPOINT,
  STORAGE_BUCKET,
  STORAGE_ACCESS_KEY_ID,
  STORAGE_SECRET_ACCESS_KEY,
} = process.env;
if (
  !STORAGE_ENDPOINT ||
  !STORAGE_BUCKET ||
  !STORAGE_ACCESS_KEY_ID ||
  !STORAGE_SECRET_ACCESS_KEY
) {
  console.error(
    "Set STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY in .env.local first.",
  );
  process.exit(1);
}
if (/\/[^/]+\/?$/.test(new URL(STORAGE_ENDPOINT).pathname)) {
  console.error(
    "STORAGE_ENDPOINT must not include the bucket name — use only https://<account>.r2.cloudflarestorage.com",
  );
  process.exit(1);
}

const origin =
  process.argv.find((a) => a.startsWith("--origin="))?.slice(9) ??
  "https://giftified.microw.me";
const s = createS3Storage({
  endpoint: STORAGE_ENDPOINT,
  bucket: STORAGE_BUCKET,
  accessKeyId: STORAGE_ACCESS_KEY_ID,
  secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
});
const key = `healthcheck/${Date.now()}.txt`;
const upKey = `${key}.upload`;
let failed = false;
const ok = (m: string) => console.log(`✓ ${m}`);
const bad = (m: string) => {
  failed = true;
  console.error(`✗ ${m}`);
};

async function main() {
  await s.put(key, "giftified storage check", { contentType: "text/plain" });
  ok(`Write to bucket "${STORAGE_BUCKET}"`);

  const got = await s.get(key);
  if (
    new TextDecoder().decode(got ?? new Uint8Array()) ===
    "giftified storage check"
  )
    ok("Read it back");
  else bad("Read back different content");

  const getUrl = await s.presignGet(key, { expiresInS: 60 });
  const dl = await fetch(getUrl);
  if (dl.ok) ok("Signed download link works");
  else bad(`Signed download link failed (${dl.status})`);

  const putUrl = await s.presignPut(upKey, {
    contentType: "text/plain",
    expiresInS: 60,
  });
  const up = await fetch(putUrl, {
    method: "PUT",
    body: "via signed link",
    headers: { "content-type": "text/plain" },
  });
  if (up.ok) ok("Signed upload link works");
  else
    bad(
      `Signed upload link failed (${up.status}): ${(await up.text()).slice(0, 200)}`,
    );

  const pre = await fetch(putUrl, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  const allowed = pre.headers.get("access-control-allow-origin");
  if (pre.ok && (allowed === origin || allowed === "*"))
    ok(`CORS allows phone uploads from ${origin}`);
  else
    bad(
      `CORS doesn't allow uploads from ${origin} (status ${pre.status}). Check the bucket's CORS policy.`,
    );

  await s.delete(key);
  await s.delete(upKey);
  ok("Cleaned up");
}

main()
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    bad(msg);
    if (/\(403\)/.test(msg))
      console.error(
        "  Access denied — check the key pair and that the token has Object Read & Write on this bucket.",
      );
    if (/\(404\)/.test(msg))
      console.error(
        "  Bucket not found — check STORAGE_BUCKET and that STORAGE_ENDPOINT has no bucket name in it.",
      );
    if (msg === "fetch failed")
      console.error("  Couldn't reach STORAGE_ENDPOINT — check the address.");
  })
  .finally(() => process.exit(failed ? 1 : 0));
