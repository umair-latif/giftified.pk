import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authSecret } from "@/server/auth/secret";
import {
  googleAuthUrl,
  googleConfigFromEnv,
  OAUTH_COOKIE,
  OAUTH_PURPOSE,
} from "@/server/auth/google";
import { safeNextPath } from "@/server/auth/safe-next";
import { signToken } from "@/server/auth/token";
import { appBaseUrl } from "@/server/files/links";

/** Starts "Continue with Google": sets a short-lived nonce cookie and redirects to Google. */
export async function GET(request: NextRequest) {
  const config = googleConfigFromEnv();
  const base = appBaseUrl();
  if (!config) return NextResponse.redirect(`${base}/sign-in?error=google`);

  const nonce = randomBytes(16).toString("base64url");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const state = signToken(
    OAUTH_PURPOSE,
    { n: nonce, next, e: Math.floor(Date.now() / 1000) + 600 },
    authSecret(),
  );
  const res = NextResponse.redirect(
    googleAuthUrl(config, `${base}/api/auth/google/callback`, state),
  );
  res.cookies.set(OAUTH_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
