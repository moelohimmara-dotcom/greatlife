import { useId, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { traduire } from '@/i18n/ui'

const tr = traduire()

interface FaqItem {
  question?: string
  answer?: string
}

const DISPOSITIONS = ['accordion', 'list'] as const

function FaqAccordionItem({
  item,
  index,
  open,
  onToggle,
}: {
  item: FaqItem
  index: number
  open: boolean
  onToggle: () => void
}) {
  const { theme: t } = useSite()
  const panelId = useId()
  const q = (item.question ?? '').trim()
  const a = (item.answer ?? '').trim()
  if (!q && !a) return null

  return (
    <Reveal delay={(index % 4) * 0.04}>
      <div
        style={{
          borderBottom: `1px solid ${t.shadow}`,
          padding: '4px 0',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit' }}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '16px 4px',
              minHeight: 48,
              fontFamily: 'var(--font-heading, var(--f-heading))',
              fontSize: 18,
              fontWeight: 700,
              color: t.heading,
              letterSpacing: '-0.02em',
              touchAction: 'manipulation',
            }}
          >
            <span>{q || tr('faq.fallbackQuestion')}</span>
            <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1, color: t.primary, flexShrink: 0 }}>
              {open ? '−' : '+'}
            </span>
          </button>
        </h3>
        <div
          id={panelId}
          role="region"
          hidden={!open}
          style={{ padding: open ? '0 4px 16px' : 0 }}
        >
          {open && a ? (
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: t.text }}>
              <InlineHtml as="span" html={a} />
            </p>
          ) : null}
        </div>
      </div>
    </Reveal>
  )
}

export function Faq({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t } = useSite()
  const items = (cmsList<FaqItem>(cms, 'items') ?? []).filter(
    (it) => (it.question ?? '').trim() !== '' || (it.answer ?? '').trim() !== '',
  )
  if (items.length === 0) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '64px 24px', maxWidth: 800, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          {tr('faq.empty')}
        </p>
      </section>
    )
  }

  const title = cmsText(cms, 'title') ?? tr('faq.title')
  const sub = cmsText(cms, 'subtitle')
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'accordion')
  const [ouvert, setOuvert] = useState<number | null>(0)

  if (disposition === 'list') {
    return (
      <section className="section-pad" data-disposition="list" style={{ padding: '96px 24px', maxWidth: 800, margin: '0 auto' }}>
        <Reveal>
          <SectionHead title={title} sub={sub} align="center" preview={preview} />
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {items.map((it, i) => (
            <Reveal key={i} delay={(i % 4) * 0.04}>
              <article>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontFamily: 'var(--font-heading, var(--f-heading))',
                    fontSize: 18,
                    fontWeight: 700,
                    color: t.heading,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {it.question}
                </h3>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: t.text }}>
                  <InlineHtml as="span" html={it.answer ?? ''} />
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="section-pad" data-disposition="accordion" style={{ padding: '96px 24px', maxWidth: 800, margin: '0 auto' }}>
      <Reveal>
        <SectionHead title={title} sub={sub} align="center" preview={preview} />
      </Reveal>
      <div>
        {items.map((it, i) => (
          <FaqAccordionItem
            key={i}
            item={it}
            index={i}
            open={ouvert === i}
            onToggle={() => setOuvert((cur) => (cur === i ? null : i))}
          />
        ))}
      </div>
    </section>
  )
}
