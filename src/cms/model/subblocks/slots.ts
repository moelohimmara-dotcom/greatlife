/**
 * Attributs d’emplacement — uniquement en aperçu éditeur.
 * Le HTML public (verify:lot1) ne doit PAS porter `data-cms-slot`.
 */
export function cmsSlotAttrs(
  preview: boolean | undefined,
  slot: string,
): { 'data-cms-slot': string } | Record<string, never> {
  return preview ? { 'data-cms-slot': slot } : {}
}
