/**
 * Greatlife — CMS : sélecteur de type de section
 * ================================================
 * Modal qui affiche la grille des 20 types du catalogue.
 * Chaque type est représenté par son label et sa description
 * en langage restaurateur (pas de jargon technique).
 */

import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { SECTION_TYPES } from '@/cms/model/sections/schemas'
import type { SectionType } from '@/cms/model/section'

interface SectionTypePickerProps {
  onSelect: (type: SectionType) => void
  onClose: () => void
}

/** Icône associée à chaque type (pour l'affichage dans la grille). */
const TYPE_ICONS: Partial<Record<string, string>> = {
  hero: 'image',
  text: 'write',
  image_text: 'image',
  menu: 'leaf',
  menu_featured: 'leaf',
  gallery: 'image',
  testimonials: 'users',
  team: 'users',
  story: 'write',
  engagements: 'leaf',
  location: 'pin',
  map: 'pin',
  reservation: 'calendar',
  contact: 'mail',
  blog: 'write',
  faq: 'settings',
  cta: 'arrow',
  video: 'eye',
  spacer: 'grid',
  rich_text: 'write',
}

export function SectionTypePicker({ onSelect, onClose }: SectionTypePickerProps) {
  const { theme: t } = useSite()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      }} />

      {/* Modale */}
      <div style={{
        position: 'relative', background: t.surface, borderRadius: 16,
        padding: '24px 28px', maxWidth: 640, width: '90%', maxHeight: '80vh',
        overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--f-heading)', fontSize: 18, fontWeight: 700, color: t.heading, margin: 0 }}>
            Ajouter une section
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 4 }}>
            {Icon.x(18, t.muted)}
          </button>
        </div>

        {/* Grille */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {SECTION_TYPES.filter((def) => def.implemented).map((def) => {
            const iconName = TYPE_ICONS[def.type] ?? 'write'
            return (
              <button key={def.type} onClick={() => onSelect(def.type)} style={{
                padding: '14px 14px', borderRadius: 12,
                border: `1px solid ${t.shadow}`, background: t.bg,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.primary; e.currentTarget.style.background = `${t.primary}08` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.shadow; e.currentTarget.style.background = t.bg }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ display: 'flex', color: t.primary }}>
                    {Icon[iconName] ? Icon[iconName](16, t.primary) : Icon.write(16, t.primary)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.heading }}>{def.label}</span>
                </div>
                <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>
                  {def.description}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
