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
 *
 * ⚠️ Import : passer par `@/cms/renderer` et NON par `@/cms` dans un contexte
 * sans navigateur — le point d'entrée global réexporte le repository, qui
 * dépend de `@/lib/supabase` et lit `import.meta.env` au chargement.
 */

import type { CSSProperties } from 'react'
import type { PageSection } from '../model/section'
import type { Locale } from '../model/i18n'
import { resolveContentObject } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'
import { getSectionDefinition } from '../model/sections/schemas'
import { getSectionComponent, type SectionComponentProps, type SectionDataSource } from './registry'
import { SectionFallback } from './SectionFallback'
import { SectionErrorBoundary } from './ErrorBoundary'

export interface SectionRendererProps {
  section: PageSection
  locale: Locale
  restaurant: ResolvedRestaurant
  /** Données des modules métier (plats, articles) pour les sections concernées. */
  data?: SectionDataSource
  /** `true` en prévisualisation d'administration : affiche les cas limites. */
  preview?: boolean
}

/** Marge de défilement : compense la hauteur de la barre de navigation fixe. */
export const SECTION_SCROLL_STYLE: CSSProperties = { scrollMarginTop: 80 }

export function SectionRenderer({
  section,
  locale,
  restaurant,
  data,
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
    data,
    preview,
  }

  /*
    L'ancre est portée par une ENVELOPPE UNIQUE, quel que soit le cas
    (composant dédié ou rendu de secours). Sans cette enveloppe, l'ancre
    disparaîtrait dès qu'un composant est branché — et les 10 ancres migrées
    (`#carte`, `#histoire`…) cesseraient de fonctionner.

    Le `SectionErrorBoundary` garantit la règle §5.5 : une section dont le
    rendu échoue (donnée malformée, défaut dans un composant) n'entraîne PAS
    le reste de la page. Sans lui, un seul contenu hostile blanchirait tout
    le site public.
  */
  const label = getSectionDefinition(section.type)?.label

  return (
    <div
      id={section.anchor ?? undefined}
      data-cms-section={section.type}
      data-cms-anchor={section.anchor ?? undefined}
      style={SECTION_SCROLL_STYLE}
    >
      <SectionErrorBoundary key={`${section.id}:${section.variant ?? ''}`} sectionType={section.type} sectionLabel={label}>
        {Component ? (
          <Component {...props} />
        ) : (
          <SectionFallback
            type={section.type}
            content={props.content}
            variant={props.variant}
            restaurant={restaurant}
            preview={preview}
          />
        )}
      </SectionErrorBoundary>
    </div>
  )
}
