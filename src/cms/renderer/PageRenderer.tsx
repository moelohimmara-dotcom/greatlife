/**
 * Greatlife — CMS : rendu d'une page complète
 * ============================================
 * Assemble une page à partir de sa structure et de ses sections.
 *
 * Le renderer est **isomorphe** (décision CM-7 / AR-10) : il reçoit ses
 * données en paramètres et ne les charge pas lui-même. C'est ce qui permet
 * de l'exécuter au build (pour produire le HTML statique) comme dans le
 * navigateur (pour l'aperçu de l'éditeur).
 *
 * La navigation (header/footer) est GLOBALE (TDR §19) et rendue par le
 * composant appelant, pas ici.
 */

import type { Page } from '../model/page'
import type { PageSection } from '../model/section'
import type { Locale } from '../model/i18n'
import type { ResolvedRestaurant } from '../repository/settings'
import type { SectionDataSource } from './registry'
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
}

export function PageRenderer({
  page,
  sections,
  locale,
  restaurant,
  data,
  preview = false,
}: PageRendererProps) {
  return (
    <main
      data-cms-page={page.slug || 'home'}
      data-cms-locale={locale}
      lang={locale}
    >
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          locale={locale}
          restaurant={restaurant}
          data={data}
          preview={preview}
        />
      ))}

      {/*
        Une page sans section est un état VALIDE (page en construction).
        On n'affiche rien plutôt qu'un message d'erreur — sauf en aperçu,
        où l'absence de contenu doit être visible.
      */}
      {preview && sections.length === 0 && (
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
      )}
    </main>
  )
}
