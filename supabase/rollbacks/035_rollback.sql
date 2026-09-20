-- Greatlife — Rollback de la migration 035
-- ============================================================================
-- Restaure les emplacements dérivés du nom historique.

UPDATE public.media_assets
SET slot = 'produit-le-greatlife', updated_at = now()
WHERE slot = 'produit-7d9e302d-1da0-4438-8cb4-8988ca31c1f8';

UPDATE public.media_assets
SET slot = 'produit-le-tropical', updated_at = now()
WHERE slot = 'produit-2d88ca08-9faf-4ba2-b629-717bb98062e7';

UPDATE public.media_assets
SET slot = 'produit-frites-de-patate-douce', updated_at = now()
WHERE slot = 'produit-979ae57d-a167-4394-8fde-44be10ec1179';

UPDATE public.media_assets
SET slot = 'produit-mangue-fraiche', updated_at = now()
WHERE slot = 'produit-a7034d01-a7b0-4ecc-b12e-dd2743953466';
