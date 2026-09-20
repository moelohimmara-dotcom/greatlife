/**
 * Greatlife — CMS : rendu d'une page complète
 * ============================================
 * Assemble une page à partir de sa structure, de ses sections et de sa
 * mise en page (cinq choix nommés, TDR §13).
 *
 * Le renderer est **isomorphe** (décision CM-7 / AR-10) : il reçoit ses
 * données en paramètres et ne les charge pas lui-même.
 *
 * La navigation (header/footer) est GLOBALE (TDR §19) et rendue par le
 * composant appelant, pas ici.
 *
 * « Colonne unique » est le défilement historique : les sections se suivent
 * de haut en bas, sans enveloppe supplémentaire. Les autres mises en page
 * n'agissent qu'après publication (l'instantané porte `page.layout`).
 */

import type { Page } from '../model/page'
import type { PageSection } from '../model/section'
import type { Locale } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'
import type { SectionDataSource } from './registry'
import { normaliserPageLayout, type PageLayout } from '../model/page-layout'
import { SectionRenderer } from './SectionRenderer'

export interface PageRendererProps {
  page: Page
  /** Sections déjà ordonnées et filtrées (voir `repository/sections.ts`). */
  sections: readonly PageSection[]
  locale: Locale
  restaurant: ResolvedRestaurant
  /** Données des modules métier (plats, articles), transmises aux sections concernées. */
  data?: SectionDataSource
  /** `true` en prévisualisation d'administration. */
  preview?: boolean
  /**
   * Surcharge d'aperçu : l'éditeur montre le choix en cours avant
   * sauvegarde. Le public n'utilise jamais cette prop — il lit `page.layout`
   * issu de l'instantané publié.
   */
  layout?: PageLayout
}

const LAYOUT_CSS = `
[data-cms-layout="hero_alternating"] > [data-cms-section]:nth-child(even) {
  background: var(--c-surface-alt, rgba(0,0,0,0.03));
}
[data-cms-layout="magazine"] .page-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  align-items: stretch;
}
[data-cms-layout="hero_parallax"] .page-layout-parallax {
  position: sticky;
  top: 0;
  z-index: 0;
  min-height: 100vh;
}
[data-cms-layout="hero_parallax"] .page-layout-rest {
  position: relative;
  z-index: 1;
  background: var(--c-surface, #fff);
}
[data-cms-layout="split"] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
}
[data-cms-layout="split"] .page-layout-split-hero {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
}
[data-cms-layout="split"] .page-layout-split-rest {
  min-height: 100vh;
}
@media (max-width: 900px) {
  [data-cms-layout="magazine"] .page-layout-grid {
    grid-template-columns: 1fr;
  }
  [data-cms-layout="split"] {
    display: block;
  }
  [data-cms-layout="split"] .page-layout-split-hero {
    position: relative;
    height: auto;
  }
}
`

function rendreSections(
  sections: readonly PageSection[],
  locale: Locale,
  restaurant: ResolvedRestaurant,
  data: SectionDataSource | undefined,
  preview: boolean,
) {
  return sections.map((section) => (
    <SectionRenderer
      key={section.id}
      section={section}
      locale={locale}
      restaurant={restaurant}
      data={data}
      preview={preview}
    />
  ))
}

export function PageRenderer({
  page,
  sections,
  locale,
  restaurant,
  data,
  preview = false,
  layout: layoutSurcharge,
}: PageRendererProps) {
  const layout = normaliserPageLayout(layoutSurcharge ?? page.layout)
  const premiere = sections[0]
  const suivantes = sections.slice(1)

  const noticeVide = preview && sections.length === 0 && (
    <div
      data-cms-notice="empty-page"
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        fontSize: 14,
        opacity: 0.7,
      }}
    >
      Cette page ne contient encore aucun bloc.
    </div>
  )

  const corps = (() => {
    if (layout === 'single_column' || sections.length === 0) {
      return rendreSections(sections, locale, restaurant, data, preview)
    }

    if (layout === 'hero_alternating') {
      return rendreSections(sections, locale, restaurant, data, preview)
    }

    if (layout === 'magazine') {
      return (
        <>
          {premiere && (
            <SectionRenderer
              key={premiere.id}
              section={premiere}
              locale={locale}
              restaurant={restaurant}
              data={data}
              preview={preview}
            />
          )}
          {suivantes.length > 0 && (
            <div className="page-layout-grid">
              {rendreSections(suivantes, locale, restaurant, data, preview)}
            </div>
          )}
        </>
      )
    }

    if (layout === 'hero_parallax') {
      return (
        <>
          {premiere && (
            <div className="page-layout-parallax">
              <SectionRenderer
                key={premiere.id}
                section={premiere}
                locale={locale}
                restaurant={restaurant}
                data={data}
                preview={preview}
              />
            </div>
          )}
          {suivantes.length > 0 && (
            <div className="page-layout-rest">
              {rendreSections(suivantes, locale, restaurant, data, preview)}
            </div>
          )}
        </>
      )
    }

    // split
    return (
      <>
        {premiere && (
          <div className="page-layout-split-hero">
            <SectionRenderer
              key={premiere.id}
              section={premiere}
              locale={locale}
              restaurant={restaurant}
              data={data}
              preview={preview}
            />
          </div>
        )}
        <div className="page-layout-split-rest">
          {rendreSections(suivantes, locale, restaurant, data, preview)}
        </div>
      </>
    )
  })()

  return (
    <main
      data-cms-page={page.slug || 'home'}
      data-cms-locale={locale}
      data-cms-layout={layout}
      lang={locale}
    >
      <style>{LAYOUT_CSS}</style>
      {corps}
      {noticeVide}
    </main>
  )
}
