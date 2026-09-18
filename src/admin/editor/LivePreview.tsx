/**
 * Greatlife — CMS : prévisualisation live
 * =========================================
 * Remplace l'iframe statique par un rendu React direct.
 * Utilise le `SectionRenderer` isomorphe avec un contexte de prévisualisation
 * qui fournit les valeurs par défaut (thème, contenu legacy, médias).
 *
 * Le rendu est identique à celui du site public, mais alimenté par les
 * données locales de l'éditeur (pas encore sauvegardées).
 */

import { useMemo } from 'react'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import { SectionRenderer } from '@/cms/renderer/SectionRenderer'

interface LivePreviewProps {
  sections: PageSection[]
  locale: Locale
}

/** Réglages restaurant par défaut pour la prévisualisation. */
const DEFAULT_RESTAURANT: ResolvedRestaurant = {
  name: 'Greatlife',
  address: 'Conakry, Guinée',
  hours: 'Tous les jours · 11h00 — 23h00',
  phone: '+224 000 00 00 00',
  emailContact: 'contact@greatlife.gn',
  emailReservation: 'resa@greatlife.gn',
  slogan: 'Manger vite. Manger bio. Manger gourmand.',
  currency: 'FG',
  social: { facebook: '', whatsapp: '', instagram: '' },
}

export function LivePreview({ sections, locale }: LivePreviewProps) {
  // Ne rendre que les sections visibles
  const visibleSections = useMemo(
    () => sections.filter((s) => s.visible),
    [sections],
  )

  return (
    <div style={{
      minHeight: '100%',
      background: '#fff',
      fontFamily: 'var(--f-body, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    }}>
      {visibleSections.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
          Aucune section visible.
        </div>
      ) : (
        visibleSections.map((section, i) => (
          <SectionRenderer
            key={section.id || `section-${i}`}
            section={section}
            locale={locale}
            restaurant={DEFAULT_RESTAURANT}
            preview
          />
        ))
      )}
    </div>
  )
}
