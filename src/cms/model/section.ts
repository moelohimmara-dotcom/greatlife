/**
 * Greatlife — CMS : modèle de section
 * ====================================
 * TDR §14 : séparation stricte entre
 *   STRUCTURE     (position, visibilité)      → page_sections
 *   PRÉSENTATION  (type, variante, réglages)  → page_sections
 *   CONTENU       (textes, médias)            → page_sections.content
 *
 * Le contenu d'une section est un objet JSON validé par le registre
 * (`sections/schemas.ts`) — pas par une contrainte en base (décision DB-10).
 */

/** Les 20 types de sections : 18 issus du TDR §12 + 2 ajouts (décision CM-4). */
export type SectionType =
  | 'hero'
  | 'text'
  | 'image_text'
  | 'menu'
  | 'menu_featured'
  | 'gallery'
  | 'testimonials'
  | 'team'
  | 'story'
  | 'engagements' // ajout hors TDR : 6 engagements existent en base
  | 'location'
  | 'map'
  | 'reservation'
  | 'contact'
  | 'blog'
  | 'faq'
  | 'cta'
  | 'video'
  | 'spacer'
  | 'rich_text' // ajout hors TDR

/** Contenu d'une section : structure libre, validée par le registre. */
export type SectionContent = Record<string, unknown>

/** Réglages responsive et visuels (TDR §12 : « paramètres responsive / visuels »). */
export type SectionSettings = Record<string, unknown>

/** Une section d'une page. */
export interface PageSection {
  id: string
  pageId: string
  type: SectionType
  /** Variante dans le type (TDR §13). `null` = variante par défaut. */
  variant: string | null
  position: number
  visible: boolean
  /** Ancre SANS `#`, ex. `carte`. Le renderer construit le lien. */
  anchor: string | null
  content: SectionContent
  settings: SectionSettings
  createdAt: string
  updatedAt: string
}

/**
 * Entrée du registre : décrit un type de section.
 * C'est la pièce qui permettra à l'éditeur (Lot 2) de générer ses formulaires
 * automatiquement, et au futur AI Copilot (TDR §35) de connaître le catalogue
 * sans coder en dur.
 */
export interface SectionTypeDefinition {
  type: SectionType
  /** Libellé affiché au restaurateur — jamais le nom technique. */
  label: string
  /** Ce que la section affiche, en langage utilisateur. */
  description: string
  /** Variantes proposées (TDR §13). Vide = pas de variante. */
  variants: readonly { id: string; label: string }[]
  /**
   * Champs de contenu acceptés par ce type.
   * Décision DB-10 : c'est le registre qui fait foi — pas une contrainte SQL.
   */
  fields: readonly import('./sections/fields').FieldDef[]
  /**
   * Ce que la section tire d'un module externe plutôt que de son propre
   * contenu. Une section ne recopie JAMAIS une donnée métier (TDR §16).
   */
  providesFrom?: 'menu' | 'blog'
  /** Consomme les réglages globaux du restaurant (adresse, horaires…). */
  usesRestaurantSettings?: boolean
  /** `true` si l'implémentation visuelle est branchée sur les données. */
  implemented: boolean
}

/** Liste des identifiants d'ancre réservés par les sections migrées. */
export const LEGACY_ANCHORS = [
  'home',
  'carte',
  'histoire',
  'engagements',
  'equipe',
  'loca',
  'contact',
  'reservation',
  'temoignages',
  'blog',
] as const
