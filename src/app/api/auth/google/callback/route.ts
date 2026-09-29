import { NextResponse, type NextRequest } from "next/server";
import { customerForGoogle } from "@/features/auth/service";
import { getCommerce } from "@/lib/commerce";
import { startSession } from "@/server/auth/cookies";
import {
  fetchGoogleProfile,
  googleConfigFromEnv,
  OAUTH_COOKIE,
  OAUTH_PURPOSE,
} from "@/server/auth/google";
import { safeNextPath } from "@/server/auth/safe-next";
import { authSecret } from "@/server/auth/secret";
import { verifyToken } from "@/server/auth/token";
import { appBaseUrl } from "@/server/files/links";

/**
 * Google sends the customer back here with `?code&state`. The state must be
 * our signed token AND its nonce must match the cookie set when they left —
 * otherwise someone could sign a victim into the attacker's account.
 */
export async function GET(request: NextRequest) {
  const base = appBaseUrl();
  const fail = () => {
    const res = NextResponse.redirect(`${base}/sign-in?error=google`);
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return res;
  };

  const config = googleConfigFromEnv();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const nonce = request.cookies.get(OAUTH_COOKIE)?.value;
  if (!config || !code || !state || !nonce) return fail();

  const claims = verifyToken(OAUTH_PURPOSE, state, authSecret());
  if (!claims || claims.n !== nonce) return fail();

  try {
    const profile = await fetchGoogleProfile(
      config,
      `${base}/api/auth/google/callback`,
      code,
    );
    if (!profile) return fail();
    const customer = await customerForGoogle(profile, getCommerce());
    await startSession(customer.id);
    const res = NextResponse.redirect(`${base}${safeNextPath(claims.next)}`);
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return res;
  } catch (err) {
    console.error("[auth] google sign-in failed", err);
    return fail();
  }
}
