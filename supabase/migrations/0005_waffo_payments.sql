-- Existing subscriptions stay with Creem when the checkout provider changes.
alter table public.subscriptions
  add column if not exists payment_provider text not null default 'creem' check (payment_provider in ('creem','waffo')),
  add column if not exists waffo_order_id text,
  add column if not exists waffo_environment text check (waffo_environment in ('test','prod')),
  add column if not exists waffo_last_event_at timestamptz;
create unique index if not exists subscriptions_waffo_order_idx
  on public.subscriptions(waffo_order_id,waffo_environment) where waffo_order_id is not null;

create table public.waffo_checkout_intents (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  purchase_type text not null check (purchase_type in ('credit_pack','subscription')),
  pack_id text,
  plan_code text,
  billing_cycle text,
  store_id text not null,
  environment text not null check (environment in ('test','prod')),
  session_id text unique,
  created_at timestamptz not null default now()
);
create table public.waffo_webhook_events (
  delivery_id text primary key,
  event_type text not null,
  environment text not null check (environment in ('test','prod')),
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index waffo_webhook_pending_idx on public.waffo_webhook_events(status,next_attempt_at);
create table public.waffo_processed_events (
  event_key text primary key,
  created_at timestamptz not null default now()
);
alter table public.waffo_checkout_intents enable row level security;
alter table public.waffo_webhook_events enable row level security;
alter table public.waffo_processed_events enable row level security;
revoke all on public.waffo_checkout_intents,public.waffo_webhook_events,public.waffo_processed_events from anon,authenticated;
grant all on public.waffo_checkout_intents,public.waffo_webhook_events,public.waffo_processed_events to service_role;

-- Deduplication, subscription state, grants and balance changes commit together.
-- Any failure rolls back the receipt, so replay can safely retry the whole event.
create or replace function public.apply_waffo_event(p_event jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := (p_event->>'user_id')::uuid;
  v_type text := p_event->>'event_type';
  v_mode text := p_event->>'environment';
  v_order text := p_event->>'order_id';
  v_product text := p_event->>'product_id';
  v_key text := 'waffo:' || v_mode || ':' || v_type || ':' || (p_event->>'business_id');
  v_at timestamptz := (p_event->>'event_at')::timestamptz;
  v_start timestamptz := (p_event->>'period_start')::timestamptz;
  v_end timestamptz := (p_event->>'period_end')::timestamptz;
  v_credits integer := coalesce((p_event->>'credits')::integer,0);
  v_balance integer;
  v_sub public.subscriptions%rowtype;
  v_grant public.credit_grants%rowtype;
  v_unused integer := 0;
  v_expiry timestamptz;
  v_source text;
  v_status text;
begin
  -- Serialize all Waffo events for one account, including distinct deliveries.
  select credits into v_balance from public.profiles where id=v_user for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  insert into public.waffo_processed_events(event_key) values(v_key) on conflict do nothing;
  if not found then
    update public.waffo_webhook_events set status='processed',error=null,processed_at=now()
      where delivery_id=p_event->>'delivery_id';
    return;
  end if;
  select * into v_sub from public.subscriptions
    where waffo_order_id=v_order and waffo_environment=v_mode for update;

  if v_type like 'subscription.%' then
    -- Delayed deliveries cannot restore an older period or older lifecycle state.
    if v_sub.id is not null and ((v_start is not null and v_sub.current_period_start > v_start)
      or (v_sub.waffo_last_event_at > v_at and v_type <> 'subscription.payment_succeeded')) then
      update public.waffo_webhook_events set status='ignored',processed_at=now() where delivery_id=p_event->>'delivery_id';
      return;
    end if;
    v_status := coalesce(p_event->>'status',v_sub.status,'active');
    if v_type='subscription.payment_succeeded' and v_sub.status='unpaid' then v_status:='active'; end if;
    if v_sub.status='canceled' then v_status:='canceled'; v_credits:=0; end if;
    insert into public.subscriptions(user_id,plan_code,billing_cycle,plan_id,payment_provider,
      waffo_order_id,waffo_environment,status,current_period_start,current_period_end,
      next_credit_reset_at,cancel_at,waffo_last_event_at)
    values(v_user,p_event->>'plan_code',p_event->>'billing_cycle',v_product,'waffo',v_order,v_mode,
      v_status,v_start,v_end,
      case when p_event->>'billing_cycle'='yearly' then
        case when v_sub.current_period_start=v_start and v_sub.next_credit_reset_at is not null
          then v_sub.next_credit_reset_at else v_start + interval '1 month' end end,
      case when v_status='scheduled_cancel' then v_end end,v_at)
    on conflict(waffo_order_id,waffo_environment) where waffo_order_id is not null do update set
      plan_code=excluded.plan_code,billing_cycle=excluded.billing_cycle,plan_id=excluded.plan_id,
      status=excluded.status,current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
      next_credit_reset_at=excluded.next_credit_reset_at,cancel_at=excluded.cancel_at,
      waffo_last_event_at=greatest(subscriptions.waffo_last_event_at,excluded.waffo_last_event_at),updated_at=now();
  end if;

  if v_type='yearly.reset' then
    if v_sub.id is null or v_sub.status not in ('active','trialing','scheduled_cancel')
      or v_sub.current_period_end<=now() or v_sub.next_credit_reset_at>now() then return; end if;
    update public.subscriptions set next_credit_reset_at=v_end,updated_at=now() where id=v_sub.id;
  end if;

  if v_credits>0 then
    v_source:=case when v_type='order.completed' then 'credit_pack' else 'subscription' end;
    v_expiry:=case when v_source='credit_pack' then now()+interval '180 days'
      when p_event->>'billing_cycle'='yearly' and v_type<>'yearly.reset' then least(v_end,v_start+interval '1 month') else v_end end;
    -- Dedup across activation/payment events for the same paid period/product.
    if not exists(select 1 from public.credit_grants where checkout_id=p_event->>'grant_key') then
      if v_source='subscription' then
        select coalesce(sum(credits_remaining),0) into v_unused from public.credit_grants
          where user_id=v_user and source='subscription' and status='active';
        v_unused:=least(v_unused,v_balance);
        if v_unused>0 then perform public.adjust_credits(v_user,-v_unused,'subscription_reset',null,p_event); end if;
        update public.credit_grants set status='expired',credits_remaining=0,updated_at=now()
          where user_id=v_user and source='subscription' and status='active';
      end if;
      insert into public.credit_grants(user_id,source,product_id,pack_id,checkout_id,credits_total,credits_remaining,expires_at,meta)
        values(v_user,v_source,v_product,coalesce(p_event->>'pack_id',p_event->>'plan_code'),p_event->>'grant_key',v_credits,v_credits,v_expiry,
          jsonb_build_object('provider','waffo','order_id',v_order,'environment',v_mode));
      perform public.adjust_credits(v_user,v_credits,case when v_source='credit_pack' then 'purchase' else 'subscription_grant' end,null,p_event);
    end if;
  end if;

  if v_type='refund.succeeded' then
    -- A partial refund or used credits requires owner review instead of guessing.
    for v_grant in select * from public.credit_grants where user_id=v_user
      and meta->>'provider'='waffo' and meta->>'order_id'=v_order and meta->>'environment'=v_mode
      and status='active' for update loop
      if v_grant.source='subscription' or v_grant.credits_remaining<v_grant.credits_total or p_event->>'original_amount' is null
        or (p_event->>'refunded_amount')::numeric < (p_event->>'original_amount')::numeric then
        -- Keep attribution active while an operator reviews the refund.
        update public.credit_grants set meta=meta || jsonb_build_object('refund_review_required',true,'refund_event',v_key),updated_at=now() where id=v_grant.id;
      else
        select credits into v_balance from public.profiles where id=v_user;
        v_unused:=least(v_balance,v_grant.credits_remaining);
        if v_unused>0 then perform public.adjust_credits(v_user,-v_unused,'payment_refunded',null,p_event); end if;
        update public.credit_grants set status='refunded',credits_remaining=0,updated_at=now() where id=v_grant.id;
      end if;
    end loop;
  end if;
  if v_type='subscription.canceled' then
    select coalesce(sum(credits_remaining),0) into v_unused from public.credit_grants
      where user_id=v_user and source='subscription' and status='active'
      and meta->>'order_id'=v_order and meta->>'environment'=v_mode;
    select credits into v_balance from public.profiles where id=v_user;
    v_unused:=least(v_unused,v_balance);
    if v_unused>0 then perform public.adjust_credits(v_user,-v_unused,'subscription_ended',null,p_event); end if;
    update public.credit_grants set status='expired',credits_remaining=0,updated_at=now()
      where user_id=v_user and source='subscription' and meta->>'order_id'=v_order and meta->>'environment'=v_mode;
  end if;
  update public.waffo_webhook_events set status='processed',error=null,processed_at=now()
    where delivery_id=p_event->>'delivery_id';
end;
$$;
revoke all on function public.apply_waffo_event(jsonb) from public,anon,authenticated;
grant execute on function public.apply_waffo_event(jsonb) to service_role;
