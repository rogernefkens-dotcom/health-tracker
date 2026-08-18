"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type QuickMeal = {
  id: string;
  name: string;
  meal_type: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  times_used: number | null;
};

type FoodLog = {
  id: string;
  description: string | null;
  calories: number | null;
  meal_type: string | null;
  logged_at: string;
};

type Draft = {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  photo_url?: string;
  ai_confidence?: number;
  source: "photo" | "manual";
};

export default function FoodLogClient({
  initialQuickMeals,
  initialLogs,
}: {
  initialQuickMeals: QuickMeal[];
  initialLogs: FoodLog[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveAsQuick, setSaveAsQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [logs, setLogs] = useState(initialLogs);
  const [quickMeals, setQuickMeals] = useState(initialQuickMeals);
  const [loggedQuickId, setLoggedQuickId] = useState<string | null>(null);

  function resizeImage(file: File): Promise<{ base64: string; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 640;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("canvas niet beschikbaar"));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve({ base64: dataUrl.split(",")[1], dataUrl });
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalyzing(true);
    setDraft(null);
    try {
      const { base64, dataUrl } = await resizeImage(file);
      const res = await fetch("/api/food/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "analyse mislukt");
      setDraft({
        description: json.description,
        calories: Math.round(json.calories),
        protein_g: Math.round(json.protein_g),
        carbs_g: Math.round(json.carbs_g),
        fat_g: Math.round(json.fat_g),
        ai_confidence: json.confidence,
        photo_url: dataUrl,
        source: "photo",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openManual() {
    setDraft({
      description: "",
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      source: "manual",
    });
  }

  async function saveDraft() {
    if (!draft) return;
    setError(null);
    const res = await fetch("/api/food/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        meal_type: mealType,
        save_as_quick_meal: saveAsQuick,
        quick_meal_name: quickName,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "opslaan mislukt");
      return;
    }
    setLogs((prev) => [json.log, ...prev]);
    setDraft(null);
    setSaveAsQuick(false);
    setQuickName("");
    router.refresh();
  }

  async function tapQuickMeal(meal: QuickMeal) {
    setError(null);
    const res = await fetch("/api/food/quick-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quick_meal_id: meal.id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "loggen mislukt");
      return;
    }
    setLogs((prev) => [
      {
        id: crypto.randomUUID(),
        description: meal.name,
        calories: meal.calories,
        meal_type: meal.meal_type,
        logged_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setLoggedQuickId(meal.id);
    setTimeout(() => setLoggedQuickId(null), 1500);
    setQuickMeals((prev) =>
      prev.map((m) => (m.id === meal.id ? { ...m, times_used: (m.times_used ?? 0) + 1 } : m))
    );
    router.refresh();
  }

  async function deleteLog(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    await fetch("/api/food/log", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 max-w-md mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Eten</h1>
      </header>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!draft && (
        <section className="mb-4 flex gap-2">
          <label className="flex-1 rounded-xl bg-lime-400 text-neutral-950 font-medium px-4 py-3 text-center cursor-pointer">
            {analyzing ? "Analyseren..." : "📷 Foto van maaltijd"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              className="hidden"
              disabled={analyzing}
            />
          </label>
          <button onClick={openManual} className="rounded-xl bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
            handmatig
          </button>
        </section>
      )}

      {draft && (
        <section className="rounded-2xl bg-neutral-900 p-4 mb-4">
          <h2 className="font-medium mb-3">
            {draft.source === "manual" ? "Handmatig invoeren" : "Check de schatting"}
          </h2>
          {draft.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.photo_url} alt="" className="rounded-lg mb-3 w-full max-h-48 object-cover" />
          )}
          <div className="flex flex-col gap-2">
            <input
              className="rounded-md bg-neutral-800 px-3 py-2"
              placeholder="Omschrijving"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Kcal" value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} />
              <NumberField
                label="Eiwit (g)"
                value={draft.protein_g}
                onChange={(v) => setDraft({ ...draft, protein_g: v })}
              />
              <NumberField
                label="Koolh. (g)"
                value={draft.carbs_g}
                onChange={(v) => setDraft({ ...draft, carbs_g: v })}
              />
              <NumberField label="Vet (g)" value={draft.fat_g} onChange={(v) => setDraft({ ...draft, fat_g: v })} />
            </div>
            <select
              className="rounded-md bg-neutral-800 px-3 py-2"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="breakfast">Ontbijt</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Avondeten</option>
              <option value="snack">Snack</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-neutral-400 mt-1">
              <input type="checkbox" checked={saveAsQuick} onChange={(e) => setSaveAsQuick(e.target.checked)} />
              Ook opslaan als standaardmaaltijd
            </label>
            {saveAsQuick && (
              <input
                className="rounded-md bg-neutral-800 px-3 py-2"
                placeholder="Naam, bv. Standaard ontbijt"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
            )}

            <div className="flex gap-2 mt-2">
              <button onClick={saveDraft} className="flex-1 rounded-md bg-lime-400 text-neutral-950 font-medium px-3 py-2">
                Opslaan
              </button>
              <button onClick={() => setDraft(null)} className="rounded-md bg-neutral-800 px-3 py-2 text-sm">
                Annuleren
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mb-4">
        <h2 className="font-medium mb-2">Snel toevoegen</h2>
        <div className="grid grid-cols-2 gap-2">
          {quickMeals.map((m) => (
            <button
              key={m.id}
              onClick={() => tapQuickMeal(m)}
              className="rounded-xl bg-neutral-900 p-3 text-left hover:bg-neutral-800"
            >
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-neutral-400">
                {loggedQuickId === m.id ? "toegevoegd ✓" : `${m.calories ?? 0} kcal`}
              </p>
            </button>
          ))}
          {quickMeals.length === 0 && (
            <p className="text-neutral-500 text-sm col-span-2">
              Nog geen standaardmaaltijden — log een maaltijd en vink &quot;ook opslaan als
              standaardmaaltijd&quot; aan.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Vandaag gelogd</h2>
        <div className="flex flex-col gap-2">
          {logs.map((f) => (
            <div key={f.id} className="rounded-xl bg-neutral-900 p-3 flex items-center justify-between">
              <span>{f.description ?? "Maaltijd"}</span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-400">{f.calories} kcal</span>
                <button onClick={() => deleteLog(f.id)} className="text-neutral-600 text-xs">
                  verwijder
                </button>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-neutral-500 text-sm">Nog niets gelogd vandaag.</p>}
        </div>
      </section>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs text-neutral-500 flex flex-col gap-1">
      {label}
      <input
        type="number"
        className="rounded-md bg-neutral-800 px-3 py-2 text-neutral-100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
