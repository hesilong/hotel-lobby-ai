-- Post-process successful Hotel Lobby videos with our own licensed/original soundtrack.
-- Provider generation success remains terminal; soundtrack delivery is an enhancement
-- and must never turn a successful provider generation into a refundable failure.

alter table public.generation_tasks
  add column if not exists audio_status text not null default 'not_requested',
  add column if not exists audio_job_id text,
  add column if not exists audio_result_url text,
  add column if not exists audio_attempts integer not null default 0,
  add column if not exists audio_last_error text,
  add column if not exists audio_updated_at timestamptz;

do $$
begin
  alter table public.generation_tasks
    add constraint generation_tasks_audio_status_check
    check (audio_status in ('not_requested','pending','processing','mixed','fallback'));
exception
  when duplicate_object then null;
end $$;

create index if not exists generation_tasks_audio_reconcile_idx
  on public.generation_tasks(status, audio_status, audio_updated_at);
