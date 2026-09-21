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
import { normaliserEspacement, normaliserVisibleOn } from '../model/sections/fields'
import { sanitiserHex } from '../model/sections/couleur'
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
  /**
   * Disposition imposée par la mise en page de la page (bannière).
   * Prioritaire sur `section.variant` au rendu seulement — la donnée du bloc
   * n'est pas réécrite ici.
   */
  variantOverride?: string | null
}

/** Marge de défilement : compense la hauteur de la barre de navigation fixe. */
export const SECTION_SCROLL_STYLE: CSSProperties = { scrollMarginTop: 80 }

export function SectionRenderer({
  section,
  locale,
  restaurant,
  data,
  preview = false,
  variantOverride,
}: SectionRendererProps) {
  const Component = getSectionComponent(section.type)

  const props: SectionComponentProps = {
    content: resolveContentObject(section.content, locale),
    variant: variantOverride ?? section.variant,
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
  const fond = sanitiserHex(section.content?.blockTint)
  const titre = sanitiserHex(section.content?.headingColor)
  const espacement = normaliserEspacement(section.content?.spacing)
  const visibleOn = normaliserVisibleOn(section.content?.visibleOn)
  const enveloppe: CSSProperties = {
    ...SECTION_SCROLL_STYLE,
    ...(fond ? { background: fond, ['--section-bg' as string]: fond } : {}),
    ...(titre ? { ['--section-heading' as string]: titre } : {}),
  }

  return (
    <div
      id={section.anchor ?? undefined}
      data-cms-section={section.type}
      data-cms-anchor={section.anchor ?? undefined}
      data-cms-id={section.id}
      data-cms-hidden={preview && !section.visible ? '1' : undefined}
      data-cms-tint={fond ? '1' : undefined}
      data-cms-heading={titre ? '1' : undefined}
      data-cms-spacing={espacement === 'normal' ? undefined : espacement}
      data-cms-visible={visibleOn === 'all' ? undefined : visibleOn}
      className={visibleOn === 'all' ? undefined : `cms-visible-${visibleOn}`}
      style={{
        ...enveloppe,
        position: 'relative',
        ...(preview && !section.visible
          ? { opacity: 0.92 }
          : {}),
      }}
    >
      {preview && !section.visible && (
        <div
          className="cms-masque-bandeau"
          role="note"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.01em',
            padding: '10px 14px',
            background: '#14120e',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          }}
        >
          Masqué — invisible sur le site public. Cliquez un texte pour le modifier.
        </div>
      )}
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
