-- Prepare media before generation so image moderation happens at selection time.

create table if not exists public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  object_key text not null unique,
  public_url text not null unique,
  mime_type text not null,
  status text not null default 'uploading'
    check (status in ('uploading','moderating','approved','rejected','ready','error')),
  moderation_provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists uploaded_assets_owner_idx
  on public.uploaded_assets(owner_key, created_at desc);
create index if not exists uploaded_assets_user_idx
  on public.uploaded_assets(user_id, created_at desc);

alter table public.uploaded_assets enable row level security;

alter table public.generation_tasks
  add column if not exists image_a_asset_id uuid references public.uploaded_assets(id) on delete set null,
  add column if not exists image_b_asset_id uuid references public.uploaded_assets(id) on delete set null,
  add column if not exists reference_video_asset_id uuid references public.uploaded_assets(id) on delete set null;
