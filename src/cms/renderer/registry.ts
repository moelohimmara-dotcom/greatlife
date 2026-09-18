/**
 * Greatlife — CMS : registre des composants de section
 * =====================================================
 * Fait le lien entre un `type` de section et son composant visuel.
 *
 * ⚠️ CE FICHIER RESTE ISOMORPHE — il ne doit JAMAIS importer un composant.
 *
 * Pourquoi : `@/cms/renderer` doit rester utilisable dans Node, pour générer le
 * HTML statique à la publication (décision CM-7 / AR-10). Or un composant de
 * section dépend de `@/contexts/SiteContext`, qui dépend de `@/lib/supabase`,
 * qui lit `import.meta.env` au chargement du module — une API Vite absente de
 * Node. Vérifié : brancher un composant ici fait échouer l'import Node avec
 * `TypeError: Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')`.
 *
 * C'est pourquoi l'enregistrement est séparé :
 *
 *   registry.ts (ce fichier)   → le CONTRAT : types + point d'extension. Vide.
 *   ../register-sections.ts    → l'ENREGISTREMENT applicatif des 10 composants.
 *
 * `@/cms` (point d'entrée complet) déclenche l'enregistrement. Un script Node
 * qui génère le HTML doit fournir son propre enregistrement, ou passer par
 * Vite (qui sait résoudre `import.meta.env`).
 *
 * Tant qu'un type n'a pas de composant enregistré, le renderer utilise un rendu
 * générique de secours : la page reste lisible et jamais vide (§5.5 de
 * l'architecture).
 */

import type { ComponentType } from 'react'
import type { SectionType } from '../model/section'
import type { Locale } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'

/**
 * Données issues des modules métier, transmises aux sections qui les affichent.
 *
 * TDR §16 : une section `menu` ou `blog` ne RECOPIE jamais son contenu — elle
 * reçoit les données du module et les présente. C'est le canal prévu par
 * `docs/03_CMS_ARCHITECTURE.md` §5.2.
 *
 * Les types sont volontairement génériques ici : le CMS ne dépend pas des
 * modules existants. Chaque composant de section affine le type de ce qu'il
 * consomme.
 */
export interface SectionDataSource {
  /** Plats du module Menu — sections `menu` et `menu_featured`. */
  menu?: readonly unknown[]
  /** Articles du module Blog — section `blog`. */
  posts?: readonly unknown[]
}

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
  /** Données des modules métier, pour les sections qui en affichent. */
  data?: SectionDataSource
}

/**
 * Table type → composant, remplie par `../register-sections.ts`.
 * Vide à l'import de ce module : c'est l'enregistrement qui la peuple.
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
