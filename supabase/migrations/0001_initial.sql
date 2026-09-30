create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.motion_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  preview_video_url text not null,
  source_video_url text not null,
  cover_url text,
  default_prompt text not null,
  default_ratio text not null check (default_ratio in ('16:9','9:16','1:1')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','processing','completed','failed')),
  image_a_url text not null,
  image_b_url text not null,
  reference_template_id text,
  reference_video_url text not null,
  prompt text not null,
  duration_seconds integer not null,
  resolution text not null,
  aspect_ratio text not null,
  provider text not null default 'kie',
  model_id text not null,
  provider_task_id text,
  result_url text,
  thumbnail_url text,
  credits_used integer not null default 0,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  task_id uuid references public.generation_tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.motion_templates enable row level security;
alter table public.generation_tasks enable row level security;
alter table public.credit_transactions enable row level security;

create policy "public reads active templates" on public.motion_templates for select using (active = true);
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users read own tasks" on public.generation_tasks for select using (auth.uid() = user_id);
create policy "users insert own tasks" on public.generation_tasks for insert with check (auth.uid() = user_id);
create policy "users read own credit transactions" on public.credit_transactions for select using (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
