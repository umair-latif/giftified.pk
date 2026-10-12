# Installable app (PWA)

DesignBanana can be installed from the browser like an app (own icon, full screen, no address bar).
It is still the live website: every deploy is picked up on the next open, nothing to update.

## What ships

- `src/app/manifest.ts` → `/manifest.webmanifest`: name, standalone display, theme colour `#14b8a6`,
  icons, long-press shortcuts (mug, T-shirt, hoodie, track order).
- `public/icons/*` from `python3 scripts/build-app-icons.py` (source `src/app/icon.png`). The
  maskable icon keeps the banana inside Android's 80% safe zone.
- `public/sw.js` (registered in production by `components/pwa/register-service-worker.tsx`): shows
  `/offline` when a page can't load. It caches nothing else, so a deploy is never shown stale.
  Served with `Cache-Control: no-cache` (`next.config.ts`).
- Footer button "Install the app" (`components/pwa/install-app-button.tsx`): Chrome's install dialog
  on Android/desktop; Share → Add to Home Screen steps on iPhone. Hidden once installed.

## How testers install

- **Android Chrome:** footer "Install the app", or ⋮ menu → Install app.
- **iPhone:** Safari only → Share → Add to Home Screen.
- Uninstalling removes only the shortcut; data stays in the browser unless site data is cleared.

## Trying it

Service workers only run on HTTPS (or localhost) and in a production build: `pnpm build && pnpm start`,
then Chrome DevTools → Application → Manifest / Service workers. Lighthouse's "Installable" check
should pass.

## Next (not built)

Push notifications (order updates) reuse `public/sw.js`; they need VAPID keys in Vercel env and a place
to store each phone's subscription (WooCommerce customer meta, keys without a leading `_`).
