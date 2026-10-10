-- Direct per-video purchases for Hotel Lobby AI.
-- Legacy credits/subscriptions remain intact for existing users, but new
-- Hotel Lobby generations can be fulfilled by a paid generation order.

create table if not exists public.generation_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'paid',
      'processing',
      'failed',
      'fulfilled',
      'refund_requested',
      'refunded'
    )),
  resolution text not null check (resolution in ('480p','720p','1080p')),
  aspect_ratio text not null check (aspect_ratio in ('9:16','16:9')),
  duration_seconds integer not null default 15 check (duration_seconds = 15),
  generate_audio boolean not null default true,
  amount_usd numeric(10,2) not null check (amount_usd > 0),
  currency text not null default 'USD' check (currency = 'USD'),

  image_a_url text not null,
  image_b_url text not null,
  image_a_asset_id uuid references public.uploaded_assets(id) on delete set null,
  image_b_asset_id uuid references public.uploaded_assets(id) on delete set null,
  reference_template_id text,
  reference_video_url text not null,
  prompt text not null,

  waffo_product_id text not null,
  waffo_order_id text,
  waffo_payment_id text,
  waffo_environment text check (waffo_environment in ('test','prod')),
  charged_amount text,
  refund_ticket_id text,
  refund_error text,

  latest_task_id uuid,
  retry_count integer not null default 0 check (retry_count >= 0),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists generation_orders_waffo_order_idx
  on public.generation_orders(waffo_order_id, waffo_environment)
  where waffo_order_id is not null;

create index if not exists generation_orders_user_created_idx
  on public.generation_orders(user_id, created_at desc);

create index if not exists generation_orders_status_idx
  on public.generation_orders(status, updated_at);

alter table public.generation_orders enable row level security;

drop policy if exists "users read own generation orders" on public.generation_orders;
create policy "users read own generation orders"
  on public.generation_orders for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.generation_orders from anon, authenticated;
grant select on public.generation_orders to authenticated;
grant all on public.generation_orders to service_role;

alter table public.generation_tasks
  add column if not exists generation_order_id uuid
    references public.generation_orders(id) on delete set null;

create index if not exists generation_tasks_order_idx
  on public.generation_tasks(generation_order_id, created_at desc);

alter table public.generation_orders
  drop constraint if exists generation_orders_latest_task_id_fkey;

alter table public.generation_orders
  add constraint generation_orders_latest_task_id_fkey
  foreign key (latest_task_id) references public.generation_tasks(id) on delete set null;

alter table public.waffo_checkout_intents
  add column if not exists generation_order_id uuid
    references public.generation_orders(id) on delete cascade;

alter table public.waffo_checkout_intents
  drop constraint if exists waffo_checkout_intents_purchase_type_check;

alter table public.waffo_checkout_intents
  add constraint waffo_checkout_intents_purchase_type_check
  check (purchase_type in ('credit_pack','subscription','generation'));

create index if not exists waffo_checkout_generation_order_idx
  on public.waffo_checkout_intents(generation_order_id)
  where generation_order_id is not null;
