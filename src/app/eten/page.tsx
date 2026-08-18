import { createClient } from "@/lib/supabase-server";
import FoodLogClient from "@/components/FoodLogClient";

export default async function EtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: quickMeals }, { data: foodToday }] = await Promise.all([
    supabase
      .from("quick_meals")
      .select("*")
      .eq("user_id", user!.id)
      .order("times_used", { ascending: false }),
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`)
      .order("logged_at", { ascending: false }),
  ]);

  return <FoodLogClient initialQuickMeals={quickMeals ?? []} initialLogs={foodToday ?? []} />;
}
