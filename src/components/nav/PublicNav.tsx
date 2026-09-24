import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { softShadowSm } from '@/components/ui/shadows'
import { Icon } from '@/lib/icons'
import { resolveI18n } from '@/cms/model/i18n'
import {
  CHROME_HEADER_ID,
  LIENS_ENTETE_DEFAUT,
  collantEffectif,
  couleursAnnonce,
  couleursEntete,
  enteteStructurel,
  hauteurLogoPx,
  hrefAnnonce,
  hrefLien,
  libelleLien,
  morceauxMarque,
  overlayEffectif,
  schemeEntete,
  tailleNomLogoPx,
  type ChromePresentation,
  type LienChrome,
} from '@/cms/model/sections/site-chrome'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import type { Locale } from '@/cms/model/i18n'
import { coalesceAlt, findMediaByUrl, resolveMediaAlt } from '@/lib/mediaAlt'

export interface PublicNavProps {
  overlay?: boolean
  locale?: Locale
  restaurant?: ResolvedRestaurant
  liens?: LienChrome[]
  presentation?: ChromePresentation
  /** Identifiant pour l’aperçu : clic = ouvrir l’inspecteur En-tête. */
  selectable?: boolean
}

function liensParDefaut(): LienChrome[] {
  return LIENS_ENTETE_DEFAUT.map((l) => ({ ...l, source: 'settings' as const }))
}

export function PublicNav({
  overlay = false,
  locale = 'fr',
  restaurant: restaurantProp,
  liens: liensProp,
  presentation: presentationProp,
  selectable = false,
}: PublicNavProps) {
  const { theme: t, media } = useSite()
  const [vueApercu, setVueApercu] = useState<Window | null>(null)
  const attacherVue = useCallback((el: HTMLElement | null) => {
    setVueApercu(el?.ownerDocument.defaultView ?? null)
  }, [])
  const isMobile = useIsMobile(vueApercu)
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoCasse, setLogoCasse] = useState(false)

  useEffect(() => {
    const win = vueApercu ?? window
    const onScroll = () => setScrolled(win.scrollY > 20)
    onScroll()
    win.addEventListener('scroll', onScroll, { passive: true })
    return () => win.removeEventListener('scroll', onScroll)
  }, [vueApercu])

  const restaurant = restaurantProp
  const presentation = presentationProp ?? {}
  const logoUrl = presentation.header?.logoUrl?.trim() ?? ''
  useEffect(() => { setLogoCasse(false) }, [logoUrl])
  const tousLiens = (liensProp ?? liensParDefaut()).filter((l) => l.visible)
  const liensMenu = tousLiens.filter((l) => !l.isCta)
  const cta = tousLiens.find((l) => l.isCta)
  const linkIds = liensMenu.map((l) => l.target.replace(/^#/, '')).filter((id) => id && id !== 'phone' && !id.startsWith('tel') && !id.startsWith('http'))
  const active = useScrollSpy(linkIds)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const overHero = overlayEffectif(presentation, overlay)
  const collant = collantEffectif(presentation)
  const modele = presentation.header?.layout ?? 'logoLeft'
  const effet = presentation.header?.effect
  const scheme = schemeEntete(t, presentation)
  const couleurs = couleursEntete(t, presentation)
  const headerChoisi = enteteStructurel(presentation)
  const surBanniere = overHero && !scrolled
  const couleurLogo = surBanniere ? t.headingInvert : (presentation.header?.text ? couleurs.text : (headerChoisi ? scheme.text : t.heading))
  const couleurLien = surBanniere ? t.headingInvert : (presentation.header?.text ? couleurs.text : (headerChoisi ? scheme.text : t.text))
  const couleurAccent = surBanniere ? t.headingInvert : (presentation.header?.accent ? couleurs.accent : (headerChoisi ? scheme.accent : t.accent))
  const marque = morceauxMarque(restaurant?.name ?? 'Greatlife')
  const libelleCta = cta ? libelleLien(cta, locale) : 'Réserver'
  const hrefCta = cta ? hrefLien(cta.target, restaurant?.phone) : '#contact'

  const position: 'fixed' | 'sticky' | 'absolute' | 'relative' = overHero
    ? (collant ? 'fixed' : 'absolute')
    : (collant ? 'sticky' : 'relative')

  let fond = 'transparent'
  let flou = 'none'
  let bord = '1px solid transparent'
  let ombre = 'none'
  if (headerChoisi || presentation.header?.bg) {
    const flouActif = effet === 'blur' || effet === undefined
    const ombreActif = effet === 'shadow'
    if (surBanniere) {
      fond = flouActif ? 'rgba(0,0,0,0.2)' : 'transparent'
      flou = flouActif ? 'blur(12px)' : 'none'
      ombre = ombreActif ? softShadowSm(t) : 'none'
    } else {
      fond = presentation.header?.bg ? couleurs.bg : (headerChoisi ? scheme.bg : t.surface)
      flou = flouActif ? 'blur(12px)' : 'none'
      bord = `1px solid ${t.shadow}`
      ombre = ombreActif ? softShadowSm(t) : 'none'
    }
  } else {
    fond = scrolled ? t.surface : 'transparent'
    flou = scrolled ? 'blur(12px)' : 'none'
    bord = scrolled ? `1px solid ${t.shadow}` : '1px solid transparent'
  }

  const compact = modele === 'compact'
  const centre = modele === 'logoCenter'
  const pad = compact ? '8px 20px' : '16px 24px'
  const tailleLogo = tailleNomLogoPx(presentation.header?.logoSize, compact)
  const nomRestaurant = restaurant?.name?.trim() || `${marque.avant}${marque.accent ?? ''}`
  const hauteurImg = hauteurLogoPx(presentation.header?.logoSize, compact)
  const logoAlt = coalesceAlt(
    resolveMediaAlt(findMediaByUrl(media, logoUrl)),
    nomRestaurant,
  ) || nomRestaurant

  const logoTexte = (
    <a href="#home" aria-label={`${nomRestaurant} — accueil`} {...(selectable ? { 'data-cms-slot': 'brand' } : {})} style={{ fontFamily: 'var(--font-heading, var(--f-heading))', fontWeight: 'var(--font-heading-weight, 700)' as unknown as number, fontSize: `calc(${tailleLogo}px * var(--font-scale, 1))`, color: couleurLogo, textDecoration: 'none', letterSpacing: '-0.02em' }}>
      {marque.avant}{marque.accent ? <span style={{ color: surBanniere ? t.accentSoft : couleurAccent }}>{marque.accent}</span> : null}
    </a>
  )

  const logo = logoUrl && !logoCasse ? (
    <a href="#home" aria-label={`${nomRestaurant} — accueil`} {...(selectable ? { 'data-cms-slot': 'brand' } : {})} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
      <img
        src={logoUrl}
        alt={logoAlt}
        onError={() => setLogoCasse(true)}
        style={{ height: hauteurImg, width: 'auto', maxWidth: compact ? 140 : 220, objectFit: 'contain', display: 'block' }}
      />
    </a>
  ) : logoTexte

  const menuDesktop = (
    <nav className="desktop-nav" aria-label="Navigation principale" {...(selectable ? { 'data-cms-slot': 'nav' } : {})} style={{ display: centre && !isMobile ? 'flex' : 'flex', gap: compact ? 18 : 28, alignItems: 'center', justifyContent: centre ? 'center' : undefined, flexWrap: 'wrap' }}>
      {liensMenu.map((lien) => {
        const id = lien.target.replace(/^#/, '')
        const libelle = libelleLien(lien, locale)
        return (
        <a key={lien.id} href={hrefLien(lien.target, restaurant?.phone)} aria-current={active === id ? 'true' : undefined}
          style={{
            fontSize: compact ? 13 : 14, fontWeight: 500,
            fontFamily: 'var(--font-body, var(--f-body))',
            color: active === id ? couleurAccent : couleurLien,
            textDecoration: active === id ? 'underline' : 'none',
            textUnderlineOffset: '4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = couleurAccent}
          onMouseLeave={e => e.currentTarget.style.color = active === id ? couleurAccent : couleurLien}>{libelle}</a>
        )
      })}
    </nav>
  )

  return (
    <header
      ref={attacherVue}
      data-cms-id={selectable ? CHROME_HEADER_ID : undefined}
      style={{
        /* Ouvert : au-dessus du contenu (cartes/transform) ; fermé : sous les FAB. */
        position, top: 0, zIndex: drawerOpen ? 200 : 50, width: '100%',
        background: fond,
        backdropFilter: flou,
        borderBottom: bord,
        boxShadow: ombre,
        transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {barreAnnonce()}
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: pad,
        display: 'flex', flexDirection: centre ? 'column' : 'row',
        alignItems: 'center', justifyContent: 'space-between', gap: centre ? 8 : 0,
      }}>
        {centre ? (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ width: 48, flexShrink: 0 }} aria-hidden="true" />
            {logo}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {boutonCta()}
              {boutonMenu()}
            </div>
          </div>
        ) : (
          <>
            {logo}
            {menuDesktop}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {boutonCta()}
              {boutonMenu()}
            </div>
          </>
        )}
        {centre && !isMobile ? menuDesktop : null}
      </div>
      {tiroir()}
    </header>
  )

  function barreAnnonce() {
    const a = presentation.header?.announcement
    if (!a?.visible) return null
    const texte = resolveI18n(a.message, locale).trim()
    if (!texte) return null
    const teintes = couleursAnnonce(t, presentation)
    const href = hrefAnnonce(a.link, restaurant?.phone ?? '')
    const styleBarre = {
      display: 'block' as const,
      width: '100%',
      background: teintes.bg,
      color: teintes.fg,
      fontFamily: 'var(--font-body, var(--f-body))',
      fontSize: 13,
      fontWeight: 600,
      textAlign: 'center' as const,
      padding: '8px 16px',
      lineHeight: 1.45,
      textDecoration: href ? 'underline' : 'none',
      textUnderlineOffset: '3px',
    }
    const slot = selectable ? { 'data-cms-slot': 'announce' as const } : {}
    if (href) {
      return <a href={href} {...slot} style={styleBarre}>{texte}</a>
    }
    return <div role="status" {...slot} style={styleBarre}>{texte}</div>
  }

  function boutonCta() {
    return (
          <a href={hrefCta} className="desktop-nav" aria-label={libelleCta} style={{
            fontSize: compact ? 13 : 14, fontWeight: 600, color: couleurs.ctaText, background: couleurs.ctaBg,
            padding: compact ? '6px 14px' : '8px 18px', borderRadius: '100px', textDecoration: 'none',
            fontFamily: 'var(--font-body, var(--f-body))',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: softShadowSm(t),
            transition: 'transform 0.2s',
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {libelleCta} {Icon.arrow(14)}
          </a>
    )
  }

  function boutonMenu() {
    return (
          <button className="mobile-nav-toggle" aria-label={drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              display: isMobile ? 'flex' : 'none',
              flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              width: '44px', height: '44px', borderRadius: '12px',
              background: surBanniere ? 'transparent' : (headerChoisi || presentation.header?.bg ? couleurs.bg : t.surface),
              border: surBanniere ? '1px solid rgba(255,255,255,0.35)' : `1px solid ${t.shadow}`,
              cursor: 'pointer', gap: drawerOpen ? 0 : 5,
              transition: 'gap 0.2s',
            }}>
            <span style={{ width: '18px', height: '2px', background: surBanniere ? t.headingInvert : couleurLogo, borderRadius: '2px', transform: drawerOpen ? 'rotate(45deg) translate(2px,2px)' : 'none', transition: 'transform 0.2s' }} />
            <span style={{ width: '18px', height: '2px', background: surBanniere ? t.headingInvert : couleurLogo, borderRadius: '2px', opacity: drawerOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
            <span style={{ width: '18px', height: '2px', background: surBanniere ? t.headingInvert : couleurLogo, borderRadius: '2px', transform: drawerOpen ? 'rotate(-45deg) translate(1px,-1px)' : 'none', transition: 'transform 0.2s' }} />
          </button>
    )
  }

  function tiroir() {
    /* Portal hors du header : sinon z-index 50 du header crée un stacking context
       et les cartes (transform) peignent par-dessus le menu (audit mobile P0).
       Cible = document de la vue (iframe aperçu Atelier) pour ne pas polluer la console. */
    if (!drawerOpen || !isMobile) return null
    const doc = vueApercu?.document ?? (typeof document !== 'undefined' ? document : null)
    if (!doc?.body) return null
    const fondTiroir = headerChoisi || presentation.header?.bg ? couleurs.bg : t.surface
    const couleurTexte = headerChoisi || presentation.header?.text ? couleurs.text : t.text
    return createPortal(
      <>
      <AnimatePresence>
        <motion.div
          key="nav-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 998,
            touchAction: 'manipulation',
          }}
        />
      </AnimatePresence>
      <AnimatePresence>
        <motion.nav
          key="nav-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Menu mobile"
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(280px, 88vw)',
            maxWidth: '100%',
            background: fondTiroir,
            boxShadow: `-8px 0 40px ${t.shadowDeep}`,
            zIndex: 999,
            padding: 'max(80px, calc(24px + env(safe-area-inset-top, 0px))) 24px calc(32px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', flexDirection: 'column', gap: '4px',
            borderLeft: `1px solid ${t.shadow}`,
            overscrollBehavior: 'contain',
            overflowY: 'auto',
            touchAction: 'manipulation',
          }}
        >
          <button aria-label="Fermer" onClick={() => setDrawerOpen(false)}
            style={{ position: 'absolute', top: 'max(20px, env(safe-area-inset-top, 0px))', right: '20px', width: '44px', height: '44px',
              borderRadius: '10px', background: t.surfaceAlt, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.heading, fontSize: '20px',
              touchAction: 'manipulation' }}>
            <span aria-hidden="true">✕</span>
          </button>
          {liensMenu.map((lien, i) => {
            const id = lien.target.replace(/^#/, '')
            const libelle = libelleLien(lien, locale)
            return (
            <motion.a key={lien.id} href={hrefLien(lien.target, restaurant?.phone)} onClick={() => setDrawerOpen(false)}
              aria-current={active === id ? 'true' : undefined}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                fontFamily: 'var(--font-heading, var(--f-heading))', fontSize: '18px', fontWeight: 600,
                color: active === id ? couleurAccent : couleurTexte,
                textDecoration: 'none', padding: '14px 16px', borderRadius: '12px',
                background: active === id ? `${t.primary}0a` : 'transparent',
                transition: 'background-color 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                minHeight: 44,
              }}>
              {libelle}
              {active === id && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleurAccent }} />}
            </motion.a>
            )
          })}
          <a href={hrefCta} onClick={() => setDrawerOpen(false)}
            style={{ marginTop: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 600,
              color: couleurs.ctaText, background: couleurs.ctaBg, padding: '14px', borderRadius: '100px',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 48, boxShadow: softShadowSm(t), touchAction: 'manipulation' }}>
            {libelleCta} {Icon.arrow(16)}
          </a>
        </motion.nav>
      </AnimatePresence>
      </>,
      doc.body,
    )
  }
}
