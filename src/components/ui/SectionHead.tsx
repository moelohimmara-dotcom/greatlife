import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { cmsSlotAttrs } from '@/cms/model/subblocks'

export function opsz() { return '"opsz" 144' }

export function SectionHead({
  title, sub, align = 'left', preview,
}: {
  title: React.ReactNode
  sub?: string
  align?: 'left' | 'center'
  /** Aperçu éditeur seulement : rend les titres cliquables par emplacement. */
  preview?: boolean
}) {
  const { theme: t } = useSite()
  const h2style: React.CSSProperties = {
    fontFamily: 'var(--font-heading, var(--f-heading))', color: t.heading,
    fontSize: 'calc(clamp(28px, 4vw, 42px) * var(--font-scale, 1))',
    fontWeight: 'var(--font-heading-weight, 700)' as unknown as number,
    lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0,
    fontVariationSettings: opsz(),
  }
  const titre = typeof title === 'string'
    ? <InlineHtml as="h2" html={title} style={h2style} {...cmsSlotAttrs(preview, 'title')} />
    : (
      <h2 style={h2style} {...cmsSlotAttrs(preview, 'title')}>
        {title}
      </h2>
    )
  return (
    <div style={{
      textAlign: align,
      marginBottom: '40px',
      maxWidth: align === 'center' ? 680 : 'none',
      margin: align === 'center' ? '0 auto 40px' : '0 0 40px',
    }}>
      {titre}
      {sub && (
        <InlineHtml
          as="p"
          html={sub}
          {...cmsSlotAttrs(preview, 'subtitle')}
          style={{
            fontSize: 'calc(16px * var(--font-scale, 1))', color: t.muted, lineHeight: 1.6,
            marginTop: '12px', maxWidth: 560,
            margin: align === 'center' ? '12px auto 0' : '12px 0 0',
          }}
        />
      )}
    </div>
  )
}
