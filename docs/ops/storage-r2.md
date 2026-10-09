# File storage — Cloudflare R2 setup

Customer photos (originals) and print files live in a **private** R2 bucket. Phones upload
photos directly to R2 with short-lived signed links; the app never makes files public.

## 1. Bucket

Cloudflare dashboard → **R2 Object Storage** → **Create bucket** → name e.g. `giftified-test`,
location _Automatic_. **Don't** enable public access or the `r2.dev` URL.

## 2. CORS (lets phones upload directly)

Bucket → **Settings** → **CORS Policy** → paste (add your own test origins as needed):

```json
[
  {
    "AllowedOrigins": [
      "https://designbanana.pk",
      "https://www.designbanana.pk",
      "http://localhost:3000",
      "http://192.168.0.32:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Vercel preview deployments.** Every deployment has its own URL
(`giftified-<hash>-<team>.vercel.app`), and CORS needs the exact origin, so a policy listing one
preview breaks on the next. The bucket is private and every request needs a short-lived signed link,
so for a **test bucket** it is fine to use `"AllowedOrigins": ["*"]` (keep the other settings). For
the production bucket list only the real domain(s). Symptom of a missing origin: the browser console
says "blocked by CORS policy" on a `...r2.cloudflarestorage.com/...?X-Amz-...` request (photos in a
template or design don't load, uploads fail).

## 3. API token

R2 → **Manage API tokens** → **Create API token** → permission **Object Read & Write**, limited to
the bucket. From the result page you need **Access Key ID**, **Secret Access Key** (shown once) and
the S3 endpoint. You do **not** need the "Token value".

## 4. Settings

| Variable                    | Value                                                                         |
| --------------------------- | ----------------------------------------------------------------------------- |
| `STORAGE_ENDPOINT`          | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` — **without** the bucket name |
| `STORAGE_BUCKET`            | `giftified-test`                                                              |
| `STORAGE_ACCESS_KEY_ID`     | Access Key ID                                                                 |
| `STORAGE_SECRET_ACCESS_KEY` | Secret Access Key                                                             |

Put them in `.env.local` (your PC) and in Vercel → Environment Variables → **Production**, then redeploy.

## 5. Check

```powershell
pnpm storage:check
pnpm storage:check --origin=http://localhost:3000   # check another origin's CORS
```

Expect ✓ for write, read, signed download, signed upload, CORS and clean-up.

| Message                    | Fix                                                                    |
| -------------------------- | ---------------------------------------------------------------------- |
| Access denied (403)        | Wrong key pair, or the token lacks Object Read & Write on this bucket  |
| Bucket not found (404)     | `STORAGE_BUCKET` typo, or the bucket name is inside `STORAGE_ENDPOINT` |
| CORS doesn't allow uploads | Add that exact origin (scheme + host + port) to the CORS policy        |

## Where things go

`designs/<designId>/design.json`, `designs/<designId>/assets/<assetId>` (original photos),
`orders/<orderId>/line-<n>/print.png` and `proof.pdf`. Switching provider (IONOS, Nayatel, AWS…)
is only a change of the four settings.
