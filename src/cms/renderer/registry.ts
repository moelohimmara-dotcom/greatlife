/**
 * Greatlife — CMS : registre des composants de section
 * =====================================================
 * Fait le lien entre un `type` de section et son composant visuel.
 *
 * ⚠️ ÉTAT AU LOT 1 : aucun composant n'est encore branché sur les données.
 *
 * Les 9 sections existantes (`Hero`, `Carte`, `Story`, `Engagements`, `Team`,
 * `Testimonials`, `Localisation`, `Contact`, `Blog`) lisent aujourd'hui leurs
 * valeurs dans les contextes et dans des constantes codées en dur. Les brancher
 * sur `content` est l'étape suivante du Lot 1 — c'est la partie risquée, car
 * elle doit produire un rendu **identique** (TDR §41).
 *
 * Tant qu'un type n'a pas de composant, le renderer utilise un rendu générique
 * de secours : la page reste lisible et jamais vide (§5.5 de l'architecture).
 */

import type { ComponentType } from 'react'
import type { PageSection, SectionType } from '../model/section'
import type { Locale } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'

/** Ce que reçoit TOUT composant de section. */
export interface SectionComponentProps {
  /** Contenu déjà résolu dans la langue active : aucun composant ne connaît le bilingue. */
  content: Record<string, unknown>
  /** Variante choisie (TDR §13), `null` si le type n'en a pas. */
  variant: string | null
  /** Réglages responsive et visuels. */
  settings: Record<string, unknown>
  /** Langue active. */
  locale: Locale
  /** Réglages du restaurant, résolus — pour les sections qui les consomment. */
  restaurant: ResolvedRestaurant
  /** Ancre de la section, sans `#`. */
  anchor: string | null
}

/**
 * Table type → composant.
 * Volontairement vide au Lot 1 : elle sera remplie composant par composant,
 * au fur et à mesure de leur branchement sur les données.
 */
const COMPONENTS: Partial<Record<SectionType, ComponentType<SectionComponentProps>>> = {}

/** Composant d'un type, ou `undefined` s'il n'est pas encore branché. */
export function getSectionComponent(
  type: SectionType,
): ComponentType<SectionComponentProps> | undefined {
  return COMPONENTS[type]
}

/**
 * Enregistre un composant pour un type.
 * Point d'extension unique : c'est ici (et nulle part ailleurs) que le lien
 * entre un type du catalogue et son implémentation est déclaré.
 */
export function registerSectionComponent(
  type: SectionType,
  component: ComponentType<SectionComponentProps>,
): void {
  COMPONENTS[type] = component
}

/** `true` si le type possède une implémentation branchée sur les données. */
export function hasSectionComponent(type: SectionType): boolean {
  return COMPONENTS[type] !== undefined
}

/** Liste des types encore à brancher — utile pour suivre l'avancement. */
export function pendingSectionTypes(types: readonly SectionType[]): SectionType[] {
  return types.filter((t) => !hasSectionComponent(t))
}

/** Signature du composant attendu, pour vérification de type à l'enregistrement. */
export type SectionComponent = ComponentType<SectionComponentProps>

/** Raccourci : une section est-elle affichable (visible et connue) ? */
export function isRenderable(section: PageSection): boolean {
  return section.visible
}
