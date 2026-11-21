-- Flat ₹80 shipping below ₹600; free shipping at ₹600 and above.
UPDATE public.store_settings
SET
  shipping_cost = 80,
  free_shipping_threshold = 600
WHERE id = 1;

ALTER TABLE public.store_settings
  ALTER COLUMN shipping_cost SET DEFAULT 80,
  ALTER COLUMN free_shipping_threshold SET DEFAULT 600;
