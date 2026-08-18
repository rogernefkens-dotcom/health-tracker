import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import QuickMealTile from "@/components/QuickMealTile";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [{ data: profile }, { data: foodToday }, { data: wearable }, { data: quickMeals }] =
    await Promise.all([
      supabase.from("profile").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("logged_at", `${today}T00:00:00`)
        .order("logged_at", { ascending: true }),
      supabase
        .from("wearable_daily_data")
        .select("*")
        .eq("user_id", user!.id)
        .eq("data_date", yesterday)
        .maybeSingle(),
      supabase
        .from("quick_meals")
        .select("*")
        .eq("user_id", user!.id)
        .order("times_used", { ascending: false })
        .limit(6),
    ]);

  const totals = (foodToday ?? []).reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories ?? 0),
      protein: acc.protein + (f.protein_g ?? 0),
      carbs: acc.carbs + (f.carbs_g ?? 0),
      fat: acc.fat + (f.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calorieTarget = profile?.daily_calorie_target ?? 2200;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 max-w-md mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Vandaag</h1>
        <Link href="/settings" className="text-sm text-neutral-400 underline">
          instellingen
        </Link>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-5 mb-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">{totals.calories}</span>
          <span className="text-neutral-400">/ {calorieTarget} kcal</span>
        </div>
        <div className="h-2 rounded-full bg-neutral-800 mt-3 overflow-hidden">
          <div
            className="h-full bg-lime-400"
            style={{ width: `${Math.min(100, (totals.calories / calorieTarget) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-neutral-400 mt-3">
          <span>Eiwit {Math.round(totals.protein)}g</span>
          <span>Koolh. {Math.round(totals.carbs)}g</span>
          <span>Vet {Math.round(totals.fat)}g</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl bg-neutral-900 p-4">
          <p className="text-neutral-400 text-sm">Stappen (gister)</p>
          <p className="text-2xl font-semibold">{wearable?.steps ?? "—"}</p>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-4">
          <p className="text-neutral-400 text-sm">Slaap (gister)</p>
          <p className="text-2xl font-semibold">
            {wearable?.sleep_duration_min
              ? `${Math.round(wearable.sleep_duration_min / 60)}u`
              : "—"}
          </p>
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Snel toevoegen</h2>
          <Link href="/eten" className="text-sm text-lime-400 underline">
            + foto
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(quickMeals ?? []).map((m) => (
            <QuickMealTile key={m.id} meal={m} />
          ))}
          {(!quickMeals || quickMeals.length === 0) && (
            <p className="text-neutral-500 text-sm col-span-2">
              Nog geen standaardmaaltijden — voeg er een toe via een foodlog.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Vandaag gelogd</h2>
        <div className="flex flex-col gap-2">
          {(foodToday ?? []).map((f) => (
            <div
              key={f.id}
              className="rounded-xl bg-neutral-900 p-3 flex items-center justify-between"
            >
              <span>{f.description ?? "Maaltijd"}</span>
              <span className="text-neutral-400">{f.calories} kcal</span>
            </div>
          ))}
          {(!foodToday || foodToday.length === 0) && (
            <p className="text-neutral-500 text-sm">Nog niets gelogd vandaag.</p>
          )}
        </div>
      </section>
    </main>
  );
}
