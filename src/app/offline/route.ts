/**
 * The page the service worker (public/sw.js) shows when there is no
 * connection. Plain self-contained HTML with inline CSS: offline, the app's
 * normal CSS/JS files may not be available. `/icons/icon-192.png` is cached
 * with it.
 */
export const dynamic = "force-static";

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14b8a6">
<meta name="robots" content="noindex">
<title>You're offline · DesignBanana</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;text-align:center;padding:24px;box-sizing:border-box}
  main{max-width:22rem}
  img{width:96px;height:96px}
  h1{font-size:1.5rem;margin:12px 0 8px}
  p{margin:0 0 20px;line-height:1.5;color:#444}
  button{font:inherit;font-weight:600;min-height:48px;padding:0 24px;border-radius:16px;border:3px solid #111;background:#ffe135;color:#111}
</style>
</head>
<body>
<main>
  <img src="/icons/icon-192.png" alt="" width="96" height="96">
  <h1>You're offline</h1>
  <p>DesignBanana needs an internet connection. Your designs and cart are saved on this phone: check your connection and try again.</p>
  <button type="button" onclick="location.reload()">Try again</button>
</main>
</body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
