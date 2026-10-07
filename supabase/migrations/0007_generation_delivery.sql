-- Separate provider generation success from long-term result persistence.
-- Provider success is user-deliverable even if an R2 copy is temporarily unavailable.

alter table public.generation_tasks
  add column if not exists provider_result_url text,
  add column if not exists storage_status text not null default 'pending',
  add column if not exists storage_attempts integer not null default 0,
  add column if not exists storage_last_error text,
  add column if not exists storage_updated_at timestamptz;

do $$
begin
  alter table public.generation_tasks
    add constraint generation_tasks_storage_status_check
    check (storage_status in ('pending','persisted','fallback'));
exception
  when duplicate_object then null;
end $$;

-- Existing results already on our CDN are treated as persisted. Any completed
-- provider-hosted result stays deliverable and is eligible for background copy.
update public.generation_tasks
set
  provider_result_url = coalesce(provider_result_url, result_url),
  storage_status = case
    when result_url like 'https://cdn.hotel-lobby-ai.pro/%' then 'persisted'
    else 'fallback'
  end,
  storage_updated_at = coalesce(storage_updated_at, updated_at)
where status = 'completed'
  and result_url is not null;

create index if not exists generation_tasks_reconcile_idx
  on public.generation_tasks(status, storage_status, updated_at);

create index if not exists generation_tasks_provider_task_idx
  on public.generation_tasks(provider, provider_task_id)
  where provider_task_id is not null;
