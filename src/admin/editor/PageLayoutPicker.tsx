/**
 * Sélecteur de mise en page — langage restaurateur uniquement.
 */

import { useSite } from '@/contexts/SiteContext'
import { PAGE_LAYOUTS, type PageLayout } from '@/cms/model/page-layout'

interface PageLayoutPickerProps {
  value: PageLayout
  onChange: (layout: PageLayout) => void
  disabled?: boolean
}

export function PageLayoutPicker({ value, onChange, disabled }: PageLayoutPickerProps) {
  const { theme: t } = useSite()

  return (
    <div style={{ padding: '8px 14px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        Mise en page
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PAGE_LAYOUTS.map((item) => {
          const actif = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.id)}
              title={item.help}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${actif ? t.primary : t.shadow}`,
                background: actif ? `${t.primary}12` : t.bg,
                color: actif ? t.primary : t.text,
                cursor: disabled ? 'wait' : 'pointer',
                fontSize: 13,
                fontWeight: actif ? 700 : 600,
              }}
            >
              <div>{item.label}</div>
              {actif && (
                <div style={{ fontSize: 11, fontWeight: 500, color: t.muted, marginTop: 4, lineHeight: 1.35 }}>
                  {item.help}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.4, margin: '10px 0 0' }}>
        L’aperçu change tout de suite. Le site public, seulement après « Mettre à jour le site ».
      </p>
    </div>
  )
}
