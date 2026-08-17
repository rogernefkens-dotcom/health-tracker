"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold mb-1">Health Tracker</h1>
        <p className="text-neutral-400 mb-6">Log in met een magic link — geen wachtwoord nodig.</p>

        {sent ? (
          <p className="text-green-400">
            Check je mail ({email}) en klik op de link om in te loggen.
          </p>
        ) : (
          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="jij@voorbeeld.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            />
            <button
              type="submit"
              className="rounded-md bg-lime-400 text-neutral-950 font-medium px-3 py-2 hover:bg-lime-300"
            >
              Stuur magic link
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
