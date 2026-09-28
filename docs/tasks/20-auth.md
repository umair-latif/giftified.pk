# 20 — Accounts: sign-in and sign-up

**Branch:** `feat/auth` · **Owner:** Lead · **Needs:** Phase A done

Plan §5 "Accounts": WooCommerce customers are the accounts; stateless signed session cookie;
**Continue with Google**; **email + password** (sign-up creates the WC customer with a password;
sign-in via the _JWT Authentication for WP REST API_ plugin); **Forgot password** with a 1-hour signed
link sent via Resend (`src/lib/email`), new password saved with `PUT /customers/{id}`; _Limit Login
Attempts_ plugin + per-IP limit; orders placed while signed in get `customer_id`. Pages `/sign-in`,
`/sign-up`, `/reset-password`; header shows the account state. Ops doc for the two WP plugins and the
Google OAuth client. Guest checkout stays exactly as it is.
