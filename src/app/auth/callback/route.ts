import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Exchanges the PKCE "code" from a Supabase magic-link email for a real
// session, then redirects into the app. Without this route, the magic
// link lands on the site but the login never actually completes.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", req.url));
}
