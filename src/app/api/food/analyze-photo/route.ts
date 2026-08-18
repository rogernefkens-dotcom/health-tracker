import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { analyzeFoodPhoto } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "geen foto ontvangen" }, { status: 400 });

  try {
    const result = await analyzeFoodPhoto(imageBase64, mimeType || "image/jpeg");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "analyse mislukt" },
      { status: 500 }
    );
  }
}
