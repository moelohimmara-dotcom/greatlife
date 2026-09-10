import { useSite } from '@/contexts/SiteContext'

export function Footer() {
  const { theme: t, content } = useSite()
  return (
    <footer style={{
      background: t.primaryDark, color: '#fff', padding: '56px 24px 32px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Organic top curve */}
      <svg viewBox="0 0 1200 40" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} preserveAspectRatio="none">
        <path d="M 0 20 Q 600 0 1200 20 L 1200 0 L 0 0 Z" fill={t.bg} />
      </svg>
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '20px' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
          <div>
            <div style={{ fontFamily: 'var(--f-heading)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Great<span style={{ color: t.gold }}>life</span></div>
            <p style={{ fontSize: '14px', opacity: 0.7, lineHeight: 1.6, maxWidth: '300px' }}>{content.slogan}</p>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation</div>
            {['La carte', 'Histoire', 'Engagements', 'Équipe', 'Blog'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '')}`} style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: '6px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = t.gold} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}>{l}</a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.8 }}>
              Kaloum, Conakry<br />+224 620 00 00 00<br />contact@greatlife.gn
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', fontSize: '12px', opacity: 0.5 }}>
          © 2026 Greatlife — Conakry, Guinée · Site vitrine pilotable · Fast-food bio sans culpabilité
        </div>
      </div>
    </footer>
  )
}
