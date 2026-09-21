import { useSite } from '@/contexts/SiteContext'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import { softShadowSm } from '@/components/ui/shadows'
import {
  CHROME_FOOTER_ID,
  LIENS_PIED_DEFAUT,
  hrefLien,
  libelleLien,
  morceauxMarque,
  couleursPied,
  type ChromePresentation,
  type LienChrome,
} from '@/cms/model/sections/site-chrome'
import type { Locale } from '@/cms/model/i18n'

/**
 * Pied de page — global à tout le site (TDR §19).
 * Coordonnées et identité : réglages du restaurant (TDR §16).
 * Liens : navigation CMS si elle existe, sinon les liens des réglages, sinon le gabarit.
 */
export function Footer({
  restaurant,
  locale = 'fr',
  liens: liensProp,
  presentation: presentationProp,
  selectable = false,
}: {
  restaurant: ResolvedRestaurant
  locale?: Locale
  liens?: LienChrome[]
  presentation?: ChromePresentation
  selectable?: boolean
}) {
  const { theme: t } = useSite()

  const presentation = presentationProp ?? {}
  const liens = (liensProp ?? LIENS_PIED_DEFAUT.map((l) => ({ ...l, source: 'settings' as const })))
    .filter((l) => l.visible && !l.isCta)
  const coordonnees = [restaurant.address, restaurant.phone, restaurant.emailContact]
    .filter((valeur) => Boolean(valeur && valeur.trim()))
  const reseaux = [
    restaurant.social.facebook ? { label: 'Facebook', href: restaurant.social.facebook } : null,
    restaurant.social.instagram ? { label: 'Instagram', href: restaurant.social.instagram } : null,
    restaurant.social.whatsapp ? { label: 'WhatsApp', href: restaurant.social.whatsapp } : null,
  ].filter((x): x is { label: string; href: string } => Boolean(x))
  const marque = morceauxMarque(restaurant.name || 'Greatlife')
  const slogan = restaurant.slogan
  const horaires = restaurant.hours
  const couleurs = couleursPied(t, presentation)
  const modele = presentation.footer?.layout ?? 'columns'
  const fond = couleurs.bg
  const texte = couleurs.text
  const accent = couleurs.accent
  const lienCouleur = couleurs.links
  const reseauCouleur = couleurs.social
  const ombre = presentation.footer?.effect === 'shadow' ? softShadowSm(t) : 'none'
  const centre = modele === 'centered'
  const bandeau = modele === 'band'
  const pad = bandeau ? '36px 24px 24px' : '56px 24px 32px'

  const blocMarque = (
    <div {...(selectable ? { 'data-cms-slot': 'brand' } : {})} style={{ textAlign: centre || bandeau ? 'center' : 'left' }}>
      <div style={{ fontFamily: 'var(--font-heading, var(--f-heading))', fontSize: `calc(${bandeau ? 32 : 28}px * var(--font-scale, 1))`, fontWeight: 'var(--font-heading-weight, 700)' as unknown as number, marginBottom: 8, color: texte }}>
        {marque.avant}{marque.accent ? <span style={{ color: accent }}>{marque.accent}</span> : null}
      </div>
      {slogan ? <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, maxWidth: centre || bandeau ? 'none' : 300, margin: centre || bandeau ? '0 auto' : undefined, color: texte }}>{slogan}</p> : null}
    </div>
  )

  const blocLiens = (
    <div {...(selectable ? { 'data-cms-slot': 'nav' } : {})} style={{ textAlign: centre || bandeau ? 'center' : 'left' }}>
      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: texte }}>Navigation</div>
      <div style={{ display: bandeau ? 'flex' : 'block', flexWrap: 'wrap', gap: bandeau ? '8px 20px' : undefined, justifyContent: 'center' }}>
        {liens.map((lien) => (
          <a key={lien.id} href={hrefLien(lien.target, restaurant.phone)} style={{ display: bandeau ? 'inline' : 'block', fontSize: 14, color: lienCouleur, textDecoration: 'none', marginBottom: bandeau ? 0 : 6, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = accent} onMouseLeave={e => e.currentTarget.style.color = lienCouleur}>{libelleLien(lien, locale)}</a>
        ))}
      </div>
    </div>
  )

  const blocContact = (
    <div {...(selectable ? { 'data-cms-slot': 'contact' } : {})} style={{ textAlign: centre || bandeau ? 'center' : 'left' }}>
      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: texte }}>Contact</div>
      <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.8, color: texte }}>
        {coordonnees.map((valeur, i) => (
          <span key={valeur}>
            {i > 0 && <br />}
            {valeur}
          </span>
        ))}
        {horaires ? (
          <>
            {coordonnees.length > 0 && <br />}
            {horaires}
          </>
        ) : null}
      </div>
      {reseaux.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: bandeau ? 'row' : 'column', gap: bandeau ? 16 : 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {reseaux.map((r) => (
            <a key={r.label} href={r.href} style={{ fontSize: 14, color: reseauCouleur, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = accent}
              onMouseLeave={e => e.currentTarget.style.color = reseauCouleur}
            >{r.label}</a>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <footer
      data-cms-id={selectable ? CHROME_FOOTER_ID : undefined}
      style={{
        background: fond, color: texte, padding: pad,
        position: 'relative', overflow: 'hidden',
        boxShadow: ombre,
      }}
    >
      {!bandeau && (
        <svg viewBox="0 0 1200 40" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} preserveAspectRatio="none">
          <path d="M 0 20 Q 600 0 1200 20 L 1200 0 L 0 0 Z" fill={t.bg} />
        </svg>
      )}
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: bandeau ? 0 : 20 }}>
        {centre ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center', marginBottom: 40 }}>
            {blocMarque}
            {blocLiens}
            {blocContact}
          </div>
        ) : bandeau ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', marginBottom: 28 }}>
            {blocMarque}
            {blocLiens}
            {blocContact}
          </div>
        ) : (
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            {blocMarque}
            {blocLiens}
            {blocContact}
          </div>
        )}
        <div style={{ borderTop: '1px solid color-mix(in srgb, currentColor 12%, transparent)', paddingTop: 20, textAlign: centre || bandeau ? 'center' : 'left' }}>
          <div style={{ fontSize: 12, opacity: 0.55, color: texte }}>© {new Date().getFullYear()} {restaurant.name || 'Greatlife'}</div>
        </div>
      </div>
    </footer>
  )
}
