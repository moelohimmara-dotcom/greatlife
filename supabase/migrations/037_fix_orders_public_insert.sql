-- Greatlife — Migration 037 : INSERT public des commandes (anon + authenticated)
-- ============================================================================
-- POURQUOI
-- Migration 012 a créé `orders_public_insert` en `TO anon` seulement.
-- Migration 010 avait déjà corrigé le même bug sur `messages` et
-- `reservations` : quand un visiteur (ou un admin en test) a une session
-- JWT, supabase-js envoie le token `authenticated` → aucune policy INSERT
-- ne matche → 42501 « new row violates row-level security policy ».
--
-- CE QUE ÇA CHANGE
--   1. Autorise INSERT à `anon` ET `authenticated` (même modèle que 010).
--   2. WITH CHECK contrôlé : statut forcé à `pending`, tailles bornées,
--      panier non vide — le public ne peut pas s'auto-confirmer ni injecter
--      un statut admin. Pas de bypass service_role côté client.
--
-- HORS PÉRIMÈTRE
--   Pas de policy SELECT/DELETE publique. Les admins restent sur
--   `orders_admin_read` / `orders_admin_update` (013).
--
-- Idempotente. Réversible par : supabase/rollbacks/037_rollback.sql

DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;

CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(trim(nom)) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(coalesce(phone, '')) <= 40
    AND char_length(coalesce(ref, '')) <= 40
    AND char_length(coalesce(total, '')) <= 40
    AND char_length(coalesce(pickup_time, '')) <= 40
    AND char_length(coalesce(notes, '')) <= 2000
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) BETWEEN 1 AND 50
  );

-- Garantit les privilèges table (souvent déjà présents via defaults Supabase).
GRANT INSERT ON TABLE public.orders TO anon, authenticated;
