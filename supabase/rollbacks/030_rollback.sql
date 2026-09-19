-- Rollback de 030_pages_published_snapshot.sql
-- =============================================
-- Redige AVANT application.
--
-- ORDRE DES ROLLBACKS : le FRONT d'abord, puis 030, puis 031.
--   1. Redeployer un front qui lit `page_sections` (sinon il interroge une
--      colonne qui n'existe plus : erreur PostgREST 42703, donc repli sur le
--      rendu historique - et ce repli PERSISTE apres les rollbacks SQL, parce
--      que la faute est dans le front).
--   2. Ce fichier (030) : retire la colonne.
--   3. supabase/rollbacks/031_rollback.sql : restaure la lecture anon.
--
-- L'ordre 031 puis 030 ne casse rien, contrairement a ce qu'une premiere
-- version de ce fichier affirmait : apres 031, `page_sections` redevient
-- lisible - c'est de toute facon l'etat vise - et le rendu public ne bouge
-- pas. Ce qui compte, c'est le rollback du FRONT, et il ne figure dans aucun
-- des deux fichiers SQL.
--
-- CE QUE CE ROLLBACK PERD, EXACTEMENT
-- La colonne `published_snapshot` est supprimee. Ce n'est PAS une perte
-- definitive du contenu publie : `page_versions.snapshot` (migration 023)
-- archive le meme contenu a chaque publication, et cet historique est immuable
-- (aucune policy UPDATE). L'etat publie reste donc reconstructible.
-- Ce qui disparait, c'est le raccourci de lecture du public.
--
-- A executer uniquement si l'on renonce a l'isolation du brouillon (TDR §22).

ALTER TABLE public.pages
  DROP COLUMN IF EXISTS published_snapshot;
