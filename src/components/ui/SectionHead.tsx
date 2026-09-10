import React from 'react'
import { useSite } from '@/contexts/SiteContext'

export function opsz() { return '"opsz" 144' }

export function SectionHead({
  title, sub, align = 'left',
}: {
  title: React.ReactNode
  sub?: string
  align?: 'left' | 'center'
}) {
  const { theme: t } = useSite()
  return (
    <div style={{
      textAlign: align,
      marginBottom: '40px',
      maxWidth: align === 'center' ? 680 : 'none',
      margin: align === 'center' ? '0 auto 40px' : '0 0 40px',
    }}>
      <h2 style={{
        fontFamily: 'var(--f-heading)', color: t.heading,
        fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700,
        lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0,
        fontVariationSettings: opsz(),
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{
          fontSize: '16px', color: t.muted, lineHeight: 1.6,
          marginTop: '12px', maxWidth: 560,
          margin: align === 'center' ? '12px auto 0' : '12px 0 0',
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}
