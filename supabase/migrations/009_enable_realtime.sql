-- Greatlife — Migration 009 : Activer Realtime sur messages et reservations
-- ====================================================================
-- Permet les notifications instantanées via Supabase Realtime
-- (postgres_changes) au lieu du polling périodique dans le panneau admin.

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
