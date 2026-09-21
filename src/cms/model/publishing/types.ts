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
 * Liens du chrome figés à la publication (en-tête + pied).
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
  /**
   * Liens du chrome qui seront figés. Absent = les contrôles n°2 et n°6
   * restent non exécutés (jeux d’essai historiques). Fourni à la publication.
   */
  navigation?: readonly PublicationNavInput[]
  /** Pages publiées connues, pour résoudre une cible de type `page`. */
  publishedPageIds?: readonly string[]
}

/**
 * Conservé pour les jeux d’essai qui n’alimentent pas `navigation`.
 * À la publication réelle, `runPublicationChecks` passe `{}` : les contrôles
 * n°2 et n°6 s’exécutent (arbitrage propriétaire 2026-09-21).
 */
export const PUBLICATION_CHECKS_NOT_VERIFIED: Partial<Record<PublicationCheckId, string>> = {
  navigation:
    "La navigation du site n'a pas été fournie à ce contrôle : elle ne peut pas être vérifiée.",
  links:
    "Les liens du menu n'ont pas été fournis à ce contrôle : ils ne peuvent pas être vérifiés.",
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
