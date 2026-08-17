// Helpers for the Google Health API OAuth connection.
// This is a SEPARATE OAuth flow from app login (Supabase Auth handles login).
// Reason: the "restricted" googlehealth scopes need offline access (refresh
// token) tied to long-lived server-side sync, which is simpler to manage
// as its own connect flow than to bolt onto Supabase's login session.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// NOTE: base + exact dataType path segments below are based on Google's
// published REST reference for the (new, 2026) Google Health API. Google
// Health is a young API - before wiring the dashboard to real numbers,
// verify the exact dataType identifiers with one real call (OAuth2
// Playground or a manual curl with the access token) and adjust
// DATA_TYPES below if the identifiers differ.
const HEALTH_API_BASE = "https://health.googleapis.com/v4";

export const GOOGLE_HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.profile.readonly",
];

export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline", // required to get a refresh_token
    prompt: "consent", // force consent so we always get a refresh_token
    scope: GOOGLE_HEALTH_SCOPES.join(" "),
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

// TODO verify exact dataType identifiers against a live test call.
const DATA_TYPES = {
  steps: "com.google.step_count.delta",
  sleep: "com.google.sleep.segment",
  weight: "com.google.weight",
  heartRate: "com.google.heart_rate.bpm",
  activeMinutes: "com.google.active_minutes",
  caloriesBurned: "com.google.calories.expended",
};

export async function fetchDataPoints(
  accessToken: string,
  userId: string,
  dataType: keyof typeof DATA_TYPES,
  startTimeIso: string,
  endTimeIso: string
) {
  const path = `${HEALTH_API_BASE}/users/${userId}/dataTypes/${DATA_TYPES[dataType]}/dataPoints`;
  const params = new URLSearchParams({
    startTime: startTimeIso,
    endTime: endTimeIso,
  });
  const res = await fetch(`${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google Health API error (${dataType}): ${res.status} ${await res.text()}`);
  }
  return res.json();
}
