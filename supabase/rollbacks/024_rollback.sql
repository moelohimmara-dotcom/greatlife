-- Rollback de 024_settings_rows.sql
-- ===================================
-- Redige AVANT application.
-- Supprime uniquement les lignes AJOUTEES par la migration 024.
-- La ligne historique `site_config` n'a jamais ete touchee : rien a restaurer.

DELETE FROM public.site_content WHERE key IN ('restaurant', 'email_templates');
