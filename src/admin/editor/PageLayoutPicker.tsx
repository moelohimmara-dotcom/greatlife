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
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
