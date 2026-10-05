alter table public.generation_tasks
  add column if not exists generate_audio boolean not null default false;
