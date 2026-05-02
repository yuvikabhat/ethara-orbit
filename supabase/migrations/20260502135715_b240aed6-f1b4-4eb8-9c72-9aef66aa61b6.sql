
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'member');
create type public.project_status as enum ('active', 'completed', 'on_hold');
create type public.priority_level as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'completed');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role security definer function
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin')
$$;

-- ============ PROJECTS ============
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  status project_status not null default 'active',
  priority priority_level not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- ============ PROJECT MEMBERS ============
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);
alter table public.project_members enable row level security;

-- helper: user is in project
create or replace function public.is_project_member(_user_id uuid, _project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where user_id = _user_id and project_id = _project_id)
$$;

-- ============ TASKS ============
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status task_status not null default 'todo',
  priority priority_level not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- ============ TASK COMMENTS ============
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);
alter table public.task_comments enable row level security;

-- ============ ACTIVITY LOGS ============
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;

-- ============ INDEXES ============
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_assigned on public.tasks(assigned_to);
create index idx_tasks_status on public.tasks(status);
create index idx_project_members_project on public.project_members(project_id);
create index idx_project_members_user on public.project_members(user_id);
create index idx_task_comments_task on public.task_comments(task_id);
create index idx_activity_logs_created on public.activity_logs(created_at desc);

-- ============ updated_at TRIGGERS ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============ AUTO-CREATE PROFILE + ROLE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
  assigned_role app_role;
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := 'member';
  end if;

  insert into public.user_roles (user_id, role) values (new.id, assigned_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS POLICIES ============

-- PROFILES
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "profiles_admin_update_any" on public.profiles
  for update to authenticated using (public.is_admin(auth.uid()));

-- USER ROLES
create policy "user_roles_select_authenticated" on public.user_roles
  for select to authenticated using (true);
create policy "user_roles_admin_insert" on public.user_roles
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "user_roles_admin_update" on public.user_roles
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "user_roles_admin_delete" on public.user_roles
  for delete to authenticated using (public.is_admin(auth.uid()));

-- PROJECTS
create policy "projects_select" on public.projects
  for select to authenticated using (
    public.is_admin(auth.uid()) or public.is_project_member(auth.uid(), id) or created_by = auth.uid()
  );
create policy "projects_admin_insert" on public.projects
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "projects_admin_update" on public.projects
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "projects_admin_delete" on public.projects
  for delete to authenticated using (public.is_admin(auth.uid()));

-- PROJECT MEMBERS
create policy "pm_select" on public.project_members
  for select to authenticated using (
    public.is_admin(auth.uid()) or user_id = auth.uid() or public.is_project_member(auth.uid(), project_id)
  );
create policy "pm_admin_insert" on public.project_members
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "pm_admin_delete" on public.project_members
  for delete to authenticated using (public.is_admin(auth.uid()));

-- TASKS
create policy "tasks_select" on public.tasks
  for select to authenticated using (
    public.is_admin(auth.uid()) or public.is_project_member(auth.uid(), project_id) or assigned_to = auth.uid()
  );
create policy "tasks_admin_insert" on public.tasks
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "tasks_update" on public.tasks
  for update to authenticated using (
    public.is_admin(auth.uid()) or assigned_to = auth.uid() or public.is_project_member(auth.uid(), project_id)
  );
create policy "tasks_admin_delete" on public.tasks
  for delete to authenticated using (public.is_admin(auth.uid()));

-- TASK COMMENTS
create policy "tc_select" on public.task_comments
  for select to authenticated using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.tasks t
      where t.id = task_id and (public.is_project_member(auth.uid(), t.project_id) or t.assigned_to = auth.uid())
    )
  );
create policy "tc_insert" on public.task_comments
  for insert to authenticated with check (
    user_id = auth.uid() and (
      public.is_admin(auth.uid()) or exists (
        select 1 from public.tasks t
        where t.id = task_id and (public.is_project_member(auth.uid(), t.project_id) or t.assigned_to = auth.uid())
      )
    )
  );
create policy "tc_delete_own" on public.task_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ACTIVITY LOGS
create policy "al_select_admin" on public.activity_logs
  for select to authenticated using (public.is_admin(auth.uid()) or user_id = auth.uid());
create policy "al_insert_self" on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());

-- ============ REALTIME ============
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.projects;
