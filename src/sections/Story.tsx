import { useSite, useMedia } from '@/contexts/SiteContext'
import { softShadow } from '@/components/ui/shadows'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'

export function Story() {
  const { theme: t, content } = useSite()
  const storyImg = useMedia('histoire')
  return (
    <section id="histoire" className="section-pad" style={{ padding: '100px 24px', background: t.surfaceAlt }}>
      <div className="story-grid" style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '60px', alignItems: 'center' }}>
        <Reveal>
          <div style={{
            aspectRatio: '3/4', borderRadius: '24px',
            background: storyImg
              ? `url(${storyImg}) center/cover`
              : `linear-gradient(160deg, ${t.primary}, ${t.primaryDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', boxShadow: softShadow(t),
          }}>
            {!storyImg && (
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ opacity: 0.15 }} aria-hidden="true">
                <path d="M60 20c-15 10-25 25-25 40 0 12 8 20 20 20 15 0 25-12 25-28 0-15-10-28-20-32Z" fill="#fff" stroke="#fff" strokeWidth="1" />
                <path d="M40 80c8-15 18-22 35-28" stroke="#fff" strokeWidth="1.5" fill="none" />
              </svg>
            )}
            <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Le fondateur</div>
              <div style={{ fontFamily: 'var(--f-heading)', fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>Mister Marcket</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHead title={content.storyTitle} />
          <p style={{ fontSize: '17px', lineHeight: 1.75, color: t.text, margin: 0 }}>{content.story}</p>
          <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              ['Bio accessible', Icon.coin(16, t.accent)],
              ['Circuit court', Icon.leaf(16, t.primary)],
              ['Transparence totale', Icon.search(16, t.gold)],
            ].map(([label, ic], i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.surface, padding: '8px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: t.text, border: `1px solid ${t.shadow}` }}>
                {ic} {label}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
