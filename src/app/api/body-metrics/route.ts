import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { jacksonPollock3SiteBodyFat } from "@/lib/bodyfat";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { weight_kg, skinfold_chest_mm, skinfold_abdomen_mm, skinfold_thigh_mm } = await req.json();

  const { data: profile } = await supabase.from("profile").select("age").eq("user_id", user.id).maybeSingle();

  let bodyFatPct: number | null = null;
  if (skinfold_chest_mm && skinfold_abdomen_mm && skinfold_thigh_mm && profile?.age) {
    bodyFatPct = jacksonPollock3SiteBodyFat({
      chestMm: Number(skinfold_chest_mm),
      abdomenMm: Number(skinfold_abdomen_mm),
      thighMm: Number(skinfold_thigh_mm),
      age: profile.age,
    });
  }

  const { data, error } = await supabase
    .from("body_metrics")
    .insert({
      user_id: user.id,
      weight_kg: weight_kg ?? null,
      skinfold_chest_mm: skinfold_chest_mm ?? null,
      skinfold_abdomen_mm: skinfold_abdomen_mm ?? null,
      skinfold_thigh_mm: skinfold_thigh_mm ?? null,
      body_fat_pct: bodyFatPct,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, metric: data });
}
