/**
 * Modèle — contrôle avant publication (TDR §24)
 * ==============================================
 * Module **pur** : il ne connaît ni Supabase, ni React, ni Vite. Il reçoit des
 * données déjà chargées et rend un rapport. C'est ce qui le rend vérifiable
 * sans framework de test et sans écrire en base (docs/10 §9).
 *
 * Aucune dépendance à `@/lib/supabase` ni à `import.meta.env` : ce module est
 * importable par un script Node (même contrainte que `@/cms/renderer`).
 */

import type { Bilingue, Locale } from '../i18n'

/** Les 7 contrôles du TDR §24 — ni plus, ni moins. */
export type PublicationCheckId =
  | 'pages'
  | 'navigation'
  | 'images'
  | 'menu'
  | 'prices'
  | 'links'
  | 'essentials'

export const PUBLICATION_CHECKS: readonly { id: PublicationCheckId; label: string }[] = [
  { id: 'pages', label: 'Pages valides' },
  { id: 'navigation', label: 'Navigation valide' },
  { id: 'images', label: 'Images valides' },
  { id: 'menu', label: 'Menu valide' },
  { id: 'prices', label: 'Prix renseignés' },
  { id: 'links', label: 'Aucun lien cassé' },
  { id: 'essentials', label: 'Informations essentielles présentes' },
]

/**
 * `error` = bloque la publication (décision P-7 de docs/10).
 * `warning` = s'affiche sans bloquer : une traduction manquante ne doit pas
 * empêcher un restaurateur de publier.
 */
export type FindingLevel = 'error' | 'warning'

/**
 * État d'un contrôle dans le rapport.
 *
 * `skipped` existe pour une raison précise : un contrôle qui ne PEUT PAS être
 * exécuté ne doit pas s'afficher « conforme ». Sans cet état, retirer un
 * contrôle revenait à afficher un voyant vert sur une vérification qui n'avait
 * pas eu lieu — un mensonge, et exactement le genre de faux feu vert que ce
 * dépôt cherche à rendre impossible.
 */
export type CheckLevel = FindingLevel | 'ok' | 'skipped'

export interface PublicationFinding {
  check: PublicationCheckId
  level: FindingLevel
  /** Message en LANGAGE RESTAURATEUR. Jamais de jargon (TDR §24, AGENTS.md §9). */
  message: string
  /** Où cela se trouve, en mots simples : « Section « Notre histoire » ». */
  where?: string
}

export interface PublicationCheckResult {
  id: PublicationCheckId
  label: string
  findings: PublicationFinding[]
  level: CheckLevel
  /** Pourquoi ce contrôle n'a pas été exécuté. Présent seulement si `skipped`. */
  note?: string
}

export interface PublicationReport {
  checks: PublicationCheckResult[]
  blockers: PublicationFinding[]
  warnings: PublicationFinding[]
  publishable: boolean
  summary: string
}

/** Une section telle que le contrôle la voit (aucune dépendance au repository). */
export interface PublicationSectionInput {
  type: string
  anchor?: string | null
  visible: boolean
  content: Record<string, unknown> | null
}

/**
 * Un lien de menu tel que le contrôle le voyait.
 *
 * ⚠️ PLUS ALIMENTÉ DEPUIS LA DÉCISION DU 2026-09-19 (constat M3).
 * Le site public ne rend PAS `navigation_items` : `PublicNav` et `Footer` portent
 * des listes écrites en dur, et aucun écran d'administration ne touche la
 * navigation. Valider ces liens revenait donc à vérifier 13 entrées que personne
 * ne voit — et à faire échouer une publication sur une donnée sans effet.
 * Le type est conservé pour le jour où la navigation sera branchée ; il n'est
 * plus consommé par `PublicationInput`.
 */
export interface PublicationNavInput {
  label: Bilingue
  targetType: 'page' | 'anchor' | 'url'
  targetPageId: string | null
  targetValue: string | null
  visible: boolean
}

export interface PublicationMenuInput {
  name: string
  price: string
}

export interface PublicationRestaurantInput {
  name: string
  phone: string
  address: string
  hours: string
}

export interface PublicationInput {
  page: { slug: string; title: Bilingue }
  sections: readonly PublicationSectionInput[]
  menu: readonly PublicationMenuInput[]
  restaurant: PublicationRestaurantInput
  locale?: Locale
}

/**
 * Contrôles que le site ne permet PAS encore de vérifier, avec la raison.
 *
 * POURQUOI C'EST ÉCRIT ICI ET PAS DANS UN COMMENTAIRE
 * Ces deux contrôles portent sur la navigation. Or le site public ne la rend
 * pas : `PublicNav` et `Footer` ont des listes en dur, et aucun écran
 * d'administration ne modifie `navigation_items`. Les exécuter reviendrait à
 * valider une fiction ; les retirer sans rien dire afficherait un vert mensonger.
 * Ils sont donc déclarés NON VÉRIFIÉS, et le panneau de publication le montre.
 *
 * CE QUE CELA COÛTE, ET C'EST ASSUMÉ
 * Les ancres que le public utilise ne sont plus vérifiées AU MOMENT DE PUBLIER.
 * Elles le sont au moment de DÉVELOPPER, par `npm run verify:anchors`, qui les
 * confronte à celles de `pages.published_snapshot` — la source que le public
 * reçoit réellement. C'est un filet de développement, pas de publication : la
 * limite est réelle et documentée.
 *
 * CE QUI GARANTIT QUE CES DEUX CONTRÔLES NE BLOQUENT JAMAIS — ET SA LIMITE
 * La garantie n'est PAS dans le type : `buildReport` fait primer le niveau le
 * plus grave, donc un constat sur `navigation` ou `links` l'emporterait sur
 * `notVerified` et réafficherait le contrôle en `error`. Ce qui la rend vraie
 * aujourd'hui, c'est qu'AUCUN code ne produit de constat pour ces deux
 * identifiants — et c'est MESURÉ, pas supposé : `npm run verify:lot3` exige que
 * les deux valent `skipped`, que leur motif soit non vide, qu'aucun ne vaille
 * `ok`, et que fournir les anciens liens ne change pas le rapport.
 * Si un jour un constat réapparaît sur l'un des deux, `verify:lot3` échoue et le
 * dit — plutôt que de laisser un vert silencieux.
 */
export const PUBLICATION_CHECKS_NOT_VERIFIED: Partial<Record<PublicationCheckId, string>> = {
  navigation:
    "La navigation du site n'est pas encore gérée depuis le CMS : elle ne peut pas être vérifiée.",
  links:
    "Les liens du menu ne sont pas encore gérés depuis le CMS : ils ne peuvent pas être vérifiés.",
}

/** Assemble le rapport à partir des constats. Les 7 contrôles apparaissent toujours. */
export function buildReport(
  findings: readonly PublicationFinding[],
  notVerified: Partial<Record<PublicationCheckId, string>> = PUBLICATION_CHECKS_NOT_VERIFIED,
): PublicationReport {
  const checks: PublicationCheckResult[] = PUBLICATION_CHECKS.map(({ id, label }) => {
    const own = findings.filter((f) => f.check === id)
    const level: CheckLevel = own.some((f) => f.level === 'error')
      ? 'error'
      : own.length > 0
        ? 'warning'
        : notVerified[id]
          ? 'skipped'
          : 'ok'
    const note = level === 'skipped' ? notVerified[id] : undefined
    return { id, label, findings: own, level, note }
  })

  const blockers = findings.filter((f) => f.level === 'error')
  const warnings = findings.filter((f) => f.level === 'warning')

  return {
    checks,
    blockers,
    warnings,
    publishable: blockers.length === 0,
    summary: reportSummary(blockers.length, warnings.length),
  }
}

function reportSummary(errors: number, warnings: number): string {
  if (errors > 0) {
    return errors === 1
      ? 'Publication impossible : 1 point à corriger.'
      : `Publication impossible : ${errors} points à corriger.`
  }
  if (warnings === 1) return 'Prêt à publier, avec 1 point à surveiller.'
  if (warnings > 1) return `Prêt à publier, avec ${warnings} points à surveiller.`
  return 'Tout est en ordre : la page peut être publiée.'
}
