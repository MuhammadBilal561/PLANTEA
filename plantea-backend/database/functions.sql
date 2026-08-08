-- =============================================================
-- PLANTEA — Database Functions for Atomic Operations
-- =============================================================

-- Function to atomically place order and decrement stock
-- Prevents race conditions where multiple users order the same item
CREATE OR REPLACE FUNCTION place_order_atomic(
  p_buyer_id UUID,
  p_plant_id UUID,
  p_quantity INTEGER,
  p_price_at_order NUMERIC(10,2),
  p_delivery_fee_pkr NUMERIC(10,2),
  p_commission_pkr NUMERIC(10,2),
  p_total_pkr NUMERIC(10,2),
  p_delivery_address TEXT,
  p_payment_method VARCHAR(30),
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  buyer_id UUID,
  plant_id UUID,
  status order_status,
  quantity INTEGER,
  price_at_order NUMERIC(10,2),
  delivery_fee_pkr NUMERIC(10,2),
  commission_pkr NUMERIC(10,2),
  total_pkr NUMERIC(10,2),
  delivery_address TEXT,
  payment_method VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_stock INTEGER;
  new_order_id UUID;
BEGIN
  -- Lock the plant row to prevent concurrent modifications
  SELECT stock_quantity INTO current_stock
  FROM plants 
  WHERE plants.id = p_plant_id 
    AND is_available = true
  FOR UPDATE;
  
  -- Check if we have enough stock
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Plant not found or not available';
  END IF;
  
  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Only % units available', current_stock;
  END IF;
  
  -- Atomically decrement stock
  UPDATE plants 
  SET stock_quantity = stock_quantity - p_quantity
  WHERE plants.id = p_plant_id;
  
  -- Insert the order
  INSERT INTO orders (
    buyer_id, plant_id, quantity, price_at_order, 
    delivery_fee_pkr, commission_pkr, total_pkr,
    delivery_address, payment_method, notes, status
  ) VALUES (
    p_buyer_id, p_plant_id, p_quantity, p_price_at_order,
    p_delivery_fee_pkr, p_commission_pkr, p_total_pkr,
    p_delivery_address, p_payment_method, p_notes, 'pending'
  ) RETURNING orders.id INTO new_order_id;
  
  -- Return the created order
  RETURN QUERY
  SELECT 
    orders.id,
    orders.buyer_id,
    orders.plant_id,
    orders.status,
    orders.quantity,
    orders.price_at_order,
    orders.delivery_fee_pkr,
    orders.commission_pkr,
    orders.total_pkr,
    orders.delivery_address,
    orders.payment_method,
    orders.notes,
    orders.created_at
  FROM orders
  WHERE orders.id = new_order_id;
END;
$$;