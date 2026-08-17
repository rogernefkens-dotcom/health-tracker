import { createClient } from "@/lib/supabase-server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connection } = await supabase
    .from("wearable_connections")
    .select("provider, updated_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-6">Instellingen</h1>

      {params.connected && (
        <p className="mb-4 text-green-400 text-sm">Google Health succesvol gekoppeld.</p>
      )}
      {params.error && (
        <p className="mb-4 text-red-400 text-sm">Koppelen mislukt: {params.error}</p>
      )}

      <section className="rounded-2xl bg-neutral-900 p-5 mb-4">
        <h2 className="font-medium mb-2">Wearable</h2>
        {connection ? (
          <p className="text-neutral-400 text-sm">
            Gekoppeld ({connection.provider}) — laatst bijgewerkt{" "}
            {new Date(connection.updated_at).toLocaleString("nl-NL")}
          </p>
        ) : (
          <a
            href="/api/auth/google"
            className="inline-block rounded-md bg-lime-400 text-neutral-950 font-medium px-4 py-2"
          >
            Koppel Google Health (Fitbit)
          </a>
        )}
      </section>
    </main>
  );
}
