/**
 * Greatlife — CMS : modèle de page
 * =================================
 * TDR §21 : chaque page porte un nom, un slug, un statut, ses sections,
 * ses métadonnées SEO, une visibilité et des dates.
 */

import type { Bilingue } from './i18n'

/** TDR §21 : trois statuts. Le public ne voit QUE `published` (TDR §22). */
export type PageStatus = 'draft' | 'published' | 'archived'

export const PAGE_STATUSES: readonly PageStatus[] = ['draft', 'published', 'archived']

/** Libellés affichables — le restaurateur ne doit jamais lire « draft ». */
export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

/** Métadonnées SEO d'une page (TDR §26), bilingues. */
export interface PageSeo {
  title?: Bilingue
  description?: Bilingue
  image?: string
  canonical?: string
  noindex?: boolean
}

/** Une page du site. */
export interface Page {
  id: string
  /** `''` désigne la page d'accueil. Un seul slug par page (décision CM-6). */
  slug: string
  title: Bilingue
  status: PageStatus
  sortOrder: number
  seo: PageSeo
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

/** Page accompagnée de ses sections ordonnées. */
export interface PageWithSections {
  page: Page
  sections: import('./section').PageSection[]
}

/** Statut affiché dans l'interface, en langage restaurateur. */
export function pageStatusLabel(status: PageStatus): string {
  return PAGE_STATUS_LABELS[status] ?? status
}
