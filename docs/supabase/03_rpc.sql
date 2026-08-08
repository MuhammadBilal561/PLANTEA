-- Plantea (vNext) - RPC functions
-- Run this THIRD in Supabase SQL Editor (after 01_schema.sql + 02_rls.sql)

create or replace function public.checkout_cart(
  p_address_id uuid,
  p_payment_method public.payment_method default 'cod'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_order_id uuid;
  v_seller_id uuid;
  v_delivery_fee numeric(12,2) := 150.00;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item record;
  v_address public.addresses%rowtype;
begin
  if v_buyer is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_address
  from public.addresses a
  where a.id = p_address_id and a.user_id = v_buyer;

  if not found then
    raise exception 'Invalid address';
  end if;

  -- Ensure cart exists
  insert into public.carts(user_id) values (v_buyer)
  on conflict (user_id) do nothing;

  -- Determine seller_id (single-seller per order)
  select p.seller_id into v_seller_id
  from public.cart_items ci
  join public.plants p on p.id = ci.plant_id
  where ci.cart_user_id = v_buyer
  limit 1;

  if v_seller_id is null then
    raise exception 'Cart is empty';
  end if;

  -- Validate all cart items are from same seller
  if exists (
    select 1
    from public.cart_items ci
    join public.plants p on p.id = ci.plant_id
    where ci.cart_user_id = v_buyer and p.seller_id <> v_seller_id
  ) then
    raise exception 'Cart contains multiple sellers. Split checkout is required.';
  end if;

  -- Create order
  insert into public.orders (
    buyer_id, seller_id, status,
    delivery_fee_pkr,
    delivery_address_id,
    delivery_address_snapshot,
    payment_method, payment_status,
    items_subtotal_pkr, total_pkr
  )
  values (
    v_buyer, v_seller_id, 'placed',
    v_delivery_fee,
    p_address_id,
    jsonb_build_object(
      'label', v_address.label,
      'city', v_address.city,
      'address_line1', v_address.address_line1,
      'address_line2', v_address.address_line2,
      'notes', v_address.notes,
      'receiver_name', v_address.receiver_name,
      'phone', v_address.phone
    ),
    p_payment_method,
    case when p_payment_method = 'cod' then 'unpaid' else 'pending_verification' end,
    0, 0
  )
  returning id into v_order_id;

  -- Create items, compute subtotal, decrement stock
  for v_item in
    select ci.plant_id, ci.quantity, p.name, p.price_pkr, p.stock_quantity
    from public.cart_items ci
    join public.plants p on p.id = ci.plant_id
    where ci.cart_user_id = v_buyer
  loop
    if v_item.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for %', v_item.name;
    end if;

    insert into public.order_items (
      order_id, plant_id,
      plant_name_snapshot,
      unit_price_pkr, quantity, line_total_pkr
    )
    values (
      v_order_id, v_item.plant_id,
      v_item.name,
      v_item.price_pkr, v_item.quantity,
      (v_item.price_pkr * v_item.quantity)
    );

    update public.plants
    set stock_quantity = stock_quantity - v_item.quantity,
        is_available = case when (stock_quantity - v_item.quantity) > 0 then true else false end
    where id = v_item.plant_id;

    v_subtotal := v_subtotal + (v_item.price_pkr * v_item.quantity);
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  update public.orders
  set items_subtotal_pkr = v_subtotal,
      total_pkr = v_total
  where id = v_order_id;

  -- Payment record for jazzcash_manual flow
  if p_payment_method = 'jazzcash_manual' then
    insert into public.payments(order_id, method, status, amount_pkr)
    values (v_order_id, 'jazzcash_manual', 'pending_verification', v_total);
  end if;

  -- Order event
  insert into public.order_events(order_id, actor_id, event_type, message)
  values (v_order_id, v_buyer, 'placed', 'Order placed');

  -- Clear cart
  delete from public.cart_items where cart_user_id = v_buyer;

  return v_order_id;
end;
$$;

grant execute on function public.checkout_cart(uuid, public.payment_method) to authenticated;
