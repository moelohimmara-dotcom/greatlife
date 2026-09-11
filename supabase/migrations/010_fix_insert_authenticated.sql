-- Greatlife — Migration 010 : Allow authenticated users to insert messages & reservations
-- ======================================================================
-- The public insert policies were scoped to TO anon only. When an admin
-- (authenticated) tested the contact form, supabase-js sent the admin's
-- access token instead of the anon key, so the INSERT hit no matching
-- policy → 42501 "new row violates row-level security policy".
-- Emails still went out (Edge Function is separate) but the insert failed
-- → frontend showed "Echec de l'envoi" and the admin dashboard never saw
-- the message.
--
-- Fix: allow both anon AND authenticated roles to insert, since the
-- contact/reservation forms are public and any visitor (logged in or
-- not) should be able to submit them.

DROP POLICY IF EXISTS "messages_public_insert" ON public.messages;
CREATE POLICY "messages_public_insert" ON public.messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;
CREATE POLICY "reservations_public_insert" ON public.reservations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
