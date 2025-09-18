-- Extend profiles with employee-management fields and admin-friendly policies (idempotent)

-- Add columns if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='department'
  ) then
    alter table public.profiles add column department text;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='position'
  ) then
    alter table public.profiles add column position text;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='status'
  ) then
    alter table public.profiles add column status text not null default 'active' check (status in ('active','inactive'));
  end if;
end $$;

-- Ensure admin can manage any profile in addition to user self policies
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles admin manage'
  ) then
    create policy "Profiles admin manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;


