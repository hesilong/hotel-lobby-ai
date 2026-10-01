-- Temporary cross-site generation handoff while local CREEM review is pending.

create table if not exists public.generation_handoffs (
  token text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists generation_handoffs_expires_idx
  on public.generation_handoffs(expires_at);

alter table public.generation_handoffs enable row level security;
