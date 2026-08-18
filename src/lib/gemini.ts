// Thin wrapper around the Google Gemini API (generativelanguage.googleapis.com).
// Used for: (1) estimating calories/macros from a food photo, (2) the coach chat.
// Needs a free API key from https://aistudio.google.com/apikey in env var GEMINI_API_KEY.
// Model is overridable via GEMINI_MODEL in case the default gets deprecated.

const DEFAULT_MODEL = "gemini-2.0-flash";

function baseUrl() {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

async function callGemini(params: {
  systemInstruction?: string;
  contents: GeminiContent[];
  json?: boolean;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY ontbreekt in de environment variables");

  const body: Record<string, unknown> = { contents: params.contents };
  if (params.systemInstruction) {
    body.system_instruction = { parts: [{ text: params.systemInstruction }] };
  }
  if (params.json) {
    body.generationConfig = { responseMimeType: "application/json" };
  }

  const res = await fetch(`${baseUrl()}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error(
      "Onverwacht antwoord van Gemini (mogelijk geblokkeerd door een safety filter of leeg antwoord)"
    );
  }
  return text;
}

export type FoodAnalysis = {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
};

export async function analyzeFoodPhoto(imageBase64: string, mimeType: string): Promise<FoodAnalysis> {
  const prompt = `Je bent een voedingsdeskundige. Kijk naar deze foto van een maaltijd en schat in:
- een korte beschrijving (Nederlands, max 6 woorden)
- calorieen (kcal, geheel getal)
- eiwit, koolhydraten en vet in gram (gehele getallen)
- confidence: hoe zeker je bent (getal tussen 0.0 en 1.0)

Geef ALLEEN geldige JSON terug in dit exacte formaat, zonder uitleg eromheen:
{"description": "...", "calories": 000, "protein_g": 00, "carbs_g": 00, "fat_g": 00, "confidence": 0.0}`;

  const text = await callGemini({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
      },
    ],
    json: true,
  });

  return JSON.parse(text) as FoodAnalysis;
}

export async function askCoach(
  systemContext: string,
  history: { role: "user" | "assistant"; content: string }[]
) {
  const contents: GeminiContent[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  return callGemini({ systemInstruction: systemContext, contents });
}
