-- Profiles: one row per auth user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.diaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index diaries_owner_idx on public.diaries (owner_id);

create table public.diary_places (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries (id) on delete cascade,
  google_place_id text not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  notes text,
  visited_on date,
  created_at timestamptz not null default now()
);
create index diary_places_diary_idx on public.diary_places (diary_id);

-- Create a profile automatically when a user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: owners only (sharing with friends comes later)
alter table public.profiles enable row level security;
alter table public.diaries enable row level security;
alter table public.diary_places enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "diaries: owner full access" on public.diaries
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "places: owner full access" on public.diary_places
  for all to authenticated
  using (exists (select 1 from public.diaries d
                 where d.id = diary_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.diaries d
                      where d.id = diary_id and d.owner_id = (select auth.uid())));
