import { z } from "zod";

/**
 * "Continue with Google": the OAuth 2.0 authorization-code flow, done by hand
 * (three fetches, no library). We only trust an email Google says is verified.
 */
export const OAUTH_COOKIE = "giftified_oauth";
export const OAUTH_PURPOSE = "google-state";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

export function googleConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): GoogleConfig | null {
  return env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : null;
}

export function googleAuthUrl(
  config: GoogleConfig,
  redirectUri: string,
  state: string,
): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export interface GoogleProfile {
  email: string;
  name: string;
}

const tokenSchema = z.object({ access_token: z.string() });
const profileSchema = z.object({
  email: z.string(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  given_name: z.string().optional(),
});

/** Exchanges the code and reads the profile; null if anything is off or the email isn't verified. */
export async function fetchGoogleProfile(
  config: GoogleConfig,
  redirectUri: string,
  code: string,
  doFetch: typeof fetch = fetch,
): Promise<GoogleProfile | null> {
  const tokenRes = await doFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenRes.ok) {
    // Google's error code only ("invalid_client", "redirect_uri_mismatch",
    // "invalid_grant"): enough to fix the setup, no secrets.
    const body = (await tokenRes.json().catch(() => ({}))) as {
      error?: unknown;
    };
    console.warn(
      `[auth] google token exchange failed (${tokenRes.status}): ${String(body.error ?? "unknown")}`,
    );
    return null;
  }
  const token = tokenSchema.safeParse(await tokenRes.json());
  if (!token.success) {
    console.warn("[auth] google token response not understood");
    return null;
  }

  const profileRes = await doFetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${token.data.access_token}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!profileRes.ok) {
    console.warn(`[auth] google profile request failed (${profileRes.status})`);
    return null;
  }
  const p = profileSchema.safeParse(await profileRes.json());
  if (!p.success || p.data.email_verified !== true) {
    console.warn("[auth] google profile missing or email not verified");
    return null;
  }
  return {
    email: p.data.email.trim().toLowerCase(),
    name: (p.data.name ?? p.data.given_name ?? "").trim(),
  };
}
