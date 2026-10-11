-- Optional ready-email notifications for direct generation purchases.
-- Delivery is best-effort and must never block or fail a completed generation.

alter table public.generation_orders
  add column if not exists notify_on_complete boolean not null default true,
  add column if not exists notification_status text not null default 'pending',
  add column if not exists notification_attempts integer not null default 0,
  add column if not exists notification_sent_at timestamptz,
  add column if not exists notification_error text,
  add column if not exists notification_updated_at timestamptz;

do $$
begin
  alter table public.generation_orders
    add constraint generation_orders_notification_status_check
    check (notification_status in ('pending','sending','sent','failed','disabled'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.generation_orders
    add constraint generation_orders_notification_attempts_check
    check (notification_attempts >= 0);
exception
  when duplicate_object then null;
end $$;

create index if not exists generation_orders_notification_reconcile_idx
  on public.generation_orders(status, notification_status, notification_updated_at)
  where notify_on_complete = true and notification_sent_at is null;
