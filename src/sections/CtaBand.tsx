import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/lib/icons'
import type { SectionComponentProps } from '@/cms/renderer'
import { anchorHref, cmsGroup, cmsText } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { cmsSlotAttrs } from '@/cms/model/subblocks'

const DISPOSITIONS = ['banner', 'card'] as const

export function CtaBand({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t } = useSite()
  const title = cmsText(cms, 'title')
  const body = cmsText(cms, 'body')
  const cta = cmsGroup(cms, 'primaryCta')
  const label = typeof cta?.label === 'string' ? cta.label.trim() : ''
  const target = typeof cta?.target === 'string' ? cta.target.trim() : ''
  const href = target ? anchorHref(target) : ''

  if (!title && !body && !label) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          Appel à l’action vide : ajoutez un titre ou un bouton dans Modifier.
        </p>
      </section>
    )
  }

  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'banner')
  const bouton = label && href ? (
    <a
      href={href}
      {...cmsSlotAttrs(preview, 'primaryCta')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: disposition === 'banner' ? '#FFFFFF' : t.primary,
        color: disposition === 'banner' ? t.primary : '#FFFFFF',
        fontWeight: 600,
        padding: '16px 24px',
        borderRadius: 100,
        fontSize: 16,
        textDecoration: 'none',
        minHeight: 48,
        touchAction: 'manipulation',
        boxShadow: disposition === 'card' ? `0 4px 16px ${t.shadowDeep}` : undefined,
      }}
    >
      {label} {Icon.arrow(16, disposition === 'banner' ? t.primary : '#FFFFFF')}
    </a>
  ) : null

  if (disposition === 'card') {
    return (
      <section className="section-pad" data-disposition="card" style={{ padding: '80px 24px', maxWidth: 720, margin: '0 auto' }}>
        <Reveal>
          <div
            style={{
              padding: '40px 32px',
              borderRadius: 24,
              background: t.surface,
              border: `1px solid ${t.shadow}`,
              textAlign: 'center',
            }}
          >
            {title ? (
              <InlineHtml
                as="h2"
                html={title}
                {...cmsSlotAttrs(preview, 'title')}
                style={{
                  fontFamily: 'var(--font-heading, var(--f-heading))',
                  fontSize: 'clamp(26px, 3.5vw, 34px)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: t.heading,
                  margin: '0 0 12px',
                }}
              />
            ) : null}
            {body ? (
              <InlineHtml
                as="p"
                html={body}
                {...cmsSlotAttrs(preview, 'body')}
                style={{ fontSize: 16, lineHeight: 1.65, color: t.muted, margin: '0 0 24px' }}
              />
            ) : null}
            {bouton}
          </div>
        </Reveal>
      </section>
    )
  }

  return (
    <section
      className="section-pad"
      data-disposition="banner"
      style={{
        padding: '64px 24px',
        background: `linear-gradient(135deg, ${t.primary}, ${t.primaryDark ?? t.primary})`,
        color: '#FFFFFF',
      }}
    >
      <Reveal>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 28,
          }}
        >
          <div style={{ flex: '1 1 280px', maxWidth: 640 }}>
            {title ? (
              <InlineHtml
                as="h2"
                html={title}
                {...cmsSlotAttrs(preview, 'title')}
                style={{
                  fontFamily: 'var(--font-heading, var(--f-heading))',
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  margin: '0 0 8px',
                  color: '#FFFFFF',
                }}
              />
            ) : null}
            {body ? (
              <InlineHtml
                as="p"
                html={body}
                {...cmsSlotAttrs(preview, 'body')}
                style={{ fontSize: 16, lineHeight: 1.6, margin: 0, opacity: 0.92 }}
              />
            ) : null}
          </div>
          {bouton}
        </div>
      </Reveal>
    </section>
  )
}
