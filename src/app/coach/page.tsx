import { createClient } from "@/lib/supabase-server";
import CoachChat from "@/components/CoachChat";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: messages } = await supabase
    .from("coach_messages")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return <CoachChat initialMessages={messages ?? []} />;
}
