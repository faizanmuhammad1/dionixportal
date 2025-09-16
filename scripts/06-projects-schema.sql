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


