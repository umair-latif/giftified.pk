# Accounts: sign-in, sign-up, Google, password reset (task 20)

Customers are **WooCommerce customers** (WP admin → Users/Customers). There is no extra database:
the sign-in cookie is signed (`giftified_session`, 30 days), password-reset links are signed (1 hour).
Guest checkout is unchanged; an order placed while signed in carries the WooCommerce `customer_id`.

## 1. WordPress plugins

| Plugin                                                        | Why                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **JWT Authentication for WP REST API**                        | Our server checks email + password through `POST /wp-json/jwt-auth/v1/token`.       |
| **Limit Login Attempts Reloaded** (or any login-limit plugin) | Stops password guessing on the WordPress side (we also limit per IP and per email). |

**JWT plugin setup** (needs a secret and one server rule):

1. `wp-config.php`: `define('JWT_AUTH_SECRET_KEY', '<long random string>');` and
   `define('JWT_AUTH_CORS_ENABLE', false);` (we call it server-side, not from browsers).
2. Apache/LiteSpeed `.htaccess` (so the `Authorization` header and POST body reach PHP), inside
   `# BEGIN WordPress`, above the WordPress rules:
   `RewriteCond %{HTTP:Authorization} ^(.*)` / `RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]`
3. Check: `curl -X POST https://<WC_URL>/wp-json/jwt-auth/v1/token -d 'username=<email>&password=<pw>'`
   returns a `token`. A 404 means the plugin isn't active; sign-in then fails with an error in the logs.

**Login limiter and our server's IP.** WordPress sees every sign-in coming from _our server_. We send the
customer's real IP in `X-Forwarded-For`. In the plugin's settings, set the "connection type / origin
header" to **behind a reverse proxy (X-Forwarded-For)**. Otherwise a few failed logins could lock out
every customer at once. Allow-list our server's IP too if the plugin offers it.

## 2. Environment variables (`.env.example`)

- `AUTH_SECRET` — optional; signs cookies and links. Default: derived from `WC_WEBHOOK_SECRET`.
  Changing it signs everyone out and voids open reset links.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — "Continue with Google". Buttons stay hidden while empty.
- `RESEND_API_KEY`, `EMAIL_FROM` — reset emails. Without them, production refuses to send (the reset page
  still answers normally, and the failure is logged).
- `APP_URL` — public origin; used for the reset link and the Google redirect URI.

## 3. Google OAuth client (5 minutes)

1. Google Cloud console → APIs & Services → **OAuth consent screen**: External, app name Giftified.pk,
   scopes `openid`, `email`, `profile`. Publish it (otherwise only test users can sign in).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   Authorised redirect URIs: `https://<APP_URL host>/api/auth/google/callback`
   (add `http://localhost:3000/api/auth/google/callback` for local testing).
3. Copy the client ID and secret into the environment.

Rules we apply: only a **verified** Google email is accepted; the same email is the same account as
email + password (a Google-created account gets a random password; the customer can set one with
_Forgot password_).

## 4. Resend

1. Add and verify your domain in Resend (DNS records), create an API key.
2. `EMAIL_FROM="Giftified.pk <hello@giftified.pk>"` must be on that verified domain.

## 5. How it behaves

- **Sign-in errors** never say whether the email exists. **Forgot password** always answers "if there is an
  account…".
- **Limits** (in memory, per server instance): sign-in 10 failures / 15 min per IP and 5 / 15 min per email;
  sign-up 10 / hour per IP; reset 5 / hour per IP and 3 / hour per email. Move them to a shared store
  before running several servers (same note as `/track`).
- **Reset links** work once: they embed the customer's `date_modified`, and saving the new password changes it.
- **Header** shows a dot on the account icon from a plain `giftified_signed_in` cookie, so shop pages stay
  static and cached. The real check is always the signed cookie on the server.
- `?next=` after sign-in is limited to paths on this site.

## 6. Troubleshooting

| Symptom                                                     | Likely cause                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every sign-in says "Wrong email or password"                | JWT plugin missing or `Authorization` header not passed (step 1), or the customer's password is wrong.                                                                                                                                                                                                                |
| "WordPress sign-in check failed (404)" in logs              | JWT plugin not active.                                                                                                                                                                                                                                                                                                |
| "We couldn’t reach the account service just now" on sign-in | The sign-in check threw; the cause is in the server log as `[auth] sign-in check failed`: `(404)` = JWT plugin not active; `JWT_AUTH_SECRET_KEY` = missing in wp-config.php; a 401 from `/customers` = the WooCommerce API key lacks Read access; timeout = WordPress unreachable. (This used to be a bare 500 page.) |
| Everyone is locked out                                      | Login limiter sees our server's IP (see the note in section 1).                                                                                                                                                                                                                                                       |
| Google button missing                                       | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` not set.                                                                                                                                                                                                                                                                  |
| Google returns "redirect_uri_mismatch"                      | The redirect URI in Google console differs from `APP_URL` + `/api/auth/google/callback`.                                                                                                                                                                                                                              |
| "Forgot password" answered 500 (older builds)               | `RESEND_API_KEY` / `EMAIL_FROM` not set in production: the email adapter threw outside the safety net. Fixed: it now logs `[auth] password reset email failed` and still shows the neutral message; set the two variables to actually send mail.                                                                      |
| No reset email                                              | Check the logs for `[auth] password reset email failed`; verify the Resend domain and key.                                                                                                                                                                                                                            |

## 7. Checkout for signed-in customers

- **Prefill:** checkout stays a static page; after it loads, if the "signed in" cookie is present, it asks the
  server for the customer's name, email and — if saved — phone and address (WooCommerce _billing_ fields), and
  fills only the fields that are still empty. Guests see nothing different.
- **Save to account:** while the account has no address, "Save these details to my account" is offered ticked;
  ticked, the order's phone + address are written to the customer's billing fields (best effort — never blocks
  the order). The next order is prefilled. Task 21 adds editing them in the account area.
- **Different delivery address:** "Deliver to a different place" adds a delivery block (optional receiver name,
  city, address, landmark). Billing stays the customer's own; WooCommerce's _shipping_ address becomes the
  delivery one, delivery is priced for the delivery city, and the print vendor / tracking pages use it.
