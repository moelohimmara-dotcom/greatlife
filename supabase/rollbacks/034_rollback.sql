-- Greatlife — Rollback de la migration 034
-- ============================================================================
-- Restaure EXECUTE de `is_admin(text[])` à PUBLIC (défaut Postgres).
-- `anon` peut de nouveau appeler `/rest/v1/rpc/is_admin`.

GRANT EXECUTE ON FUNCTION public.is_admin(text[]) TO PUBLIC;
