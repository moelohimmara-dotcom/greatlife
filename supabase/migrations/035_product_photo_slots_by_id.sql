-- Greatlife — Migration 035 : photo de plat liée à l'identité, pas au nom
-- ============================================================================
-- POURQUOI
-- La carte cherchait `produit-{slug(nom)}`. Renommer « Le Greatlife » en
-- « Le Greatlife Spécial » orphelinisait `produit-le-greatlife`. Les accents
-- (« Mangue fraîche ») produisaient un autre slug que celui du fichier.
--
-- CE QUE ÇA CHANGE
-- Les 4 photos déjà en médiathèque passent à `produit-{menu_items.id}`.
-- UPDATE conditionnel : si l'UUID n'est plus celui du plat, 0 ligne touchée.
--
-- Idempotente. Réversible par : supabase/rollbacks/035_rollback.sql

UPDATE public.media_assets AS m
SET slot = 'produit-' || i.id::text,
    updated_at = now()
FROM public.menu_items AS i
WHERE m.slot = 'produit-le-greatlife'
  AND i.id = '7d9e302d-1da0-4438-8cb4-8988ca31c1f8';

UPDATE public.media_assets AS m
SET slot = 'produit-' || i.id::text,
    updated_at = now()
FROM public.menu_items AS i
WHERE m.slot = 'produit-le-tropical'
  AND i.id = '2d88ca08-9faf-4ba2-b629-717bb98062e7';

UPDATE public.media_assets AS m
SET slot = 'produit-' || i.id::text,
    updated_at = now()
FROM public.menu_items AS i
WHERE m.slot = 'produit-frites-de-patate-douce'
  AND i.id = '979ae57d-a167-4394-8fde-44be10ec1179';

UPDATE public.media_assets AS m
SET slot = 'produit-' || i.id::text,
    updated_at = now()
FROM public.menu_items AS i
WHERE m.slot = 'produit-mangue-fraiche'
  AND i.id = 'a7034d01-a7b0-4ecc-b12e-dd2743953466';
