import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json();
  const {
    meal_type,
    source,
    description,
    photo_url,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    ai_confidence,
    portion_note,
    quick_meal_id,
    save_as_quick_meal,
    quick_meal_name,
  } = body;

  const { data: logRow, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      meal_type: meal_type || null,
      source: source || "manual",
      quick_meal_id: quick_meal_id || null,
      description: description || null,
      photo_url: photo_url || null,
      calories: calories ?? null,
      protein_g: protein_g ?? null,
      carbs_g: carbs_g ?? null,
      fat_g: fat_g ?? null,
      ai_confidence: ai_confidence ?? null,
      portion_note: portion_note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (save_as_quick_meal && quick_meal_name) {
    await supabase.from("quick_meals").insert({
      user_id: user.id,
      name: quick_meal_name,
      meal_type: meal_type || null,
      calories: calories ?? null,
      protein_g: protein_g ?? null,
      carbs_g: carbs_g ?? null,
      fat_g: fat_g ?? null,
      photo_url: photo_url || null,
    });
  }

  return NextResponse.json({ ok: true, log: logRow });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { error } = await supabase.from("food_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
