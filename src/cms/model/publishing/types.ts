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
  level: FindingLevel | 'ok'
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

/** Un lien de menu tel que le contrôle le voit. */
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
  navigation: readonly PublicationNavInput[]
  /** Slugs des pages réellement publiées, pour détecter un lien vers une page absente. */
  publishedPageSlugs: readonly string[]
  /**
   * Correspondance identifiant de page → slug. Si elle n'est pas fournie, le
   * contrôle ne peut RIEN affirmer sur les liens de type `page` : il ne
   * signale alors aucune anomalie plutôt que d'inventer un faux positif.
   */
  pageSlugsById?: Record<string, string>
  menu: readonly PublicationMenuInput[]
  restaurant: PublicationRestaurantInput
  locale?: Locale
}

/** Assemble le rapport à partir des constats. Les 7 contrôles apparaissent toujours. */
export function buildReport(findings: readonly PublicationFinding[]): PublicationReport {
  const checks: PublicationCheckResult[] = PUBLICATION_CHECKS.map(({ id, label }) => {
    const own = findings.filter((f) => f.check === id)
    const level: FindingLevel | 'ok' = own.some((f) => f.level === 'error')
      ? 'error'
      : own.length > 0
        ? 'warning'
        : 'ok'
    return { id, label, findings: own, level }
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
