import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { quick_meal_id } = await req.json();
  if (!quick_meal_id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { data: meal, error: mealErr } = await supabase
    .from("quick_meals")
    .select("*")
    .eq("id", quick_meal_id)
    .eq("user_id", user.id)
    .single();

  if (mealErr || !meal) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });

  const { error: insertErr } = await supabase.from("food_logs").insert({
    user_id: user.id,
    meal_type: meal.meal_type,
    source: "quick_meal",
    quick_meal_id: meal.id,
    description: meal.name,
    photo_url: meal.photo_url,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
  });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await supabase
    .from("quick_meals")
    .update({ times_used: (meal.times_used ?? 0) + 1 })
    .eq("id", meal.id);

  return NextResponse.json({ ok: true });
}
