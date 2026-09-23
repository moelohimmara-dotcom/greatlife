-- Greatlife — Migration 038 : nettoyage des lignes de sonde RLS (037)
-- ============================================================================
-- Lignes créées pendant la vérification REST de la migration 037
-- (`GLPROBE*`, email oumi-probe@example.com). Idempotente.
-- Appliquée aussi sur le projet distant sous le nom
-- `cleanup_rls_probe_orders` (20260923114932).

DELETE FROM public.orders
WHERE email IN ('oumi-probe@example.com', 'verif-orders@example.com')
   OR ref LIKE 'GLPROBE%'
   OR ref = 'GLVERIFY';
