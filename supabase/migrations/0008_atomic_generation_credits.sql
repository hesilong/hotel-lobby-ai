-- Make generation credit debits/refunds atomic with grant attribution.
-- The profile row serializes concurrent credit mutations for one user.

create or replace function public.consume_generation_credits(
  p_user_id uuid,
  p_amount integer,
  p_task_id uuid,
  p_meta jsonb default '{}'::jsonb
)
returns table(
  balance integer,
  ledger_id uuid,
  grant_debits jsonb,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_ledger_id uuid;
  v_existing_meta jsonb;
  v_remaining integer;
  v_take integer;
  v_grant record;
  v_debits jsonb := '[]'::jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CREDIT_AMOUNT';
  end if;
  if p_task_id is null then
    raise exception 'TASK_ID_REQUIRED';
  end if;

  select credits
    into v_balance
    from public.profiles
    where id = p_user_id
    for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select id, meta
    into v_ledger_id, v_existing_meta
    from public.credit_ledger
    where user_id = p_user_id
      and task_id = p_task_id
      and reason = 'generation'
    limit 1;

  if v_ledger_id is not null then
    return query
      select v_balance,
             v_ledger_id,
             coalesce(v_existing_meta->'grant_debits', '[]'::jsonb),
             true;
    return;
  end if;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_remaining := p_amount;

  for v_grant in
    select id, credits_remaining
      from public.credit_grants
      where user_id = p_user_id
        and status = 'active'
        and credits_remaining > 0
      order by expires_at asc nulls last, created_at asc
      for update
  loop
    exit when v_remaining <= 0;

    v_take := least(v_grant.credits_remaining, v_remaining);
    if v_take <= 0 then
      continue;
    end if;

    update public.credit_grants
      set credits_remaining = credits_remaining - v_take,
          updated_at = now()
      where id = v_grant.id;

    v_debits := v_debits || jsonb_build_array(
      jsonb_build_object('grant_id', v_grant.id, 'amount', v_take)
    );
    v_remaining := v_remaining - v_take;
  end loop;

  select a.balance, a.ledger_id
    into v_balance, v_ledger_id
    from public.adjust_credits(
      p_user_id,
      -p_amount,
      'generation',
      p_task_id,
      coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('grant_debits', v_debits)
    ) a;

  return query select v_balance, v_ledger_id, v_debits, false;
end;
$$;

revoke all on function public.consume_generation_credits(uuid,integer,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.consume_generation_credits(uuid,integer,uuid,jsonb)
  to service_role;

create or replace function public.refund_generation_credits(
  p_user_id uuid,
  p_amount integer,
  p_task_id uuid,
  p_meta jsonb default '{}'::jsonb
)
returns table(
  balance integer,
  ledger_id uuid,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_ledger_id uuid;
  v_existing uuid;
  v_original_meta jsonb;
  v_debits jsonb := '[]'::jsonb;
  v_item jsonb;
  v_grant_id uuid;
  v_requested integer;
  v_restore integer;
  v_remaining integer;
  v_grant record;
  v_restored jsonb := '[]'::jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CREDIT_AMOUNT';
  end if;
  if p_task_id is null then
    raise exception 'TASK_ID_REQUIRED';
  end if;

  select credits
    into v_balance
    from public.profiles
    where id = p_user_id
    for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select id
    into v_existing
    from public.credit_ledger
    where user_id = p_user_id
      and task_id = p_task_id
      and reason = 'generation_refund'
    limit 1;

  if v_existing is not null then
    return query select v_balance, v_existing, true;
    return;
  end if;

  select meta
    into v_original_meta
    from public.credit_ledger
    where user_id = p_user_id
      and task_id = p_task_id
      and reason = 'generation'
    order by created_at desc
    limit 1;

  if v_original_meta is not null and jsonb_typeof(v_original_meta->'grant_debits') = 'array' then
    v_debits := v_original_meta->'grant_debits';
  end if;

  v_remaining := p_amount;

  for v_item in
    select value from jsonb_array_elements(v_debits)
  loop
    exit when v_remaining <= 0;

    begin
      v_grant_id := (v_item->>'grant_id')::uuid;
      v_requested := greatest(0, coalesce((v_item->>'amount')::integer, 0));
    exception when others then
      continue;
    end;

    if v_requested <= 0 then
      continue;
    end if;

    select id, credits_total, credits_remaining, status
      into v_grant
      from public.credit_grants
      where id = v_grant_id
        and user_id = p_user_id
      for update;

    if not found or v_grant.status <> 'active' then
      continue;
    end if;

    v_restore := least(
      v_requested,
      v_remaining,
      greatest(0, v_grant.credits_total - v_grant.credits_remaining)
    );

    if v_restore <= 0 then
      continue;
    end if;

    update public.credit_grants
      set credits_remaining = credits_remaining + v_restore,
          updated_at = now()
      where id = v_grant_id;

    v_restored := v_restored || jsonb_build_array(
      jsonb_build_object('grant_id', v_grant_id, 'amount', v_restore)
    );
    v_remaining := v_remaining - v_restore;
  end loop;

  select a.balance, a.ledger_id
    into v_balance, v_ledger_id
    from public.adjust_credits(
      p_user_id,
      p_amount,
      'generation_refund',
      p_task_id,
      coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('grant_restores', v_restored)
    ) a;

  return query select v_balance, v_ledger_id, false;
end;
$$;

revoke all on function public.refund_generation_credits(uuid,integer,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.refund_generation_credits(uuid,integer,uuid,jsonb)
  to service_role;
