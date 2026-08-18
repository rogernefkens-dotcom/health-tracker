import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const WEEKDAY_TEMPLATE: Record<number, { session_type: string; title: string; description: string }> = {
  1: {
    session_type: "station_practice",
    title: "Stations: sled + wall balls",
    description:
      "4 ronden: 20m sled push, 20m sled pull, 15 wall balls, 15 burpee broad jumps. 2 min rust tussen ronden.",
  },
  2: {
    session_type: "run_intervals",
    title: "Interval run",
    description: "2km inlopen, dan 8x400m op stevig tempo met 90s rust, 1.5km uitlopen.",
  },
  3: {
    session_type: "strength_endurance",
    title: "Full body circuit",
    description: "4 ronden: 12 squats, 10 lunges per been, 10 push press, 30s plank. Minimale rust.",
  },
  4: {
    session_type: "rest",
    title: "Actief herstel",
    description: "Rustige wandeling, mobility, of sauna. Geen zware training.",
  },
  5: {
    session_type: "station_practice",
    title: "Stations: carries + erg",
    description: "4 ronden: 2x20m farmers carry (zwaar), 250m ski erg of roeien, 12 lunges per been.",
  },
  6: {
    session_type: "run_intervals",
    title: "Lange duurloop",
    description: "6-8km rustig tempo, gesprekstempo. Bouw wekelijks 0.5-1km op.",
  },
  0: {
    session_type: "rest",
    title: "Rustdag",
    description: "Volledige rust of lichte mobility.",
  },
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profile")
    .select("target_event_date")
    .eq("user_id", user.id)
    .maybeSingle();

  const raceDate = profile?.target_event_date ? new Date(profile.target_event_date) : null;
  if (!raceDate) {
    return NextResponse.json({ error: "Geen event-datum ingesteld in profiel" }, { status: 400 });
  }

  const { count } = await supabase
    .from("training_plan")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count && count > 0) {
    return NextResponse.json({ error: "Er bestaat al een trainingsschema" }, { status: 400 });
  }

  const rows: {
    user_id: string;
    scheduled_date: string;
    session_type: string;
    title: string;
    description: string;
  }[] = [];

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const msPerDay = 86400000;
  const totalDays = Math.round((raceDate.getTime() - start.getTime()) / msPerDay);

  if (totalDays < 0) {
    return NextResponse.json({ error: "De event-datum ligt in het verleden" }, { status: 400 });
  }

  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(start.getTime() + i * msPerDay);
    const isRaceDay = date.toDateString() === raceDate.toDateString();
    const isTaperWeek = totalDays - i <= 6 && !isRaceDay;

    if (isRaceDay) {
      rows.push({
        user_id: user.id,
        scheduled_date: date.toISOString().slice(0, 10),
        session_type: "race",
        title: "Gymrace — Men Buddies",
        description: "Racedag. Goed ontbijten, opwarmen, en genieten.",
      });
      continue;
    }

    const template = WEEKDAY_TEMPLATE[date.getDay()];
    rows.push({
      user_id: user.id,
      scheduled_date: date.toISOString().slice(0, 10),
      session_type: isTaperWeek && template.session_type !== "rest" ? "rest" : template.session_type,
      title: isTaperWeek && template.session_type !== "rest" ? "Taper — licht" : template.title,
      description:
        isTaperWeek && template.session_type !== "rest"
          ? "Laatste week voor de race: rustig aan, korte technische sessie of lichte cardio (20-30 min)."
          : template.description,
    });
  }

  const { error } = await supabase.from("training_plan").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
