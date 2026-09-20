import { Link } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import type { ResolvedRestaurant } from '@/cms/repository/settings'

/**
 * Cibles de navigation du pied de page.
 *
 * Les ancres doivent correspondre EXACTEMENT à `page_sections.anchor`. Elles
 * étaient auparavant DÉRIVÉES du libellé (`'La carte'` → `#lacarte`), ce qui
 * cassait deux liens sur cinq :
 *     'La carte' → #lacarte   alors que l'ancre réelle est `carte`
 *     'Équipe'   → #équipe    alors que l'ancre réelle est `equipe` (sans accent)
 * Les trois autres tombaient juste par coïncidence. Une liste écrite en clair
 * ne peut plus se désynchroniser silencieusement du libellé affiché.
 */
const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [
  ['La carte', 'carte'],
  ['Histoire', 'histoire'],
  ['Engagements', 'engagements'],
  ['Équipe', 'equipe'],
  ['Blog', 'blog'],
]

/**
 * Pied de page — global à tout le site (TDR §19).
 *
 * Les coordonnées viennent des réglages du restaurant (TDR §16 : une source
 * unique). Elles étaient auparavant RECOPIÉES en dur ici — « Kaloum, Conakry »
 * et « +224 620 00 00 00 » — alors que la source canonique porte « Conakry,
 * Guinée » et « +224 000 00 00 00 » : le pied de page affichait donc un numéro
 * de téléphone que personne ne pouvait corriger depuis l'administration.
 *
 * Une ligne vide n'est pas rendue plutôt que remplacée par une valeur inventée :
 * un repli codé en dur serait le défaut d'origine, déguisé.
 */
export function Footer({ restaurant }: { restaurant: ResolvedRestaurant }) {
  const { theme: t, content } = useSite()
  const coordonnees = [restaurant.address, restaurant.phone, restaurant.emailContact]
    .filter((valeur) => Boolean(valeur && valeur.trim()))

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
            {NAV_LINKS.map(([label, ancre]) => (
              <a key={ancre} href={`#${ancre}`} style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: '6px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = t.gold} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}>{label}</a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</div>
            <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.8 }}>
              {coordonnees.map((valeur, i) => (
                <span key={valeur}>
                  {i > 0 && <br />}
                  {valeur}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', opacity: 0.5 }}>© 2026 Greatlife · Site vitrine pilotable · Fast-food bio sans culpabilité</div>
          <Link to="/login" style={{ fontSize: '12px', opacity: 0.4, color: '#fff', textDecoration: 'none', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
            Espace admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
