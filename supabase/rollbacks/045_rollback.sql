-- Rollback 045 : retire la table des surcharges RBAC.
-- ---------------------------------------------------------------------
-- Note : la clé `rbacOverrides` retirée de `site_config` par la migration
-- n'est PAS restaurée (la restaurer rouvrirait la fuite B-S1 vers le
-- public). Après rollback, rouvrez « Utilisateurs & rôles » et
-- réenregistrez la matrice : elle repart dans la table dédiée une fois
-- la migration rejouée, ou reste par défaut sans surcharge.
DROP TABLE IF EXISTS public.rbac_overrides;
