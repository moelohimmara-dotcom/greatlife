import type { ReactNode } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'

export function Engagements() {
  const { theme: t, content } = useSite()
  const iconColor = (i: number) => [t.primary, t.accent, t.gold][i % 3]
  const items: [ReactNode, string, string][] = content.engagements.map((e, i) =>
    [Icon[e.icon] ? (Icon[e.icon] as (s: number, c: string) => ReactNode)(28, iconColor(i)) : Icon.leaf(28, iconColor(i)), e.title, e.desc]
  )
  return (
    <section id="engagements" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Reveal><SectionHead title="Ce qui nous distingue" sub="Six engagements concrets qui font de Greatlife un fast-food à part." align="center" /></Reveal>
      <div className="engagements-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '20px' }}>
        {items.map(([ic, title, desc], i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <OrganicCard hover style={{ padding: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${t.primary}0d`, marginBottom: '18px' }}>
                {ic}
              </div>
              <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h4>
              <p style={{ fontSize: '14px', color: t.muted, lineHeight: 1.55, margin: 0 }}>{desc}</p>
            </OrganicCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
