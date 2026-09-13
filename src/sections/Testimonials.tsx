import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'

export function Testimonials() {
  const { theme: t, content } = useSite()
  if (content.testimonials.length === 0) return null
  return (
    <section id="temoignages" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <Reveal>
        <SectionHead title="Ils ont goûté Greatlife" sub="Ce que disent nos clients." align="center" />
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '20px', marginTop: '8px' }}>
        {content.testimonials.map((tm, i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <OrganicCard hover style={{ padding: '28px' }}>
              <div style={{ fontSize: 28, lineHeight: 1, color: t.accent, marginBottom: 12, fontFamily: 'var(--f-heading)' }}>“</div>
              <p style={{ fontSize: '14.5px', color: t.text, lineHeight: 1.6, margin: 0 }}>{tm.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${t.primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: t.primary }}>{tm.author.charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.heading }}>{tm.author}</span>
              </div>
            </OrganicCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
