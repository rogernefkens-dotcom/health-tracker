import { createClient } from "@/lib/supabase-server";
import TrainingClient from "@/components/TrainingClient";

export default async function TrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: plan }, { data: metrics }, { data: profile }] = await Promise.all([
    supabase
      .from("training_plan")
      .select("*")
      .eq("user_id", user!.id)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(14),
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user!.id)
      .order("measured_at", { ascending: false })
      .limit(5),
    supabase.from("profile").select("target_event_date, target_event_name").eq("user_id", user!.id).maybeSingle(),
  ]);

  return (
    <TrainingClient
      initialPlan={plan ?? []}
      initialMetrics={metrics ?? []}
      eventName={profile?.target_event_name ?? "Gymrace"}
      eventDate={profile?.target_event_date ?? null}
      hasAnyPlan={(plan ?? []).length > 0}
    />
  );
}
