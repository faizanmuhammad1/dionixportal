-- Projects, tasks, attachments, comments schema (keyed to auth.users)

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  manager_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('web','branding','marketing','ai','custom')),
  name text not null,
  description text,
  status text not null default 'planning' check (status in ('planning','active','completed','on-hold')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  start_date date,
  end_date date,
  budget numeric,
  client_name text,
  company_number text,
  company_email text,
  company_address text,
  about_company text,
  social_links jsonb default '[]'::jsonb,
  public_contacts jsonb default '{}'::jsonb,
  media_links jsonb default '[]'::jsonb,
  bank_details jsonb default '{}'::jsonb,
  service_specific jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text,
  primary key (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in-progress','review','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  content_type text,
  version integer not null default 1,
  client_visible boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  body text not null,
  file_refs jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- indices
create index if not exists idx_projects_manager on public.projects(manager_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_attachments_project on public.attachments(project_id);
create index if not exists idx_comments_project on public.comments(project_id);

-- RLS enable
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;

-- Policies: simplistic owner/member access
do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_select') then
    create policy projects_select on public.projects for select using (
      auth.uid() = created_by or auth.uid() = manager_id or exists (
        select 1 from public.project_members m where m.project_id = id and m.user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_modify') then
    create policy projects_modify on public.projects for all using (
      auth.uid() = created_by or auth.uid() = manager_id
    ) with check (
      auth.uid() = created_by or auth.uid() = manager_id
    );
  end if;
end $$;

-- ==========================================
-- RBAC helpers and policies (admin/manager/employee)
-- ==========================================

-- Extend profiles.role to support manager/client as needed
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    begin
      alter table public.profiles drop constraint if exists profiles_role_check;
      alter table public.profiles add constraint profiles_role_check check (role in ('admin','manager','employee','client'));
    exception when others then null; -- ignore if constraint name differs
    end;
  end if;
end $$;

-- Current role helper
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'employee');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

-- Project access helper (creator/manager/member)
create or replace function public.has_project_access(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.projects p
      where p.id = pid and (auth.uid() = p.created_by or auth.uid() = p.manager_id)
    )
    or exists (
      select 1 from public.project_members m where m.project_id = pid and m.user_id = auth.uid()
    );
$$;

-- =====================
-- projects policies
-- =====================
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_select_rbac'
  ) then
    create policy projects_select_rbac on public.projects for select using (
      public.is_admin() or public.has_project_access(id)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_insert_rbac'
  ) then
    create policy projects_insert_rbac on public.projects for insert with check (
      public.is_admin() or auth.uid() = created_by or auth.uid() = manager_id
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_update_rbac'
  ) then
    create policy projects_update_rbac on public.projects for update using (
      public.is_admin() or auth.uid() = created_by or auth.uid() = manager_id
    ) with check (
      public.is_admin() or auth.uid() = created_by or auth.uid() = manager_id
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_delete_rbac'
  ) then
    create policy projects_delete_rbac on public.projects for delete using (
      public.is_admin() or auth.uid() = created_by or auth.uid() = manager_id
    );
  end if;
end $$;

-- =====================
-- project_members policies
-- =====================
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='project_members' and policyname='project_members_select_rbac'
  ) then
    create policy project_members_select_rbac on public.project_members for select using (
      public.is_admin() or public.has_project_access(project_id)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='project_members' and policyname='project_members_write_rbac'
  ) then
    create policy project_members_write_rbac on public.project_members for all using (
      exists (select 1 from public.projects p where p.id = project_members.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id)) or public.is_admin()
    ) with check (
      exists (select 1 from public.projects p where p.id = project_members.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id)) or public.is_admin()
    );
  end if;
end $$;

-- =====================
-- tasks policies
-- =====================
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_select_rbac'
  ) then
    create policy tasks_select_rbac on public.tasks for select using (
      public.is_admin() or public.has_project_access(project_id)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_insert_rbac'
  ) then
    create policy tasks_insert_rbac on public.tasks for insert with check (
      public.is_admin() or exists (select 1 from public.projects p where p.id = tasks.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id))
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_update_rbac'
  ) then
    create policy tasks_update_rbac on public.tasks for update using (
      public.is_admin() or exists (select 1 from public.projects p where p.id = tasks.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id)) or tasks.assignee_id = auth.uid()
    ) with check (
      public.is_admin() or exists (select 1 from public.projects p where p.id = tasks.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id)) or tasks.assignee_id = auth.uid()
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_delete_rbac'
  ) then
    create policy tasks_delete_rbac on public.tasks for delete using (
      public.is_admin() or exists (select 1 from public.projects p where p.id = tasks.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id))
    );
  end if;
end $$;

-- =====================
-- attachments policies
-- =====================
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attachments' and policyname='attachments_select_rbac'
  ) then
    create policy attachments_select_rbac on public.attachments for select using (
      public.is_admin() or public.has_project_access(project_id)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attachments' and policyname='attachments_write_rbac'
  ) then
    create policy attachments_write_rbac on public.attachments for all using (
      exists (select 1 from public.projects p where p.id = attachments.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id)) or public.is_admin()
    ) with check (
      exists (select 1 from public.projects p where p.id = attachments.project_id and (auth.uid() = p.created_by or auth.uid() = p.manager_id)) or public.is_admin()
    );
  end if;
end $$;

-- =====================
-- comments policies
-- =====================
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_select_rbac'
  ) then
    create policy comments_select_rbac on public.comments for select using (
      public.is_admin() or public.has_project_access(project_id)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_insert_rbac'
  ) then
    create policy comments_insert_rbac on public.comments for insert with check (
      public.is_admin() or public.has_project_access(project_id)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_delete_rbac'
  ) then
    create policy comments_delete_rbac on public.comments for delete using (
      public.is_admin() or comments.created_by = auth.uid()
    );
  end if;
end $$;

-- ==========================================
-- Custom Claims RBAC (Auth Hook + Role/Permission tables)
-- ==========================================

-- Create enums if missing
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_permission') then
    create type public.app_permission as enum ('projects.manage','projects.delete','tasks.delete','attachments.write','comments.delete');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin','manager','employee','client');
  end if;
end $$;

-- Role mapping per user
create table if not exists public.user_roles (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
comment on table public.user_roles is 'Application roles for each user.';

-- Permissions per role
create table if not exists public.role_permissions (
  id bigint generated by default as identity primary key,
  role public.app_role not null,
  permission public.app_permission not null,
  unique (role, permission)
);
comment on table public.role_permissions is 'Application permissions for each role.';

-- Seed baseline permissions
insert into public.role_permissions (role, permission)
values
  ('admin','projects.manage'),
  ('admin','projects.delete'),
  ('admin','tasks.delete'),
  ('admin','attachments.write'),
  ('admin','comments.delete'),
  ('manager','projects.manage'),
  ('manager','tasks.delete'),
  ('manager','attachments.write'),
  ('manager','comments.delete')
on conflict do nothing;

-- Custom Access Token Auth Hook (adds user_role into JWT)
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
  declare
    claims jsonb;
    user_role public.app_role;
  begin
    select role
    into user_role
    from public.user_roles
    where user_id = (event->>'user_id')::uuid
    order by case role when 'admin' then 4 when 'manager' then 3 when 'employee' then 2 else 1 end desc
    limit 1;

    claims := coalesce(event->'claims', '{}'::jsonb);
    if user_role is not null then
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    else
      claims := jsonb_set(claims, '{user_role}', '"employee"'::jsonb, true);
    end if;
    event := jsonb_set(event, '{claims}', claims, true);
    return event;
  end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant all on table public.user_roles to supabase_auth_admin;
revoke all on table public.user_roles from authenticated, anon, public;
create policy if not exists "Allow auth admin to read user roles" on public.user_roles
as permissive for select to supabase_auth_admin using (true);

-- Authorize helper reads user_role from JWT
create or replace function public.authorize(requested_permission public.app_permission)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  has_perm int;
  jwt_role public.app_role;
begin
  select (auth.jwt() ->> 'user_role')::public.app_role into jwt_role;
  if jwt_role is null then
    return false;
  end if;
  select count(*) into has_perm
  from public.role_permissions rp
  where rp.permission = requested_permission
    and rp.role = jwt_role;
  return has_perm > 0;
end;
$$;

-- Optionally widen existing policies to honor custom permissions
do $$ begin
  -- projects manage/delete
  -- (policies already exist; these permissive duplicates ensure claims can grant access)
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_manage_claims') then
    create policy projects_manage_claims on public.projects for all to authenticated using ((select public.authorize('projects.manage')))
      with check ((select public.authorize('projects.manage')));
  end if;
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_delete_claims') then
    create policy projects_delete_claims on public.projects for delete to authenticated using ((select public.authorize('projects.delete')));
  end if;

  -- tasks delete via claims
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='tasks_delete_claims') then
    create policy tasks_delete_claims on public.tasks for delete to authenticated using ((select public.authorize('tasks.delete')));
  end if;

  -- attachments write via claims
  if not exists (select 1 from pg_policies where tablename='attachments' and policyname='attachments_write_claims') then
    create policy attachments_write_claims on public.attachments for all to authenticated using ((select public.authorize('attachments.write')))
      with check ((select public.authorize('attachments.write')));
  end if;

  -- comments delete via claims
  if not exists (select 1 from pg_policies where tablename='comments' and policyname='comments_delete_claims') then
    create policy comments_delete_claims on public.comments for delete to authenticated using ((select public.authorize('comments.delete')));
  end if;
end $$;


