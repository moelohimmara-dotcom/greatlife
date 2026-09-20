/**
 * Mises en page de la PAGE — TDR §13 (variantes maîtrisées).
 *
 * Distinct des dispositions de BLOC (`variant` sur chaque section).
 * Ici on assemble les blocs déjà présents : on ne change ni leur contenu,
 * ni l'ordre. Une mise en page inconnue retombe sur « Colonne unique »,
 * qui est le défilement historique — `verify:lot1` n'est pas concerné
 * (il rend les sections isolément).
 */

export const PAGE_LAYOUTS = [
  {
    id: 'single_column',
    label: 'Colonne unique',
    help: 'Les blocs se suivent de haut en bas, comme aujourd’hui.',
  },
  {
    id: 'hero_alternating',
    label: 'Bannière et blocs alternés',
    help: 'La bannière en haut, puis les blocs avec un fond clair / légèrement teinté en alternance.',
  },
  {
    id: 'magazine',
    label: 'Grille magazine',
    help: 'La bannière en pleine largeur, les blocs suivants côte à côte comme un journal.',
  },
  {
    id: 'hero_parallax',
    label: 'Bannière plein écran',
    help: 'La bannière occupe l’écran et reste en fond pendant que le reste de la page défile par-dessus.',
  },
  {
    id: 'split',
    label: 'Écran partagé',
    help: 'La bannière à gauche, le reste de la page à droite. Sur un petit écran, tout se remet en colonne.',
  },
] as const

export type PageLayout = (typeof PAGE_LAYOUTS)[number]['id']

export const DEFAULT_PAGE_LAYOUT: PageLayout = 'single_column'

const IDS: readonly string[] = PAGE_LAYOUTS.map((item) => item.id)

export function normaliserPageLayout(valeur: string | null | undefined): PageLayout {
  return typeof valeur === 'string' && IDS.includes(valeur)
    ? (valeur as PageLayout)
    : DEFAULT_PAGE_LAYOUT
}

export function pageLayoutLabel(id: PageLayout): string {
  return PAGE_LAYOUTS.find((item) => item.id === id)?.label ?? PAGE_LAYOUTS[0].label
}
