-- Greatlife — Migration 008 : Restrict public read on messages & reservations
-- ======================================================================
-- Remove the public_read policies that exposed private visitor data
-- (nom, email, message) to any anonymous visitor.
--
-- The frontend uses supabase-js insert() WITHOUT .select(), which sends
-- Prefer: return=minimal by default — no post-insert SELECT is triggered,
-- so anon does not need a SELECT policy on these tables.
--
-- Admin access is unchanged: authenticated admins with is_admin() role
-- retain SELECT via messages_admin_read / reservations_admin_read.

DROP POLICY IF EXISTS "messages_public_read" ON public.messages;
DROP POLICY IF EXISTS "reservations_public_read" ON public.reservations;
