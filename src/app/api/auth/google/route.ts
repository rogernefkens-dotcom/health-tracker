import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google-health";
import { createClient } from "@/lib/supabase-server";

// Kicks off the "Connect Google Health" flow. Call this from a button in
// the app settings page, e.g. <a href="/api/auth/google">Koppel Google Health</a>
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const redirectUri = new URL("/api/auth/callback/google", req.url).toString();
  // state carries the logged-in user id through the redirect so the callback
  // knows which profile to attach the tokens to.
  const authUrl = buildGoogleAuthUrl(redirectUri, user.id);

  return NextResponse.redirect(authUrl);
}
