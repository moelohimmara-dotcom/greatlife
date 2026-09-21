/**
 * Sélecteur de mise en page — langage restaurateur uniquement.
 */

import { PAGE_LAYOUTS, type PageLayout } from '@/cms/model/page-layout'
import { Bouton, titreColonne } from './chrome'
import { useSite } from '@/contexts/SiteContext'

interface PageLayoutPickerProps {
  value: PageLayout
  onChange: (layout: PageLayout) => void
  disabled?: boolean
}

export function PageLayoutPicker({ value, onChange, disabled }: PageLayoutPickerProps) {
  const { theme: t } = useSite()

  return (
    <div style={{ padding: '8px 14px 14px' }}>
      <div style={titreColonne(t)}>Mise en page</div>
      <div role="group" aria-label="Mise en page" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PAGE_LAYOUTS.map((item) => {
          const actif = item.id === value
          return (
            <Bouton
              key={item.id}
              etendu
              disabled={disabled}
              genre={actif ? 'actif' : 'secondaire'}
              aria-pressed={actif}
              title={item.help}
              onClick={() => onChange(item.id)}
              style={{ flexDirection: 'column', alignItems: 'flex-start', height: 'auto', minHeight: 44, padding: '10px 14px' }}
            >
              <span>{item.label}</span>
            </Bouton>
          )
        })}
      </div>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '10px 0 0' }}>
        L’aperçu change tout de suite. Le site public, seulement après « Mettre à jour le site ».
      </p>
    </div>
  )
}
