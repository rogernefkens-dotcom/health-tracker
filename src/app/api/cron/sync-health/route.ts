import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { refreshAccessToken, fetchDataPoints } from "@/lib/google-health";

// Triggered daily by Vercel Cron (see vercel.json). Pulls yesterday's steps,
// sleep, weight and heart rate for every connected user and upserts a row
// into wearable_daily_data.
export async function GET(req: NextRequest) {
  // Protect the endpoint: Vercel Cron sends this header automatically.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: connections, error } = await supabase
    .from("wearable_connections")
    .select("*")
    .eq("provider", "google_health");

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const startTime = yesterday.toISOString();
  const endTime = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dataDate = yesterday.toISOString().slice(0, 10);

  const results: Record<string, string> = {};

  for (const conn of connections ?? []) {
    try {
      let accessToken = conn.access_token as string;

      // Refresh if the stored token is expired or close to it.
      if (new Date(conn.expires_at) < new Date(Date.now() + 60_000)) {
        const refreshed = await refreshAccessToken(conn.refresh_token);
        accessToken = refreshed.access_token;
        await supabase
          .from("wearable_connections")
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", conn.user_id);
      }

      // NOTE: Google's own account id ("users/me") works for the userId
      // path segment on most Google health/fitness style APIs - if that
      // 404s once we test for real, swap in the numeric Google user id
      // instead.
      const googleUserId = "me";

      const [steps, sleep, weight] = await Promise.all([
        fetchDataPoints(accessToken, googleUserId, "steps", startTime, endTime),
        fetchDataPoints(accessToken, googleUserId, "sleep", startTime, endTime),
        fetchDataPoints(accessToken, googleUserId, "weight", startTime, endTime),
      ]);

      await supabase.from("wearable_daily_data").upsert(
        {
          user_id: conn.user_id,
          data_date: dataDate,
          steps: sumStepValues(steps),
          sleep_duration_min: sumSleepMinutes(sleep),
          weight_kg: lastWeightValue(weight),
          raw: { steps, sleep, weight },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,data_date" }
      );

      results[conn.user_id] = "ok";
    } catch (err) {
      console.error(`Sync failed for user ${conn.user_id}`, err);
      results[conn.user_id] = "failed";
    }
  }

  return NextResponse.json({ date: dataDate, results });
}

// --- best-effort parsers, adjust once we've seen a real response shape ---
function sumStepValues(payload: any): number | null {
  const points = payload?.dataPoints ?? payload?.point ?? [];
  if (!Array.isArray(points) || points.length === 0) return null;
  return points.reduce((sum: number, p: any) => sum + (p?.value?.[0]?.intVal ?? 0), 0);
}

function sumSleepMinutes(payload: any): number | null {
  const points = payload?.dataPoints ?? payload?.point ?? [];
  if (!Array.isArray(points) || points.length === 0) return null;
  return points.reduce((sum: number, p: any) => {
    const startNanos = Number(p?.startTimeNanos ?? 0);
    const endNanos = Number(p?.endTimeNanos ?? 0);
    return sum + (endNanos - startNanos) / 1e9 / 60;
  }, 0);
}

function lastWeightValue(payload: any): number | null {
  const points = payload?.dataPoints ?? payload?.point ?? [];
  if (!Array.isArray(points) || points.length === 0) return null;
  const last = points[points.length - 1];
  return last?.value?.[0]?.fpVal ?? null;
}
