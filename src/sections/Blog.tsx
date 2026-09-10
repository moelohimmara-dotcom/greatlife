import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'

export function Blog() {
  const { theme: t } = useSite()
  const posts: [string, string, string][] = [
    ['Pourquoi le corossol mérite sa place dans votre assiette', 'Découverte d\'un superfruit guinéen aux vertus digestives reconnues.', 'corossol'],
    ['5 façons de rendre le fast-food sain (sans le rendre triste)', 'Notre approche pour réconcilier gourmandise et santé.', 'sain'],
    ['Circuit court en Guinée : rencontre avec nos producteurs', 'Derrière chaque burger, des femmes et des hommes de la Fouta-Djallon.', 'producteurs'],
  ]
  return (
    <section id="blog" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Reveal><SectionHead title="Le journal Greatlife" sub="Recettes, coulisses et rencontres avec nos producteurs." align="center" /></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: '24px' }}>
        {posts.map(([title, desc, illus], i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <OrganicCard hover style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ height: '160px', background: `linear-gradient(135deg, ${t.primary}18, ${t.gold}12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {illus === 'corossol' && (
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                    <ellipse cx="40" cy="42" rx="28" ry="32" fill={t.primary} opacity="0.15" />
                    <path d="M 40 14 C 24 14 16 28 16 42 C 16 58 28 68 40 68 C 52 68 64 58 64 42 C 64 28 56 14 40 14 Z" fill={t.gold} opacity="0.25" stroke={t.heading} strokeWidth="1.5" />
                    {[0,45,90,135,180,225,270,315].map(a => {
                      const rad = a * Math.PI / 180
                      return <line key={a} x1={40 + 28*Math.cos(rad)} y1={42 + 30*Math.sin(rad)} x2={40 + 36*Math.cos(rad)} y2={42 + 38*Math.sin(rad)} stroke={t.heading} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    })}
                    <path d="M 40 14 L 38 6 L 42 6 Z" fill={t.primary} opacity="0.6" />
                    <path d="M 38 6 Q 34 2 30 4" stroke={t.primary} strokeWidth="1.5" fill="none" opacity="0.4" />
                    <path d="M 40 6 Q 48 2 52 8 Q 48 10 42 8" fill={t.primary} opacity="0.3" />
                  </svg>
                )}
                {illus === 'sain' && (
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                    <path d="M 50 16 C 44 14 38 18 36 26 C 34 34 40 40 48 38 C 54 36 56 28 50 16 Z" fill={t.primary} opacity="0.25" stroke={t.heading} strokeWidth="1.5" />
                    <path d="M 38 28 Q 44 30 48 34" stroke={t.heading} strokeWidth="1" opacity="0.3" />
                    <path d="M 18 30 Q 18 22 40 22 Q 62 22 62 30 Z" fill={t.gold} opacity="0.35" stroke={t.heading} strokeWidth="1.5" />
                    <ellipse cx="28" cy="26" rx="1.5" ry="1" fill={t.heading} opacity="0.3" />
                    <ellipse cx="40" cy="25" rx="1.5" ry="1" fill={t.heading} opacity="0.3" />
                    <ellipse cx="52" cy="26" rx="1.5" ry="1" fill={t.heading} opacity="0.3" />
                    <line x1="18" y1="34" x2="62" y2="34" stroke={t.heading} strokeWidth="1.5" opacity="0.4" />
                    <rect x="20" y="36" width="40" height="8" rx="3" fill={t.accent} opacity="0.2" stroke={t.heading} strokeWidth="1.5" />
                    <line x1="18" y1="46" x2="62" y2="46" stroke={t.heading} strokeWidth="1.5" opacity="0.3" />
                    <path d="M 18 48 Q 18 60 40 60 Q 62 60 62 48 Z" fill={t.gold} opacity="0.25" stroke={t.heading} strokeWidth="1.5" />
                    <path d="M 34 18 Q 36 14 40 16 Q 38 20 34 18" fill={t.primary} opacity="0.4" />
                  </svg>
                )}
                {illus === 'producteurs' && (
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                    <circle cx="58" cy="22" r="8" fill={t.gold} opacity="0.3" />
                    {[0,45,90,135,180,225,270,315].map(a => {
                      const rad = a * Math.PI / 180
                      return <line key={a} x1={58+10*Math.cos(rad)} y1={22+10*Math.sin(rad)} x2={58+14*Math.cos(rad)} y2={22+14*Math.sin(rad)} stroke={t.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                    })}
                    <path d="M 8 52 Q 24 38 40 50 Q 56 40 72 50 L 72 70 L 8 70 Z" fill={t.primary} opacity="0.2" stroke={t.heading} strokeWidth="1.5" />
                    <path d="M 8 58 Q 24 48 40 56 Q 56 50 72 56 L 72 70 L 8 70 Z" fill={t.primary} opacity="0.3" />
                    {[16,24,32,44,52,60].map((x,i) => (
                      <g key={i}>
                        <line x1={x} y1={56-(i%2)*2} x2={x} y2={50-(i%2)*2} stroke={t.heading} strokeWidth="1" opacity="0.4" />
                        <circle cx={x} cy={48-(i%2)*2} r="2" fill={t.accent} opacity="0.3" />
                      </g>
                    ))}
                    <line x1="8" y1="70" x2="72" y2="70" stroke={t.heading} strokeWidth="1" opacity="0.2" />
                  </svg>
                )}
              </div>
              <div style={{ padding: '20px 22px' }}>
                <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '17px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h4>
                <p style={{ fontSize: '13.5px', color: t.muted, lineHeight: 1.55, margin: 0 }}>{desc}</p>
                <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 600, color: t.primary }}>Lire {Icon.arrow(14, t.primary)}</div>
              </div>
            </OrganicCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
