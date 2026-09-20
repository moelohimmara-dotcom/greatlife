/**
 * Greatlife — CMS : rendu d'une page complète
 * ============================================
 * Assemble une page à partir de sa structure, de ses sections et de sa
 * mise en page (cinq choix nommés, TDR §13).
 *
 * Le renderer est **isomorphe** (décision CM-7 / AR-10).
 *
 * « Colonne unique » = défilement historique, sans enveloppe.
 * Les autres mises en page changent l'assemblage. En aperçu (`preview`),
 * on ne replie PAS la grille / l'écran partagé : l'iframe de l'éditeur
 * fait souvent moins de 900 px, ce qui faisait croire que le choix
 * n'agissait pas. Le repli téléphone ne s'applique que sur le site public.
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
  sections: readonly PageSection[]
  locale: Locale
  restaurant: ResolvedRestaurant
  data?: SectionDataSource
  preview?: boolean
  /** Surcharge d'aperçu. Le public lit `page.layout` de l'instantané publié. */
  layout?: PageLayout
}

const CSS_STRUCTURE = `
[data-cms-layout="magazine"] .page-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 0 24px 40px;
  align-items: start;
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
  box-shadow: 0 -24px 48px rgba(0,0,0,0.12);
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
  border-right: 1px solid var(--c-shadow, rgba(0,0,0,0.12));
}
[data-cms-layout="split"] .page-layout-split-rest {
  min-height: 100vh;
}
[data-cms-layout="hero_alternating"] [data-cms-stripe="alt"] {
  box-shadow: inset 8px 0 0 var(--c-primary, #2f6b4f);
  background: var(--c-surface-alt, rgba(0,0,0,0.04));
}
`

const CSS_TELEPHONE = `
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
    border-right: none;
  }
}
`

function rendreSections(
  sections: readonly PageSection[],
  locale: Locale,
  restaurant: ResolvedRestaurant,
  data: SectionDataSource | undefined,
  preview: boolean,
  stripe: boolean,
) {
  return sections.map((section, i) => {
    if (!stripe) {
      return (
        <SectionRenderer
          key={section.id}
          section={section}
          locale={locale}
          restaurant={restaurant}
          data={data}
          preview={preview}
        />
      )
    }
    return (
      <div key={section.id} data-cms-stripe={i % 2 === 1 ? 'alt' : 'plain'}>
        <SectionRenderer
          section={section}
          locale={locale}
          restaurant={restaurant}
          data={data}
          preview={preview}
        />
      </div>
    )
  })
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

  const une = premiere ? (
    <SectionRenderer
      key={premiere.id}
      section={premiere}
      locale={locale}
      restaurant={restaurant}
      data={data}
      preview={preview}
    />
  ) : null

  const corps = (() => {
    if (layout === 'single_column' || sections.length === 0) {
      return rendreSections(sections, locale, restaurant, data, preview, false)
    }
    if (layout === 'hero_alternating') {
      return rendreSections(sections, locale, restaurant, data, preview, true)
    }
    if (layout === 'magazine') {
      return (
        <>
          {une}
          {suivantes.length > 0 && (
            <div className="page-layout-grid">
              {rendreSections(suivantes, locale, restaurant, data, preview, false)}
            </div>
          )}
        </>
      )
    }
    if (layout === 'hero_parallax') {
      return (
        <>
          {une && <div className="page-layout-parallax">{une}</div>}
          {suivantes.length > 0 && (
            <div className="page-layout-rest">
              {rendreSections(suivantes, locale, restaurant, data, preview, false)}
            </div>
          )}
        </>
      )
    }
    return (
      <>
        {une && <div className="page-layout-split-hero">{une}</div>}
        <div className="page-layout-split-rest">
          {rendreSections(suivantes, locale, restaurant, data, preview, false)}
        </div>
      </>
    )
  })()

  return (
    <main
      data-cms-page={page.slug || 'home'}
      data-cms-locale={locale}
      data-cms-layout={layout}
      data-cms-preview={preview ? 'true' : undefined}
      lang={locale}
    >
      <style>{preview ? CSS_STRUCTURE : `${CSS_STRUCTURE}${CSS_TELEPHONE}`}</style>
      {corps}
      {noticeVide}
    </main>
  )
}
