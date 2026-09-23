/**
 * Modèle — fusion par domaine pour `site_content` (PUR)
 * =====================================================
 * POURQUOI CE MODULE EXISTE (plan P0, arbitrage du 2026-09-20)
 * Quatre écrans de contenu partageaient le même objet `content` et la même
 * écriture qui persistait L'OBJET ENTIER. Un champ vide dans l'écran A écrasait
 * la valeur publiée depuis l'écran B — la cause première de la duplication des
 * coordonnées (B-2 du backlog) et du piège documenté dans `docs/19 §7`.
 *
 * L'architecture cible s'appelle « écriture par domaine » : chaque écran envoie
 * UN PATCH ne contenant QUE les champs de son domaine, et `fusionnePatch`
 * le pose SUR la valeur actuelle sans la remplacer. Ce module est pur : il se
 * vérifie sans base (même frontière que `save-plan.ts`, CM-7 / AR-10).
 */

export type Donnees = Record<string, unknown>

/**
 * Pose un PATCH sur des données existantes.
 *
 * - les clés PRÉSENTES dans le patch remplacent la valeur actuelle — y compris
 *   pour la mettre à chaîne vide : l'écran qui affiche le champ est responsable
 *   de ce qu'il montre, et une effacement volontaire doit rester possible ;
 * - les clés ABSENTES du patch survivent INTACTES, quelle que soit leur valeur.
 *   C'est LA propriété qui ferme le piège : l'écran « Équipe » n'envoie jamais
 *   `phone`, donc sa sauvegarde ne peut pas l'écraser, même si son état local
 *   portait une valeur obsolète ou vide.
 *
 * Fusion SHALLOW, voulue : `team`, `engagements`, `testimonials` sont des
 * tableaux remplacés en bloc — un patch par élément créerait une sémantique
 * difficile à comprendre pour un restaurant.
 */
export function fusionnePatch(
  actuel: Donnees | undefined | null,
  patch: Donnees,
): Donnees {
  return { ...(actuel ?? {}), ...patch }
}

/**
 * Les clés de COORDONNÉES presentes dans un patch — c'est-à-dire celles qui
 * doivent être re-miroir vers la ligne `restaurant` (le site public la lit en
 * premier : `Localisation.tsx`, `Footer.tsx`).
 * Tenir la liste ICI, pure, permet de la tester et de la réutiliser sans base.
 */
export const CLEFS_COORDONNEES = [
  'phone',
  'emailContact',
  'emailReservation',
  'address',
  'hours',
] as const

/**
 * Identité + créneaux de retrait (J5) : le plat `restaurantName` → `restaurant.name` ;
 * `pickupTimes` (liste de chaînes) est mirroir tel quel vers `restaurant.pickupTimes`.
 */
export const CLEFS_MIROIR_RESTAURANT = [...CLEFS_COORDONNEES, 'restaurantName', 'pickupTimes'] as const

export type ClefCoordonnee = (typeof CLEFS_COORDONNEES)[number]
export type ClefMiroirRestaurant = (typeof CLEFS_MIROIR_RESTAURANT)[number]

export function clefsCoordonnees(patch: Donnees): ClefCoordonnee[] {
  return CLEFS_COORDONNEES.filter((c) => c in patch)
}

export function clefsMiroirRestaurant(patch: Donnees): ClefMiroirRestaurant[] {
  return CLEFS_MIROIR_RESTAURANT.filter((c) => c in patch)
}

/**
 * Fusionne un `fr` dans une valeur BILINGUE existante sans écraser l'anglais.
 * (Migration `032` : écraser la forme bilingue par une chaîne détruitait la
 * traduction — défaut déjà payé une fois.)
 */
export function fusionBilingue(
  avant: unknown,
  nouveau: string,
): Record<string, unknown> {
  const base =
    avant && typeof avant === 'object' && !Array.isArray(avant)
      ? (avant as Record<string, unknown>)
      : {}
  return { ...base, fr: nouveau }
}
