import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { askCoach } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "geen bericht" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: latestMetric }, { data: foodToday }, { data: history }, { data: upcomingTraining }] =
    await Promise.all([
      supabase.from("profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("body_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("food_logs")
        .select("calories, protein_g, carbs_g, fat_g")
        .eq("user_id", user.id)
        .gte("logged_at", `${today}T00:00:00`),
      supabase
        .from("coach_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(20),
      supabase
        .from("training_plan")
        .select("scheduled_date, title, session_type, status")
        .eq("user_id", user.id)
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .limit(5),
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

  const daysToRace = profile?.target_event_date
    ? Math.ceil((new Date(profile.target_event_date).getTime() - Date.now()) / 86400000)
    : null;

  const systemContext = `Je bent een persoonlijke fitness coach en dietist voor Roger, in de app "Health Tracker". Antwoord altijd in het Nederlands, direct en praktisch, geen lange disclaimers. Korte, concrete antwoorden — geen essays, tenzij hij om detail vraagt.

Profiel:
- Leeftijd: ${profile?.age ?? "?"} jaar, lengte ${profile?.height_cm ?? "?"} cm
- Doel: ${profile?.goal ?? "vetverlies, strakker, fitter worden"}
- Event: ${profile?.target_event_name ?? "Gymrace (Men Buddies)"} op ${profile?.target_event_date ?? "3 oktober"}${
    daysToRace !== null ? ` (nog ${daysToRace} dagen)` : ""
  }
- Dagelijks calorieendoel: ${profile?.daily_calorie_target ?? 2200} kcal
- Dislikes: ${(profile?.dislikes ?? []).join(", ") || "geen bekend"}
- Bekend patroon: eet vaak een extra portie tijdens het avondeten — daar zit de meeste winst.
${
  latestMetric
    ? `- Laatste meting (${latestMetric.measured_at}): ${latestMetric.weight_kg ?? "?"} kg, vetpercentage ${
        latestMetric.body_fat_pct ?? "?"
      }%`
    : "- Nog geen lichaamsmetingen gelogd."
}

Vandaag al gegeten: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g eiwit, ${Math.round(
    totals.carbs
  )}g koolhydraten, ${Math.round(totals.fat)}g vet.
${
  upcomingTraining && upcomingTraining.length > 0
    ? `Aankomende training: ${upcomingTraining.map((t) => `${t.scheduled_date} ${t.title ?? t.session_type}`).join("; ")}`
    : "Nog geen trainingsschema ingesteld."
}

Gebruik deze data om concreet en persoonlijk advies te geven, niet generiek.`;

  const historyMessages = [
    ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  let reply: string;
  try {
    reply = await askCoach(systemContext, historyMessages);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "coach fout" }, { status: 500 });
  }

  await supabase.from("coach_messages").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply },
  ]);

  return NextResponse.json({ reply });
}
