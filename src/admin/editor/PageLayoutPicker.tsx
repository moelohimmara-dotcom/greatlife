/**
 * Sélecteur de mise en page — langage restaurateur uniquement.
 */

import { useSite } from '@/contexts/SiteContext'
import { PAGE_LAYOUTS, type PageLayout } from '@/cms/model/page-layout'
import { anneauFocus, boutonOutil, titreColonne } from './chrome'

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
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-pressed={actif}
              onClick={() => onChange(item.id)}
              title={item.help}
              style={{ ...boutonOutil(t, { actif, disabled }), textAlign: 'left', width: '100%' }}
              {...anneauFocus(t)}
            >
              <div>{item.label}</div>
              {actif && (
                <div style={{ fontSize: 12, fontWeight: 500, color: t.muted, marginTop: 4, lineHeight: 1.35 }}>
                  {item.help}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '10px 0 0' }}>
        L’aperçu change tout de suite. Le site public, seulement après « Mettre à jour le site ».
      </p>
    </div>
  )
}
