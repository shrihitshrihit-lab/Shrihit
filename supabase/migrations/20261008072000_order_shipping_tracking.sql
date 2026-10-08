-- Courier / AWB tracking fields shown to customers and used in ship notifications.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

COMMENT ON COLUMN public.orders.courier_name IS 'Courier partner when order is shipped (e.g. Delhivery, Bluedart)';
COMMENT ON COLUMN public.orders.tracking_number IS 'AWB / tracking ID shared with the customer';
COMMENT ON COLUMN public.orders.tracking_url IS 'Optional deep link to courier tracking page';
COMMENT ON COLUMN public.orders.shipped_at IS 'When the order was first marked shipped';
COMMENT ON COLUMN public.orders.customer_email IS 'Checkout email used for shipping notifications';
