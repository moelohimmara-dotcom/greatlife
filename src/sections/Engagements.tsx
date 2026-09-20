import type { ReactNode } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon, iconByName } from '@/lib/icons'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText, pick } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'

interface EngagementItem {
  icon?: string
  title?: string
  desc?: string
}

const DISPOSITIONS = ['grid', 'list'] as const

export function Engagements({ content: cms, variant }: Partial<SectionComponentProps> = {}) {
  const { theme: t, content: legacy } = useSite()
  const iconColor = (i: number) => [t.primary, t.accent, t.gold][i % 3]

  // Bloc piloté par le CMS si un contenu est fourni, sinon données historiques.
  const source: EngagementItem[] = pick(cmsList<EngagementItem>(cms, 'items'), legacy.engagements)
  const items: [ReactNode, string, string][] = source.map((e, i) => {
    // `iconByName` garde contre `__proto__` / `constructor` / `valueOf`, qui
    // remonteraient la chaîne de prototypes et feraient planter le rendu.
    const render = iconByName(e.icon) ?? Icon.leaf
    return [render(28, iconColor(i)), e.title ?? '', e.desc ?? '']
  })

  const title = pick(cmsText(cms, 'title'), 'Ce qui nous distingue')
  const sub = pick(cmsText(cms, 'subtitle'), 'Six engagements concrets qui font de Greatlife un fast-food à part.')
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'grid')

  if (disposition === 'list') {
    return (
      <section className="section-pad" data-disposition="list" style={{ padding: '100px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <Reveal><SectionHead title={title} sub={sub} align="center" /></Reveal>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(([ic, itemTitle, desc], i) => (
            <Reveal key={i} delay={(i % 3) * 0.06}>
              <div style={{
                display: 'flex', gap: '18px', alignItems: 'flex-start',
                padding: '22px 0',
                borderBottom: i === items.length - 1 ? 'none' : `1px solid ${t.shadow}`,
              }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${t.primary}0d`, flexShrink: 0 }}>
                  {ic}
                </div>
                <div>
                  <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{itemTitle}</h4>
                  <p style={{ fontSize: '14px', color: t.muted, lineHeight: 1.55, margin: 0 }}>{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="section-pad" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Reveal><SectionHead title={title} sub={sub} align="center" /></Reveal>
      <div className="engagements-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '20px' }}>
        {items.map(([ic, itemTitle, desc], i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <OrganicCard hover style={{ padding: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${t.primary}0d`, marginBottom: '18px' }}>
                {ic}
              </div>
              <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{itemTitle}</h4>
              <p style={{ fontSize: '14px', color: t.muted, lineHeight: 1.55, margin: 0 }}>{desc}</p>
            </OrganicCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
