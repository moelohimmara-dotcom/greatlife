-- Greatlife — Rollback de la migration 037
-- ============================================================================
-- Restaure la policy INSERT d'origine (012) : `TO anon` seulement,
-- `WITH CHECK (true)`. Les INSERT authentifiés redeviennent bloqués
-- (régression du bug documenté en 010 / 037).

DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;

CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);
