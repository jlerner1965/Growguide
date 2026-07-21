-- 0002_diagnoses.sql
-- Saved diagnostic sessions for the Grow Tracker tool layer of Cultivation
-- Compass. Follows 0001's conventions: RLS on, policies scoped to auth.uid(),
-- user_id default auth.uid(), cascade FKs. Written to be re-runnable
-- (create-if-not-exists tables/indexes, drop-then-create policies).

create extension if not exists "pgcrypto";

-- ---------- diagnoses ----------
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grow_id uuid references public.grows(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  created_at timestamptz not null default now(),
  inputs jsonb not null,     -- structured symptom answers
  results jsonb not null,    -- ranked explanations with confidence + evidence
  top_result text,           -- highest-confidence label, for list views
  notes text
);

alter table public.diagnoses enable row level security;

drop policy if exists "diagnoses: select own" on public.diagnoses;
create policy "diagnoses: select own" on public.diagnoses
  for select using (user_id = auth.uid());

drop policy if exists "diagnoses: insert own" on public.diagnoses;
create policy "diagnoses: insert own" on public.diagnoses
  for insert with check (user_id = auth.uid());

drop policy if exists "diagnoses: update own" on public.diagnoses;
create policy "diagnoses: update own" on public.diagnoses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "diagnoses: delete own" on public.diagnoses;
create policy "diagnoses: delete own" on public.diagnoses
  for delete using (user_id = auth.uid());

create index if not exists diagnoses_user_created_idx on public.diagnoses(user_id, created_at desc);
create index if not exists diagnoses_grow_id_idx on public.diagnoses(grow_id);
