-- Rollback 044 : retirer DELETE admin orders/reservations
DROP POLICY IF EXISTS "orders_admin_delete" ON public.orders;
DROP POLICY IF EXISTS "reservations_admin_delete" ON public.reservations;
