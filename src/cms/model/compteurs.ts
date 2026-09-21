/**
 * COMPTEURS DE PILOTAGE — noyau pur, aucune base de données.
 *
 * POURQUOI CE MODULE EXISTE
 * Les compteurs « à traiter » de la console étaient calculés à DEUX endroits, et
 * les deux ne disaient pas la même chose :
 *
 *   - `SiteContext.load()` n'alimentait que les TOTAUX (`ordersCount`,
 *     `reservationsCount`) : les compteurs « en attente » gardaient donc leur
 *     valeur initiale, `0`, à chaque premier chargement ;
 *   - `refreshOrders()` / `refreshReservations()` les calculaient bien, mais ne
 *     sont appelés QUE par le temps réel (`postgres_changes`) : il fallait
 *     qu'une écriture survienne pendant que la page est ouverte.
 *
 * Mesuré le 2026-09-21 : 1 réservation et 4 commandes `pending` en base,
 * « 0 » affiché dans les deux cas — sur la rangée la plus importante du tableau
 * de bord. Seul le compteur de messages était juste, parce que lui est DÉRIVÉ
 * du tableau `messages` au lieu d'être stocké.
 *
 * LA RÈGLE VIT ICI, UNE SEULE FOIS. Les deux chemins l'appellent.
 */

/** Ce qu'un compteur a besoin de savoir d'une ligne : son statut, rien d'autre. */
export interface LigneStatut {
  status: string
}

/** Le statut qui veut dire « quelqu'un attend une réponse ». */
export const STATUT_EN_ATTENTE = 'pending'

export interface CompteursPilotage {
  /** Nombre total de commandes enregistrées. */
  ordersCount: number
  /** Celles qui attendent une confirmation. */
  pendingOrdersCount: number
  /** Nombre total de réservations enregistrées. */
  reservationsCount: number
  /** Celles qui attendent une confirmation. */
  pendingReservationsCount: number
}

/**
 * Une ligne est « en attente » si son statut vaut EXACTEMENT `pending`.
 * Comparaison stricte : `'Pending'`, `'en attente'` ou `''` ne comptent pas.
 * C'est volontaire — un statut inconnu ne doit pas gonfler une alarme.
 */
export function estEnAttente(ligne: LigneStatut): boolean {
  return ligne.status === STATUT_EN_ATTENTE
}

/** Combien de lignes attendent, dans une liste. */
export function compterEnAttente(lignes: LigneStatut[]): number {
  return lignes.filter(estEnAttente).length
}

/**
 * Les quatre compteurs, calculés ensemble à partir des deux listes.
 * Les totaux viennent de `length` : ils comptent TOUTES les lignes, quel que
 * soit leur statut — une réservation annulée reste une réservation.
 */
export function compteursPilotage(
  orders: LigneStatut[],
  reservations: LigneStatut[],
): CompteursPilotage {
  return {
    ordersCount: orders.length,
    pendingOrdersCount: compterEnAttente(orders),
    reservationsCount: reservations.length,
    pendingReservationsCount: compterEnAttente(reservations),
  }
}
