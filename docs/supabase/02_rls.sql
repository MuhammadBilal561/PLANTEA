-- Plantea (vNext) - RLS policies
-- Run this SECOND in Supabase SQL Editor (after 01_schema.sql)

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.plants enable row level security;
alter table public.plant_images enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.notifications enable row level security;

-- Helper: is_admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin' and p.is_active = true
  );
$$;

-- =========================
-- PROFILES
-- =========================
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
on public.profiles for select
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- =========================
-- ADDRESSES
-- =========================
drop policy if exists "addresses_crud_own" on public.addresses;
create policy "addresses_crud_own"
on public.addresses for all
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- =========================
-- PLANTS
-- =========================
drop policy if exists "plants_public_read" on public.plants;
create policy "plants_public_read"
on public.plants for select
using (is_available = true);

drop policy if exists "plants_seller_insert" on public.plants;
create policy "plants_seller_insert"
on public.plants for insert
with check (seller_id = auth.uid());

drop policy if exists "plants_seller_update" on public.plants;
create policy "plants_seller_update"
on public.plants for update
using (seller_id = auth.uid() or public.is_admin(auth.uid()))
with check (seller_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "plants_seller_delete" on public.plants;
create policy "plants_seller_delete"
on public.plants for delete
using (seller_id = auth.uid() or public.is_admin(auth.uid()));

-- Plant images: public read, seller manage

drop policy if exists "plant_images_public_read" on public.plant_images;
create policy "plant_images_public_read"
on public.plant_images for select
using (
  exists (select 1 from public.plants p where p.id = plant_id and p.is_available = true)
);

drop policy if exists "plant_images_seller_write" on public.plant_images;
create policy "plant_images_seller_write"
on public.plant_images for all
using (
  exists (
    select 1 from public.plants p
    where p.id = plant_id and (p.seller_id = auth.uid() or public.is_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.plants p
    where p.id = plant_id and (p.seller_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

-- =========================
-- WISHLIST
-- =========================
drop policy if exists "wishlist_own" on public.wishlist_items;
create policy "wishlist_own"
on public.wishlist_items for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================
-- CARTS + CART ITEMS
-- =========================
drop policy if exists "carts_own" on public.carts;
create policy "carts_own"
on public.carts for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "cart_items_own" on public.cart_items;
create policy "cart_items_own"
on public.cart_items for all
using (cart_user_id = auth.uid())
with check (cart_user_id = auth.uid());

-- =========================
-- ORDERS
-- =========================
drop policy if exists "orders_read_parties" on public.orders;
create policy "orders_read_parties"
on public.orders for select
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or rider_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer"
on public.orders for insert
with check (buyer_id = auth.uid());

-- Force updates through RPC/admin

drop policy if exists "orders_update_admin_only" on public.orders;
create policy "orders_update_admin_only"
on public.orders for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- MVP: allow seller and rider to update order status for their own orders.
-- This enables the in-app workflow without needing a backend.
-- Seller can update: placed -> seller_confirmed
-- Rider can accept: seller_confirmed -> assigned_rider (sets rider_id)
-- Rider can progress: assigned_rider -> picked_up -> in_transit -> delivered
drop policy if exists "orders_update_seller" on public.orders;
create policy "orders_update_seller"
on public.orders for update
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists "orders_update_rider" on public.orders;
create policy "orders_update_rider"
on public.orders for update
using (rider_id = auth.uid())
with check (rider_id = auth.uid());

-- MVP: allow riders to claim an order that has no rider yet.
drop policy if exists "orders_claim_rider" on public.orders;
create policy "orders_claim_rider"
on public.orders for update
using (
  rider_id is null
)
with check (
  rider_id = auth.uid()
);

drop policy if exists "orders_delete_admin_only" on public.orders;
create policy "orders_delete_admin_only"
on public.orders for delete
using (public.is_admin(auth.uid()));

-- =========================
-- ORDER ITEMS
-- =========================
drop policy if exists "order_items_read_parties" on public.order_items;
create policy "order_items_read_parties"
on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.buyer_id = auth.uid()
        or o.seller_id = auth.uid()
        or o.rider_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "order_items_write_admin_only" on public.order_items;
create policy "order_items_write_admin_only"
on public.order_items for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- =========================
-- ORDER EVENTS
-- =========================
drop policy if exists "order_events_read_parties" on public.order_events;
create policy "order_events_read_parties"
on public.order_events for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.buyer_id = auth.uid()
        or o.seller_id = auth.uid()
        or o.rider_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "order_events_write_admin_only" on public.order_events;
create policy "order_events_write_admin_only"
on public.order_events for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- =========================
-- PAYMENTS
-- =========================
drop policy if exists "payments_read_parties" on public.payments;
create policy "payments_read_parties"
on public.payments for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "payments_write_admin_only" on public.payments;
create policy "payments_write_admin_only"
on public.payments for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Proofs: buyer can add proof for own order payment

drop policy if exists "payment_proofs_read_parties" on public.payment_proofs;
create policy "payment_proofs_read_parties"
on public.payment_proofs for select
using (
  exists (
    select 1
    from public.payments pay
    join public.orders o on o.id = pay.order_id
    where pay.id = payment_id
      and (o.buyer_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "payment_proofs_insert_buyer" on public.payment_proofs;
create policy "payment_proofs_insert_buyer"
on public.payment_proofs for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.payments pay
    join public.orders o on o.id = pay.order_id
    where pay.id = payment_id
      and o.buyer_id = auth.uid()
  )
);

drop policy if exists "payment_proofs_delete_admin" on public.payment_proofs;
create policy "payment_proofs_delete_admin"
on public.payment_proofs for delete
using (public.is_admin(auth.uid()));

-- =========================
-- NOTIFICATIONS
-- =========================
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own"
on public.notifications for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_write_admin_only" on public.notifications;
create policy "notifications_write_admin_only"
on public.notifications for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "notifications_delete_admin_only" on public.notifications;
create policy "notifications_delete_admin_only"
on public.notifications for delete
using (public.is_admin(auth.uid()));
