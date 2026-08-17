import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-health";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state"); // set in /api/auth/google

  if (!code || !userId) {
    return NextResponse.redirect(new URL("/settings?error=missing_code", req.url));
  }

  const redirectUri = new URL("/api/auth/callback/google", req.url).toString();

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      // Happens if the user had already granted consent before and Google
      // skipped the consent screen. Force a fresh consent by disconnecting
      // the app at https://myaccount.google.com/permissions and retrying.
      return NextResponse.redirect(
        new URL("/settings?error=no_refresh_token", req.url)
      );
    }

    const supabase = createServiceClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase.from("wearable_connections").upsert(
      {
        user_id: userId,
        provider: "google_health",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(new URL("/settings?connected=google_health", req.url));
  } catch (err) {
    console.error("Google Health OAuth callback failed", err);
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", req.url));
  }
}
