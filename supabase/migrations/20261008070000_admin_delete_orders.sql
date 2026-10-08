-- Allow admins to permanently delete orders (and their items via cascade).
-- Without these policies, the admin Orders UI cannot remove rows under RLS.

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete order items"
ON public.order_items FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
