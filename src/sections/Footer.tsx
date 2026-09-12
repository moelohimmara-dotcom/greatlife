import { Link } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'

export function Footer() {
  const { theme: t, content } = useSite()
  const navLinks: [string, string][] = [
    ['La carte', 'carte'],
    ['Histoire', 'histoire'],
    ['Engagements', 'engagements'],
    ['Équipe', 'equipe'],
    ['Blog', 'blog'],
    ['Réserver', 'reservation'],
    ['Contact', 'contact'],
  ]
  const socialLinks: [string, string, (s: number, c: string) => React.ReactElement][] = [
    ['Instagram', 'https://instagram.com', Icon.instagram],
    ['Facebook', 'https://facebook.com', Icon.facebook],
    ['WhatsApp', 'https://wa.me/224620000000', Icon.whatsapp],
  ]
  return (
    <footer style={{
      background: t.primaryDark, color: '#fff', padding: '56px 24px 32px',
      position: 'relative', overflow: 'hidden',
    }}>
      <svg viewBox="0 0 1200 40" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} preserveAspectRatio="none">
        <path d="M 0 20 Q 600 0 1200 20 L 1200 0 L 0 0 Z" fill={t.bg} />
      </svg>
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '20px' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', marginBottom: '36px' }}>
          <div>
            <div style={{ fontFamily: 'var(--f-heading)', fontSize: '28px', fontWeight: 700, marginBottom: '10px' }}>Great<span style={{ color: t.gold }}>life</span></div>
            <p style={{ fontSize: '14px', opacity: 0.7, lineHeight: 1.6, maxWidth: '300px', margin: '0 0 18px' }}>{content.slogan}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {socialLinks.map(([label, href, ic]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.2s, transform 0.2s', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.gold; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none' }}>
                  {ic(18, '#fff')}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation</div>
            {navLinks.map(([l, id]) => (
              <a key={l} href={`#${id}`} style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: '7px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = t.gold} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}>{l}</a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horaires</div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.8 }}>
              Lun–Dim<br />7h00 – 23h00<br /><span style={{ fontSize: '13px', opacity: 0.7 }}>Service continu</span>
            </div>
            <a href="#reservation" className="gbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#fff', background: t.gold, padding: '9px 16px', textDecoration: 'none', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {Icon.calendar(14, '#fff')} Réserver
            </a>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.8 }}>
              Kaloum, Conakry<br />+224 620 00 00 00<br />contact@greatlife.gn
            </div>
            <a href="#contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: '14px', fontSize: '13px', fontWeight: 700, color: t.gold, padding: '9px 0', textDecoration: 'none', borderBottom: `1px solid ${t.gold}55`, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {Icon.mail(14, t.gold)} Écrire au restaurant
            </a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', opacity: 0.5 }}>© 2026 Greatlife — Conakry, Guinée · Site vitrine pilotable · Fast-food bio sans culpabilité</div>
          <Link to="/login" style={{ fontSize: '12px', opacity: 0.4, color: '#fff', textDecoration: 'none', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
            Espace admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
