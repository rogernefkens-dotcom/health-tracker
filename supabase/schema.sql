-- Health Tracker DB schema (personal, single-user app)
-- Run this once in Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- Basic profile / intake info
create table if not exists profile (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null unique,
  age int,
  height_cm numeric,
  sex text default 'male',
  activity_level text,
  goal text, -- e.g. "vet verlies / strakker / gymrace"
  target_event_name text, -- "Gymrace - Men Buddies"
  target_event_date date,
  daily_calorie_target int,
  protein_target_g int,
  carbs_target_g int,
  fat_target_g int,
  dislikes text[], -- e.g. {'blauwe kaas'}
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Body composition over time (weight + skinfold-based bodyfat)
create table if not exists body_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  measured_at date not null default current_date,
  weight_kg numeric,
  skinfold_chest_mm numeric,
  skinfold_abdomen_mm numeric,
  skinfold_thigh_mm numeric,
  body_fat_pct numeric, -- computed via Jackson-Pollock 3-site + Siri
  source text default 'manual', -- manual | wearable
  created_at timestamptz default now()
);

-- Standard/favorite meals ("standaard ontbijt" etc.)
create table if not exists quick_meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  meal_type text, -- breakfast | lunch | dinner | snack
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  photo_url text,
  times_used int default 0,
  created_at timestamptz default now()
);

-- Actual logged food entries (via photo, quick meal, or manual)
create table if not exists food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  logged_at timestamptz not null default now(),
  meal_type text, -- breakfast | lunch | dinner | snack
  source text not null default 'manual', -- photo | quick_meal | manual
  quick_meal_id uuid references quick_meals(id),
  description text,
  photo_url text,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  ai_confidence numeric, -- 0-1, how sure the vision estimate is
  portion_note text, -- e.g. flags "extra portie" for the dinner-portion coaching angle
  created_at timestamptz default now()
);

-- Training schedule (planned sessions toward the gymrace)
create table if not exists training_plan (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  scheduled_date date not null,
  session_type text, -- run_intervals | strength_endurance | station_practice | rest | race
  title text,
  description text,
  target_metrics jsonb, -- e.g. {"runs_km":1,"reps":8,"sled_kg":150}
  status text default 'planned', -- planned | done | skipped
  created_at timestamptz default now()
);

-- Logged workouts (actual, could be manual or synced from wearable)
create table if not exists workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  performed_at timestamptz not null default now(),
  training_plan_id uuid references training_plan(id),
  activity_type text,
  duration_min numeric,
  distance_km numeric,
  calories_burned int,
  avg_heart_rate int,
  notes text,
  source text default 'manual', -- manual | wearable
  created_at timestamptz default now()
);

-- Sauna sessions
create table if not exists sauna_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  session_date date not null default current_date,
  duration_min numeric,
  temperature_c numeric,
  notes text,
  created_at timestamptz default now()
);

-- Supplements: what he takes + advice/ideas log
create table if not exists supplements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  dosage text,
  timing text, -- e.g. "'s ochtends", "voor training"
  status text default 'idea', -- idea | active | stopped
  reasoning text, -- why it's recommended / what it targets
  created_at timestamptz default now()
);

-- Daily wearable sync snapshot (Google Health API: steps, sleep, hr, weight)
create table if not exists wearable_daily_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  data_date date not null,
  steps int,
  active_minutes int,
  calories_burned int,
  distance_km numeric,
  sleep_duration_min int,
  sleep_score numeric,
  resting_heart_rate int,
  weight_kg numeric,
  raw jsonb, -- full raw payload for anything we haven't mapped yet
  synced_at timestamptz default now(),
  unique(user_id, data_date)
);

-- OAuth tokens for the Google Health API connection (separate from login)
create table if not exists wearable_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null unique,
  provider text not null default 'google_health',
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row level security: single-user app, but enable RLS + policies for safety
alter table profile enable row level security;
alter table body_metrics enable row level security;
alter table quick_meals enable row level security;
alter table food_logs enable row level security;
alter table training_plan enable row level security;
alter table workouts enable row level security;
alter table sauna_sessions enable row level security;
alter table supplements enable row level security;
alter table wearable_daily_data enable row level security;
alter table wearable_connections enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['profile','body_metrics','quick_meals','food_logs','training_plan','workouts','sauna_sessions','supplements','wearable_daily_data','wearable_connections'])
  loop
    execute format('create policy "owner_access_%1$s" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
