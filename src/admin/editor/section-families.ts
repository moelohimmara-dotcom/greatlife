/**
 * Familles métier des blocs — Structure (tiroirs) et picker « Ajouter un bloc ».
 * Les libellés restent en langage restaurateur (TDR §2).
 */

import type { SectionType } from '@/cms/model/section'

export type FamilleBloc = {
  id: string
  label: string
  icone: string
  types: readonly SectionType[]
}

/**
 * Tiroirs Structure : groupent l’affichage des blocs déjà sur la page
 * (récit de page : ouverture → offre → maison → venir).
 */
export const FAMILLES_STRUCTURE: readonly FamilleBloc[] = [
  { id: 'ouverture', label: 'Ouverture', icone: 'arrow', types: ['hero', 'cta'] },
  { id: 'carte', label: 'Carte & offre', icone: 'leaf', types: ['menu', 'menu_featured', 'gallery'] },
  { id: 'maison', label: 'Maison', icone: 'house', types: ['story', 'engagements', 'team', 'testimonials'] },
  { id: 'venir', label: 'Venir', icone: 'pin', types: ['location', 'map', 'contact', 'reservation'] },
  { id: 'actualites', label: 'Actualités', icone: 'type', types: ['blog', 'faq'] },
  { id: 'autres', label: 'Autres', icone: 'more', types: [] },
]

/**
 * Groupes du picker : choisir QUOI ajouter (intention), pas l’ordre de page.
 * Contenu / Formulaire / Lieu — vocabulary demandé pour un restaurateur non technique.
 */
export const GROUPES_PICKER: readonly {
  id: string
  label: string
  hint: string
  types: readonly SectionType[]
}[] = [
  {
    id: 'contenu',
    label: 'Contenu',
    hint: 'Ce que vos clients lisent et regardent',
    types: [
      'hero',
      'menu',
      'menu_featured',
      'gallery',
      'story',
      'engagements',
      'team',
      'testimonials',
      'blog',
      'text',
      'image_text',
      'rich_text',
      'cta',
      'faq',
      'video',
      'spacer',
    ],
  },
  {
    id: 'formulaire',
    label: 'Formulaire',
    hint: 'Ce qu’ils vous envoient',
    types: ['reservation', 'contact'],
  },
  {
    id: 'lieu',
    label: 'Lieu',
    hint: 'Où vous trouver',
    types: ['location', 'map'],
  },
]

/** Icône associée à chaque type (alignée Structure / picker). */
export const TYPE_ICONE: Partial<Record<SectionType, string>> = {
  hero: 'image',
  text: 'type',
  image_text: 'image',
  menu: 'leaf',
  menu_featured: 'star',
  gallery: 'image',
  testimonials: 'quote',
  team: 'users',
  story: 'house',
  engagements: 'fire',
  location: 'pin',
  map: 'pin',
  reservation: 'calendar',
  contact: 'mail',
  blog: 'write',
  faq: 'quote',
  cta: 'arrow',
  video: 'image',
  spacer: 'columns',
  rich_text: 'type',
}

export function familleStructureDe(type: string): string {
  for (const famille of FAMILLES_STRUCTURE) {
    if (famille.id === 'autres') continue
    if ((famille.types as readonly string[]).includes(type)) return famille.id
  }
  return 'autres'
}

export function groupePickerDe(type: string): string {
  for (const groupe of GROUPES_PICKER) {
    if ((groupe.types as readonly string[]).includes(type as SectionType)) return groupe.id
  }
  return 'contenu'
}
