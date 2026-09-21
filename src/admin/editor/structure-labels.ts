/**
 * Libellés Structure — distinguer plusieurs blocs du même type.
 * Affiche le titre éditable quand il existe ; sinon le type du catalogue.
 */

import type { PageSection } from '@/cms/model/section'
import { resolveI18n, type Locale, type Bilingue } from '@/cms/model/i18n'

export type LibelleStructure = {
  /** Ligne principale (titre du bloc ou type). */
  primary: string
  /** Sous-ligne : type du catalogue, si le titre est déjà en primary. */
  secondary: string | null
  /** « 1/2 » quand plusieurs blocs du même type coexistent sur la page. */
  badge: string | null
  /** Nom accessible complet. */
  aria: string
}

/** Titre éditable du bloc, résolu dans la langue de la console. */
export function titreEditableBloc(section: PageSection, locale: Locale): string {
  const raw = section.content?.title
  if (raw === null || raw === undefined) return ''
  return resolveI18n(raw as Bilingue, locale).trim()
}

/**
 * Compte, pour chaque type, combien de sections de ce type existent
 * et quel rang occupe chaque index de page (1-based).
 */
export function rangsParType(sections: readonly PageSection[]): {
  total: Record<string, number>
  rang: Record<number, number>
} {
  const total: Record<string, number> = {}
  const rang: Record<number, number> = {}
  const vu: Record<string, number> = {}
  sections.forEach((section, index) => {
    const t = section.type
    total[t] = (total[t] ?? 0) + 1
    vu[t] = (vu[t] ?? 0) + 1
    rang[index] = vu[t]
  })
  return { total, rang }
}

export function libelleStructureBloc(
  section: PageSection,
  typeLabel: string,
  locale: Locale,
  rang: number,
  totalSameType: number,
): LibelleStructure {
  const titre = titreEditableBloc(section, locale)
  const badge = totalSameType > 1 ? `${rang}/${totalSameType}` : null
  if (titre) {
    const aria = badge
      ? `${titre}, ${typeLabel}, ${badge}`
      : `${titre}, ${typeLabel}`
    return { primary: titre, secondary: typeLabel, badge, aria }
  }
  const aria = badge ? `${typeLabel}, ${badge}` : typeLabel
  return { primary: typeLabel, secondary: null, badge, aria }
}
