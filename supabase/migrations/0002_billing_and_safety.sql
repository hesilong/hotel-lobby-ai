-- Billing, credits, moderation, and webhook state for Hotel Lobby AI.

alter table public.profiles alter column credits set default 10;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('pro','ultimate')),
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  plan_id text not null,
  pending_plan_id text,
  creem_subscription_id text unique,
  creem_customer_id text,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  status text not null default 'active',
  product_id text,
  pack_id text,
  checkout_id text unique,
  credits_total integer not null check (credits_total >= 0),
  credits_remaining integer not null check (credits_remaining >= 0),
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists credit_grants_user_id_idx on public.credit_grants(user_id);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  task_id uuid references public.generation_tasks(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_id_created_idx on public.credit_ledger(user_id, created_at desc);
create unique index if not exists generation_refund_once_idx
  on public.credit_ledger(task_id, reason)
  where task_id is not null and reason = 'generation_refund';

create table if not exists public.creem_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing',
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.image_moderation (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  image_url text not null,
  policy text not null,
  status text not null check (status in ('approved','rejected','error')),
  provider_task_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_key, image_url, policy)
);

alter table public.generation_tasks
  add column if not exists credits_refunded integer not null default 0;

alter table public.subscriptions enable row level security;
alter table public.credit_grants enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.creem_webhook_events enable row level security;
alter table public.image_moderation enable row level security;

drop policy if exists "users read own subscriptions" on public.subscriptions;
create policy "users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "users read own grants" on public.credit_grants;
create policy "users read own grants" on public.credit_grants for select using (auth.uid() = user_id);
drop policy if exists "users read own ledger" on public.credit_ledger;
create policy "users read own ledger" on public.credit_ledger for select using (auth.uid() = user_id);

create or replace function public.adjust_credits(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_task_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns table(balance integer, ledger_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_ledger_id uuid;
begin
  if p_delta = 0 then
    select credits into v_balance from public.profiles where id = p_user_id;
    return query select coalesce(v_balance, 0), null::uuid;
    return;
  end if;

  update public.profiles
  set credits = credits + p_delta,
      updated_at = now()
  where id = p_user_id
    and credits + p_delta >= 0
  returning credits into v_balance;

  if v_balance is null then
    if not exists(select 1 from public.profiles where id = p_user_id) then
      raise exception 'PROFILE_NOT_FOUND';
    end if;
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_ledger(user_id, delta, reason, task_id, meta)
  values(p_user_id, p_delta, p_reason, p_task_id, coalesce(p_meta, '{}'::jsonb))
  returning id into v_ledger_id;

  return query select v_balance, v_ledger_id;
end;
$$;

revoke all on function public.adjust_credits(uuid,integer,text,uuid,jsonb) from public;
grant execute on function public.adjust_credits(uuid,integer,text,uuid,jsonb) to service_role;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 10)
  on conflict do nothing;
  return new;
end;
$$;
