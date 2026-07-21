-- 0001_grow_tracker.sql
-- Schema + RLS + storage bucket for the Grow Tracker tool layer of
-- Cultivation Compass. Mirrors src/db/types.ts row-for-row (snake_case).
-- Every user-owned table carries user_id default auth.uid(); RLS enforces
-- ownership so the client never passes user_id explicitly.

create extension if not exists "pgcrypto";

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  units text not null default 'imperial' check (units in ('imperial', 'metric')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  experience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- grows ----------
create table public.grows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  location text,
  lat double precision,
  lng double precision,
  elevation_ft integer,
  indoor_start date,
  outdoor_transplant date,
  plant_count integer,
  cultivars text[] not null default '{}',
  photo_type text check (photo_type in ('Photoperiod', 'Autoflower')),
  container text,
  medium text,
  irrigation text,
  sun_exposure text,
  protection text,
  nutrition_approach text,
  experience text,
  concerns text,
  is_sample boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grows enable row level security;

create policy "grows: all own" on public.grows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger grows_set_updated_at
  before update on public.grows
  for each row execute function public.set_updated_at();

create index grows_user_id_idx on public.grows(user_id);

-- ---------- plants ----------
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  grow_id uuid not null references public.grows(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  cultivar text,
  source text,
  start_date date,
  transplant_date date,
  medium text,
  location text,
  stage text check (stage in ('Seedling', 'Vegetative', 'Pre-flower', 'Flowering', 'Late flower', 'Harvest')),
  health integer check (health between 1 and 10),
  archived boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plants enable row level security;

create policy "plants: all own" on public.plants
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger plants_set_updated_at
  before update on public.plants
  for each row execute function public.set_updated_at();

create index plants_grow_id_idx on public.plants(grow_id);
create index plants_user_id_idx on public.plants(user_id);

-- ---------- journal_entries ----------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  grow_id uuid not null references public.grows(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  tags text[] not null default '{}',
  water_vol_gal numeric,
  height_cm numeric,
  width_cm numeric,
  nutrients text,
  ph numeric,
  ec numeric,
  temp_f numeric,
  rh_pct numeric,
  soil_moisture text,
  symptoms text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "journal_entries: all own" on public.journal_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index journal_entries_grow_id_idx on public.journal_entries(grow_id);
create index journal_entries_plant_id_idx on public.journal_entries(plant_id);
create index journal_entries_tags_idx on public.journal_entries using gin(tags);

-- ---------- photos ----------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grow_id uuid references public.grows(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  stage text,
  tags text[] not null default '{}',
  notes text,
  is_profile boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "photos: all own" on public.photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index photos_plant_id_idx on public.photos(plant_id);

-- ---------- storage ----------
-- Private bucket; objects are keyed "{user_id}/{plant_or_grow_id}/{uuid}.ext"
-- so the RLS policy can check ownership from the first path segment.
insert into storage.buckets (id, name, public)
values ('grow-photos', 'grow-photos', false)
on conflict (id) do nothing;

create policy "grow-photos: read own" on storage.objects
  for select using (bucket_id = 'grow-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "grow-photos: insert own" on storage.objects
  for insert with check (bucket_id = 'grow-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "grow-photos: update own" on storage.objects
  for update using (bucket_id = 'grow-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "grow-photos: delete own" on storage.objects
  for delete using (bucket_id = 'grow-photos' and (storage.foldername(name))[1] = auth.uid()::text);
