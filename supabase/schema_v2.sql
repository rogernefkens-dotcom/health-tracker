-- Health Tracker DB schema, aanvulling v2.
-- Run dit eenmalig in de Supabase SQL editor (na schema.sql).

create table if not exists coach_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  role text not null, -- user | assistant
  content text not null,
  created_at timestamptz default now()
);

alter table coach_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'coach_messages' and policyname = 'owner_access_coach_messages'
  ) then
    create policy "owner_access_coach_messages" on coach_messages
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
