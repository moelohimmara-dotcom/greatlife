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

/**
 * Réglages de repli pour la prévisualisation.
 *
 * ⚠️ AUCUNE COORDONNÉE INVENTÉE (revue du 2026-09-20, I-4). Cette constante
 * portait les valeurs de démonstration (« Conakry, Guinée »,
 * « +224 000 00 00 00 ») : un aperçu qui affiche un faux numéro de téléphone
 * ment à celui qui décide de publier (TDR §4).
 *
 * ⚠️ CE COMPOSANT N'EST APPELÉ NULLE PART (mesuré : aucun `import` de
 * `LivePreview` dans `src/`). Il est conservé parce que cet environnement ne
 * permet pas de supprimer un fichier, mais il ne doit pas être rebranché tel
 * quel : `PreviewPane` est l'aperçu réellement utilisé par `PageEditor`.
 */
const RESTAURANT_ABSENT: ResolvedRestaurant = {
  name: 'Greatlife',
  address: '',
  hours: '',
  phone: '',
  emailContact: '',
  emailReservation: '',
  slogan: '',
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
            restaurant={RESTAURANT_ABSENT}
            preview
          />
        ))
      )}
    </div>
  )
}
