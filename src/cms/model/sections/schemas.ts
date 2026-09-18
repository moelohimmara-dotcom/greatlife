/**
 * Greatlife — CMS : registre des types de sections
 * =================================================
 * Source unique de vérité du catalogue (TDR §12 + décision CM-4).
 *
 * Chaque entrée décrit, en langage restaurateur :
 *   - ce que la section affiche,
 *   - les variantes disponibles (TDR §13),
 *   - ce qu'elle tire d'un module (menu, blog) ou des réglages du restaurant.
 *
 * `implemented` indique si le composant visuel a déjà été branché sur les
 * données. Tant qu'il vaut `false`, le renderer utilise un rendu générique de
 * secours — jamais un écran vide (voir `renderer/SectionRenderer.tsx`).
 */

import type { SectionType, SectionTypeDefinition } from '../section'

export const SECTION_TYPES: readonly SectionTypeDefinition[] = [
  {
    type: 'hero',
    label: 'Bannière d’accueil',
    description: 'Le grand bloc d’ouverture : titre, accroche, image, boutons.',
    variants: [
      { id: 'fullscreen', label: 'Plein écran' },
      { id: 'image_text', label: 'Image + texte' },
      { id: 'centered', label: 'Centré' },
      { id: 'video', label: 'Vidéo' },
    ],
    implemented: false,
  },
  {
    type: 'text',
    label: 'Texte',
    description: 'Un bloc de texte avec un titre.',
    variants: [
      { id: 'one_column', label: 'Une colonne' },
      { id: 'two_columns', label: 'Deux colonnes' },
    ],
    implemented: false,
  },
  {
    type: 'image_text',
    label: 'Image et texte',
    description: 'Une image accompagnée d’un texte.',
    variants: [
      { id: 'image_left', label: 'Image à gauche' },
      { id: 'image_right', label: 'Image à droite' },
    ],
    implemented: false,
  },
  {
    type: 'menu',
    label: 'Carte',
    description: 'Affiche les plats. Les plats sont gérés dans le module Menu : ils ne sont jamais recopiés ici.',
    variants: [
      { id: 'full', label: 'Carte complète' },
      { id: 'by_category', label: 'Par catégorie' },
      { id: 'tabs', label: 'Onglets' },
    ],
    providesFrom: 'menu',
    implemented: false,
  },
  {
    type: 'menu_featured',
    label: 'Plats à la une',
    description: 'Met en avant quelques plats choisis dans la carte.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'carousel', label: 'Carrousel' },
    ],
    providesFrom: 'menu',
    implemented: false,
  },
  {
    type: 'gallery',
    label: 'Galerie',
    description: 'Une série de photos.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'mosaic', label: 'Mosaïque' },
      { id: 'carousel', label: 'Carrousel' },
    ],
    implemented: false,
  },
  {
    type: 'testimonials',
    label: 'Avis clients',
    description: 'Ce que disent vos clients.',
    variants: [
      { id: 'cards', label: 'Cartes' },
      { id: 'quotes', label: 'Citations' },
    ],
    implemented: false,
  },
  {
    type: 'team',
    label: 'Équipe',
    description: 'Les membres de l’équipe, avec leur rôle et leur portrait.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'list', label: 'Liste' },
    ],
    implemented: false,
  },
  {
    type: 'story',
    label: 'Notre histoire',
    description: 'Le récit de la maison, avec une signature.',
    variants: [],
    implemented: false,
  },
  {
    type: 'engagements',
    label: 'Engagements',
    description: 'Ce que vous vous engagez à faire (bio, circuit court, etc.).',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'list', label: 'Liste' },
    ],
    implemented: false,
  },
  {
    type: 'location',
    label: 'Nous trouver',
    description: 'Adresse et horaires. Ces informations viennent des réglages du restaurant, elles ne sont saisies qu’une fois.',
    variants: [
      { id: 'card', label: 'Encart' },
      { id: 'wide', label: 'Pleine largeur' },
    ],
    usesRestaurantSettings: true,
    implemented: false,
  },
  {
    type: 'map',
    label: 'Carte',
    description: 'Un plan de localisation.',
    variants: [],
    implemented: false,
  },
  {
    type: 'reservation',
    label: 'Réservation',
    description: 'Le formulaire de réservation de table.',
    variants: [
      { id: 'card', label: 'Encart' },
      { id: 'wide', label: 'Pleine largeur' },
    ],
    implemented: false,
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Le formulaire de contact.',
    variants: [],
    implemented: false,
  },
  {
    type: 'blog',
    label: 'Journal',
    description: 'Vos articles. Ils sont gérés dans le module Blog : ils ne sont jamais recopiés ici.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'list', label: 'Liste' },
    ],
    providesFrom: 'blog',
    implemented: false,
  },
  {
    type: 'faq',
    label: 'Questions fréquentes',
    description: 'Une liste de questions et de réponses.',
    variants: [
      { id: 'accordion', label: 'Accordéon' },
      { id: 'list', label: 'Liste' },
    ],
    implemented: false,
  },
  {
    type: 'cta',
    label: 'Appel à l’action',
    description: 'Un bandeau avec un bouton.',
    variants: [
      { id: 'banner', label: 'Bandeau' },
      { id: 'card', label: 'Encart' },
    ],
    implemented: false,
  },
  {
    type: 'video',
    label: 'Vidéo',
    description: 'Une vidéo intégrée.',
    variants: [],
    implemented: false,
  },
  {
    type: 'spacer',
    label: 'Espacement',
    description: 'Un espace vertical entre deux blocs.',
    variants: [
      { id: 'sm', label: 'Petit' },
      { id: 'md', label: 'Moyen' },
      { id: 'lg', label: 'Grand' },
    ],
    implemented: false,
  },
  {
    type: 'rich_text',
    label: 'Contenu libre',
    description: 'Un bloc de contenu librement rédigé.',
    variants: [],
    implemented: false,
  },
]

const BY_TYPE = new Map<SectionType, SectionTypeDefinition>(
  SECTION_TYPES.map((d) => [d.type, d]),
)

/** Définition d'un type, ou `undefined` si le type n'est pas au catalogue. */
export function getSectionDefinition(type: string): SectionTypeDefinition | undefined {
  return BY_TYPE.get(type as SectionType)
}

/** `true` si le type est connu du catalogue. */
export function isKnownSectionType(type: string): boolean {
  return BY_TYPE.has(type as SectionType)
}

/** Variante par défaut d'un type (première de la liste, ou `null`). */
export function defaultVariant(type: SectionType): string | null {
  return BY_TYPE.get(type)?.variants[0]?.id ?? null
}
