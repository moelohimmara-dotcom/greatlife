import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { softShadow } from '@/components/ui/shadows'
import { Icon } from '@/lib/icons'

export function Localisation() {
  const { theme: t, isDark } = useSite()
  return (
    <section id="loca" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Reveal>
        <SectionHead title="Nous trouver" sub="Kaloum, Conakry — au cœur de la ville." />
        <div className="loca-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <OrganicCard style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                [Icon.pin(20, t.primary), 'Kaloum, Conakry — Guinée', 'Face au Jardin du 2 Octobre'],
                [Icon.clock(20, t.accent), 'Lun–Dim · 7h00 – 23h00', 'Service continu toute la journée'],
                [Icon.phone(20, t.gold), '+224 620 00 00 00', 'Appel & WhatsApp'],
                [Icon.mail(20, t.primary), 'contact@greatlife.gn', 'Réservations & commandes'],
              ].map(([ic, title, sub], i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${t.primary}0a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ic}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: t.heading, fontSize: '15px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: t.muted, marginTop: '2px' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </OrganicCard>
          <div style={{
            borderRadius: '20px', overflow: 'hidden', boxShadow: softShadow(t),
            background: t.surfaceAlt, position: 'relative', minHeight: '300px', border: `1px solid ${t.shadow}`,
          }}>
            <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect x="0" y="0" width="400" height="300" fill={isDark ? '#1a2a3a' : '#E8F0F5'} />
              {[0,1,2,3,4].map(i => (
                <path key={i} d={`M ${i*100} ${250+i*10} Q ${i*100+50} ${245+i*10} ${i*100+100} ${250+i*10}`} stroke={isDark ? '#2a3a4a' : '#D0E0EA'} strokeWidth="1" fill="none" opacity="0.5" />
              ))}
              <path d="M 80 40 Q 60 60 55 100 Q 50 140 70 180 Q 90 220 140 240 Q 200 255 260 240 Q 320 225 350 180 Q 370 140 360 90 Q 340 50 280 40 Q 200 30 80 40 Z" fill={isDark ? '#2a3528' : '#F0EBE0'} stroke={isDark ? '#3a4538' : '#D5CFC0'} strokeWidth="1.5" />
              {[150,200,250].map((x,i) => [120,170,200].map((y,j) => (
                <circle key={`${i}-${j}`} cx={x} cy={y} r="1.5" fill={isDark ? '#3a4538' : '#D5CFC0'} opacity="0.3" />
              )))}
              <path d="M 90 80 Q 200 70 330 100" stroke={isDark ? '#4a5a48' : '#C4B89E'} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
              <path d="M 100 180 Q 200 170 320 180" stroke={isDark ? '#4a5a48' : '#C4B89E'} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
              <path d="M 180 50 L 190 230" stroke={isDark ? '#4a5a48' : '#C4B89E'} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />
              <path d="M 260 50 L 270 240" stroke={isDark ? '#4a5a48' : '#C4B89E'} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />
              <ellipse cx="120" cy="160" rx="25" ry="18" fill={isDark ? '#2a4a28' : '#D0E8C8'} opacity="0.6" />
              <text x="120" y="163" textAnchor="middle" fontSize="7" fill={isDark ? '#6a8a68' : '#7A9A6A'} fontWeight="600">Jardin</text>
              <text x="30" y="270" fontSize="8" fill={isDark ? '#5a7a8a' : '#9AB0BA'} fontWeight="500" fontStyle="italic">Atlantique</text>
              <text x="200" y="25" textAnchor="middle" fontSize="10" fill={isDark ? '#8a9a88' : '#9A9080'} fontWeight="700" letterSpacing="2">KALOUM</text>
              <g>
                <circle cx="210" cy="130" r="18" fill={t.accent} opacity="0.15">
                  <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="210" cy="130" r="10" fill={t.accent} opacity="0.2" />
                <path d="M 210 120 C 205 120 201 124 201 129 C 201 135 210 142 210 142 C 210 142 219 135 219 129 C 219 124 215 120 210 120 Z" fill={t.accent} stroke="#fff" strokeWidth="1.5" />
                <circle cx="210" cy="129" r="3" fill="#fff" />
              </g>
              <g>
                <rect x="225" y="118" width="60" height="16" rx="8" fill={t.surface} stroke={t.shadow} strokeWidth="0.5" />
                <text x="255" y="129" textAnchor="middle" fontSize="8" fill={t.heading} fontWeight="700">Greatlife</text>
              </g>
              <g transform="translate(350,40)">
                <circle r="14" fill={isDark ? '#252B25' : '#fff'} stroke={isDark ? '#3a4538' : '#D5CFC0'} strokeWidth="1" opacity="0.8" />
                <path d="M 0 -10 L 3 0 L 0 10 L -3 0 Z" fill={t.accent} />
                <text x="0" y="-16" textAnchor="middle" fontSize="6" fill={isDark ? '#8a9a88' : '#9A9080'} fontWeight="700">N</text>
              </g>
            </svg>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
