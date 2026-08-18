"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuickMealTile({
  meal,
}: {
  meal: { id: string; name: string; calories: number | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function log() {
    setBusy(true);
    const res = await fetch("/api/food/quick-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quick_meal_id: meal.id }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 1500);
    }
  }

  return (
    <button
      onClick={log}
      disabled={busy}
      className="rounded-xl bg-neutral-900 p-3 text-left hover:bg-neutral-800 disabled:opacity-50"
    >
      <p className="font-medium">{meal.name}</p>
      <p className="text-sm text-neutral-400">{done ? "toegevoegd ✓" : `${meal.calories ?? 0} kcal`}</p>
    </button>
  );
}
