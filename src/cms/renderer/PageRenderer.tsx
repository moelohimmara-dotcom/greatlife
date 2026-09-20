/**
 * Greatlife — CMS : rendu d'une page complète
 * ============================================
 * Assemble une page à partir de sa structure, de ses sections et de sa
 * mise en page (cinq choix nommés, TDR §13).
 *
 * Le renderer est **isomorphe** (décision CM-7 / AR-10).
 *
 * « Colonne unique » = défilement historique, sans enveloppe.
 * Les mises en page (grille, écran partagé) se replient sous 900 px —
 * c'est le comportement téléphone du site public. L'aperçu de l'éditeur
 * donne à l'iframe la largeur Bureau (1200) ou Téléphone (390) : le même
 * CSS s'applique, sans tricher.
 */

import type { ReactNode } from 'react'
import type { Page } from '../model/page'
import type { PageSection } from '../model/section'
import type { Locale } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'
import type { SectionDataSource } from './registry'
import {
  dispositionBannierePourMiseEnPage,
  normaliserPageLayout,
  type PageLayout,
} from '../model/page-layout'
import { CSS_GABARITS_PAGE } from './page-layout-shell'
import { SectionRenderer } from './SectionRenderer'

/** Blocs assez courts pour une carte magazine. Le menu, le contact, etc. restent en bande. */
const BLOCS_MAGAZINE_CELLULE = new Set([
  'story',
  'engagements',
  'team',
  'testimonials',
  'text',
  'image',
  'image_text',
  'gallery',
  'quote',
  'cta',
  'menu_featured',
  'hours',
  'social',
  'map',
  'video',
])

export interface PageRendererProps {
  page: Page
  sections: readonly PageSection[]
  locale: Locale
  restaurant: ResolvedRestaurant
  data?: SectionDataSource
  preview?: boolean
  /** Surcharge d'aperçu. Le public lit `page.layout` de l'instantané publié. */
  layout?: PageLayout
  /** Pied de page : dans la colonne de droite en écran partagé, sinon après les blocs. */
  pied?: ReactNode
}

function rendreUne(
  section: PageSection,
  locale: Locale,
  restaurant: ResolvedRestaurant,
  data: SectionDataSource | undefined,
  preview: boolean,
  variantOverride?: string | null,
) {
  return (
    <SectionRenderer
      key={section.id}
      section={section}
      locale={locale}
      restaurant={restaurant}
      data={data}
      preview={preview}
      variantOverride={variantOverride ?? undefined}
    />
  )
}

function rendreSections(
  sections: readonly PageSection[],
  locale: Locale,
  restaurant: ResolvedRestaurant,
  data: SectionDataSource | undefined,
  preview: boolean,
  stripe: boolean,
  surchargeBanniere?: string | null,
  idBanniere?: string,
  cellules?: boolean,
) {
  return sections.map((section, i) => {
    const override = section.id === idBanniere ? surchargeBanniere : undefined
    const bloc = rendreUne(section, locale, restaurant, data, preview, override)
    if (cellules) {
      const uneHistoire = i === 0 && section.type === 'story'
      return (
        <div
          key={section.id}
          className={uneHistoire ? 'page-layout-cell page-layout-cell--spread' : 'page-layout-cell page-layout-cell--aside'}
        >
          {bloc}
        </div>
      )
    }
    if (!stripe) return bloc
    return (
      <div key={section.id} data-cms-stripe={i % 2 === 1 ? 'alt' : 'plain'}>
        {bloc}
      </div>
    )
  })
}

function rendreMagazine(
  sections: readonly PageSection[],
  locale: Locale,
  restaurant: ResolvedRestaurant,
  data: SectionDataSource | undefined,
  preview: boolean,
) {
  const out: ReactNode[] = []
  let lot: PageSection[] = []
  const viderLot = () => {
    if (lot.length === 0) return
    const copie = lot
    lot = []
    out.push(
      <div key={`mag-${copie[0].id}`} className="page-layout-grid">
        {rendreSections(copie, locale, restaurant, data, preview, false, undefined, undefined, true)}
      </div>,
    )
  }
  for (const section of sections) {
    if (BLOCS_MAGAZINE_CELLULE.has(section.type)) {
      lot.push(section)
    } else {
      viderLot()
      out.push(
        <div key={`band-${section.id}`} className="page-layout-band">
          {rendreUne(section, locale, restaurant, data, preview)}
        </div>,
      )
    }
  }
  viderLot()
  return out
}

export function PageRenderer({
  page,
  sections,
  locale,
  restaurant,
  data,
  preview = false,
  layout: layoutSurcharge,
  pied,
}: PageRendererProps) {
  const layout = normaliserPageLayout(layoutSurcharge ?? page.layout)
  const premiere = sections[0]
  const suivantes = sections.slice(1)
  const surchargeBanniere =
    premiere?.type === 'hero'
      ? dispositionBannierePourMiseEnPage(layout, premiere.variant)
      : null
  const idBanniere = surchargeBanniere ? premiere.id : undefined

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

  const une = premiere
    ? rendreUne(premiere, locale, restaurant, data, preview, surchargeBanniere)
    : null

  const corps = (() => {
    if (layout === 'single_column' || sections.length === 0) {
      return (
        <>
          {rendreSections(sections, locale, restaurant, data, preview, false, surchargeBanniere, idBanniere)}
          {pied}
        </>
      )
    }
    if (layout === 'hero_alternating') {
      return (
        <>
          {rendreSections(sections, locale, restaurant, data, preview, true, surchargeBanniere, idBanniere)}
          {pied}
        </>
      )
    }
    if (layout === 'magazine') {
      return (
        <>
          {une && <div className="page-layout-hero">{une}</div>}
          {rendreMagazine(suivantes, locale, restaurant, data, preview)}
          {pied}
        </>
      )
    }
    if (layout === 'hero_parallax') {
      return (
        <>
          {une && <div className="page-layout-parallax">{une}</div>}
          <div className="page-layout-rest">
            {rendreSections(suivantes, locale, restaurant, data, preview, false)}
            {pied}
          </div>
        </>
      )
    }
    return (
      <>
        {une && <div className="page-layout-split-hero">{une}</div>}
        <div className="page-layout-split-rest">
          {rendreSections(suivantes, locale, restaurant, data, preview, false)}
          {pied}
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
      <style dangerouslySetInnerHTML={{ __html: CSS_GABARITS_PAGE }} />
      {corps}
      {noticeVide}
    </main>
  )
}
