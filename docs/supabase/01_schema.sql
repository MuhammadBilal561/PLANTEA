-- Plantea (vNext) - Supabase schema
-- Run this FIRST in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- =========================
-- ENUMS
-- =========================
do $$ begin
  create type public.user_role as enum ('buyer','seller','rider','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'draft',
    'placed',
    'seller_confirmed',
    'assigned_rider',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cod','jazzcash_manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('unpaid','pending_verification','verified','rejected','refunded');
exception when duplicate_object then null; end $$;

-- =========================
-- updated_at helper
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =========================
-- PROFILES (app user data)
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'buyer',
  full_name text not null,
  phone text unique,
  city text not null default 'Lahore',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'buyer')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================
-- ADDRESSES
-- =========================
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  receiver_name text,
  phone text,
  city text not null,
  address_line1 text not null,
  address_line2 text,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses(user_id);

-- =========================
-- PLANTS
-- =========================
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  scientific_name text,
  description text,
  category text,
  price_pkr numeric(12,2) not null check (price_pkr > 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  city text not null default 'Lahore',
  is_available boolean not null default true,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plants_seller on public.plants(seller_id);
create index if not exists idx_plants_city on public.plants(city);
create index if not exists idx_plants_category on public.plants(category);

drop trigger if exists trg_plants_updated_at on public.plants;
create trigger trg_plants_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

create table if not exists public.plant_images (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_plant_images_plant on public.plant_images(plant_id);

-- =========================
-- WISHLIST
-- =========================
create table if not exists public.wishlist_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, plant_id)
);

-- =========================
-- CARTS
-- =========================
create table if not exists public.carts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  cart_user_id uuid not null references public.carts(user_id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_user_id, plant_id)
);

-- =========================
-- ORDERS
-- =========================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  rider_id uuid references public.profiles(id),
  status public.order_status not null default 'placed',

  delivery_fee_pkr numeric(12,2) not null default 150.00,
  items_subtotal_pkr numeric(12,2) not null default 0,
  total_pkr numeric(12,2) not null default 0,

  delivery_address_id uuid references public.addresses(id),
  delivery_address_snapshot jsonb not null default '{}'::jsonb,

  payment_method public.payment_method not null default 'cod',
  payment_status public.payment_status not null default 'unpaid',

  placed_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_seller on public.orders(seller_id);
create index if not exists idx_orders_rider on public.orders(rider_id);
create index if not exists idx_orders_status on public.orders(status);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  plant_id uuid not null references public.plants(id),
  plant_name_snapshot text not null,
  unit_price_pkr numeric(12,2) not null check (unit_price_pkr > 0),
  quantity int not null check (quantity > 0),
  line_total_pkr numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items(order_id);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_events_order on public.order_events(order_id);

-- =========================
-- PAYMENTS
-- =========================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'unpaid',
  amount_pkr numeric(12,2) not null check (amount_pkr >= 0),
  provider_reference text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  storage_path text not null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_proofs_payment on public.payment_proofs(payment_id);

-- =========================
-- NOTIFICATIONS
-- =========================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general',
  meta jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read);
