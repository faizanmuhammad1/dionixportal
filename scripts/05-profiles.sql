-- Profiles table linked to Supabase auth.users
-- Run in your Supabase project (SQL Editor or migration tool)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('admin','employee')),
  first_name text,
  last_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- Optional: keep updated_at in sync
create or replace function public.handle_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_updated_at on public.profiles;
create trigger on_profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_profiles_updated_at();

-- RLS policies (enable and allow users to access their own row)
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles select own'
  ) then
    create policy "Profiles select own" on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles update own'
  ) then
    create policy "Profiles update own" on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles insert self'
  ) then
    create policy "Profiles insert self" on public.profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- Optional helper to create a profile on signup (if using Edge Functions or triggers)
-- See Supabase docs for auth triggers; otherwise create profile from app code after sign-up.

