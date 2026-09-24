-- 044 : DELETE admin sur orders + reservations
-- Cause ghosting : sans policy DELETE, PostgREST renvoie 200/0 ligne ;
-- le front retire la carte, le prochain fetch la fait réapparaître.

DROP POLICY IF EXISTS "orders_admin_delete" ON public.orders;
CREATE POLICY "orders_admin_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (is_admin(ARRAY['owner'::text, 'manager'::text]));

DROP POLICY IF EXISTS "reservations_admin_delete" ON public.reservations;
CREATE POLICY "reservations_admin_delete" ON public.reservations
  FOR DELETE TO authenticated
  USING (is_admin(ARRAY['owner'::text, 'manager'::text]));
