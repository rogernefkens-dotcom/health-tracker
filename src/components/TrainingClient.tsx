"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PlanRow = {
  id: string;
  scheduled_date: string;
  session_type: string;
  title: string | null;
  description: string | null;
  status: string;
};

type MetricRow = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
};

export default function TrainingClient({
  initialPlan,
  initialMetrics,
  eventName,
  eventDate,
  hasAnyPlan,
}: {
  initialPlan: PlanRow[];
  initialMetrics: MetricRow[];
  eventName: string;
  eventDate: string | null;
  hasAnyPlan: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [abdomen, setAbdomen] = useState("");
  const [thigh, setThigh] = useState("");

  const daysLeft = eventDate ? Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000) : null;

  async function generatePlan() {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/training/generate-plan", { method: "POST" });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(json.error || "genereren mislukt");
      return;
    }
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    setPlan((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch("/api/training/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  async function submitMetric(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/body-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight_kg: weight ? Number(weight) : null,
        skinfold_chest_mm: chest ? Number(chest) : null,
        skinfold_abdomen_mm: abdomen ? Number(abdomen) : null,
        skinfold_thigh_mm: thigh ? Number(thigh) : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "opslaan mislukt");
      return;
    }
    setMetrics((prev) => [json.metric, ...prev]);
    setWeight("");
    setChest("");
    setAbdomen("");
    setThigh("");
    setShowMetricForm(false);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 max-w-md mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Training</h1>
        {eventDate && (
          <p className="text-neutral-400 text-sm mt-1">
            {eventName} — nog {daysLeft} dagen
          </p>
        )}
      </header>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!hasAnyPlan && (
        <section className="rounded-2xl bg-neutral-900 p-4 mb-4">
          <p className="text-sm text-neutral-400 mb-3">
            Nog geen trainingsschema. Genereer een opbouwschema tot de racedag.
          </p>
          <button
            onClick={generatePlan}
            disabled={generating}
            className="w-full rounded-md bg-lime-400 text-neutral-950 font-medium px-3 py-2 disabled:opacity-50"
          >
            {generating ? "Bezig..." : "Genereer schema"}
          </button>
        </section>
      )}

      <section className="mb-6">
        <h2 className="font-medium mb-2">Komende sessies</h2>
        <div className="flex flex-col gap-2">
          {plan.map((p) => (
            <div key={p.id} className="rounded-xl bg-neutral-900 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">
                  {new Date(p.scheduled_date).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "done"
                      ? "bg-lime-400 text-neutral-950"
                      : p.status === "skipped"
                        ? "bg-neutral-700 text-neutral-400"
                        : "bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <p className="font-medium mt-1">{p.title}</p>
              {p.description && <p className="text-sm text-neutral-400 mt-0.5">{p.description}</p>}
              {p.status === "planned" && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setStatus(p.id, "done")} className="text-xs rounded-md bg-neutral-800 px-2 py-1">
                    ✓ gedaan
                  </button>
                  <button onClick={() => setStatus(p.id, "skipped")} className="text-xs rounded-md bg-neutral-800 px-2 py-1">
                    overslaan
                  </button>
                </div>
              )}
            </div>
          ))}
          {plan.length === 0 && hasAnyPlan && (
            <p className="text-neutral-500 text-sm">Geen sessies gepland in de komende 14 dagen.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Lichaamsmetingen</h2>
          <button onClick={() => setShowMetricForm((s) => !s)} className="text-sm text-lime-400 underline">
            {showMetricForm ? "annuleren" : "+ nieuwe meting"}
          </button>
        </div>

        {showMetricForm && (
          <form onSubmit={submitMetric} className="rounded-xl bg-neutral-900 p-3 mb-3 flex flex-col gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="Gewicht (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="rounded-md bg-neutral-800 px-3 py-2"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Borst mm"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                className="rounded-md bg-neutral-800 px-3 py-2"
              />
              <input
                type="number"
                placeholder="Buik mm"
                value={abdomen}
                onChange={(e) => setAbdomen(e.target.value)}
                className="rounded-md bg-neutral-800 px-3 py-2"
              />
              <input
                type="number"
                placeholder="Dij mm"
                value={thigh}
                onChange={(e) => setThigh(e.target.value)}
                className="rounded-md bg-neutral-800 px-3 py-2"
              />
            </div>
            <button type="submit" className="rounded-md bg-lime-400 text-neutral-950 font-medium px-3 py-2">
              Opslaan
            </button>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {metrics.map((m) => (
            <div key={m.id} className="rounded-xl bg-neutral-900 p-3 flex items-center justify-between">
              <span className="text-sm text-neutral-400">{new Date(m.measured_at).toLocaleDateString("nl-NL")}</span>
              <span>
                {m.weight_kg ? `${m.weight_kg} kg` : "—"}
                {m.body_fat_pct ? ` · ${m.body_fat_pct}% vet` : ""}
              </span>
            </div>
          ))}
          {metrics.length === 0 && <p className="text-neutral-500 text-sm">Nog geen metingen gelogd.</p>}
        </div>
      </section>
    </main>
  );
}
