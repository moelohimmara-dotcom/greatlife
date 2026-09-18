/**
 * Greatlife — CMS : rendu d'une section
 * ======================================
 * Choisit l'implémentation du type, résout le contenu dans la langue active,
 * et retombe sur le rendu générique si le composant n'est pas encore branché.
 *
 * Décision AR-3 : la résolution des langues est faite ICI, une seule fois.
 * Aucun composant de section ne reçoit d'objet bilingue.
 *
 * ISOMORPHISME (décision CM-7 / AR-10) : ce composant ne touche ni à `window`,
 * ni à `document`, ni au réseau. Il ne fait que rendre ce qu'on lui donne —
 * il est donc exécutable au build (Node) comme dans le navigateur.
 */

import type { CSSProperties } from 'react'
import type { PageSection } from '../model/section'
import type { Locale } from '../model/i18n'
import { resolveContentObject } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'
import { getSectionComponent, type SectionComponentProps } from './registry'
import { SectionFallback } from './SectionFallback'

export interface SectionRendererProps {
  section: PageSection
  locale: Locale
  restaurant: ResolvedRestaurant
  /** `true` en prévisualisation d'administration : affiche les cas limites. */
  preview?: boolean
}

export function SectionRenderer({
  section,
  locale,
  restaurant,
  preview = false,
}: SectionRendererProps) {
  const Component = getSectionComponent(section.type)

  const props: SectionComponentProps = {
    content: resolveContentObject(section.content, locale),
    variant: section.variant,
    settings: section.settings,
    locale,
    restaurant,
    anchor: section.anchor,
  }

  if (Component) return <Component {...props} />

  return (
    <SectionFallback
      type={section.type}
      content={props.content}
      variant={props.variant}
      settings={props.settings}
      locale={locale}
      restaurant={restaurant}
      anchor={section.anchor}
      preview={preview}
    />
  )
}

/**
 * Enveloppe de section : porte l'ancre et la marge de défilement.
 * L'ancre est stockée SANS `#` en base ; le lien est construit ici.
 */
export function sectionAnchorId(section: PageSection): string | undefined {
  return section.anchor ?? undefined
}

/** Style commun : compense la hauteur de la barre de navigation fixe. */
export const SECTION_SCROLL_STYLE: CSSProperties = { scrollMarginTop: 80 }
