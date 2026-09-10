import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { softShadowSm } from '@/components/ui/shadows'
import { Icon } from '@/lib/icons'

export function PublicNav() {
  const { theme: t } = useSite()
  const isMobile = useIsMobile()
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkIds = ['carte', 'histoire', 'engagements', 'equipe', 'loca', 'contact', 'blog']
  const active = useScrollSpy(linkIds)
  const links: [string, string][] = [
    ['La carte', 'carte'], ['Histoire', 'histoire'], ['Engagements', 'engagements'],
    ['Équipe', 'equipe'], ['Nous trouver', 'loca'], ['Contact', 'contact'], ['Blog', 'blog'],
  ]

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: scrolled ? t.surface : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${t.shadow}` : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="#home" aria-label="Greatlife — accueil" style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, fontSize: '24px', color: t.heading, textDecoration: 'none', letterSpacing: '-0.02em' }}>
          Great<span style={{ color: t.accent }}>life</span>
        </a>
        <nav className="desktop-nav" aria-label="Navigation principale" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {links.map(([l, id]) => (
            <a key={l} href={`#${id}`} aria-current={active === id ? 'true' : undefined}
              style={{
                fontSize: '14px', fontWeight: 500,
                color: active === id ? t.accent : t.text,
                textDecoration: active === id ? 'underline' : 'none',
                textUnderlineOffset: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = t.accent}
              onMouseLeave={e => e.currentTarget.style.color = active === id ? t.accent : t.text}>{l}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="#contact" className="desktop-nav" aria-label="Réserver une table" style={{
            fontSize: '14px', fontWeight: 600, color: '#fff', background: t.primary,
            padding: '8px 18px', borderRadius: '100px', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: softShadowSm(t),
            transition: 'transform 0.2s',
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            Réserver {Icon.arrow(14)}
          </a>
          <button className="mobile-nav-toggle" aria-label={drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              display: isMobile ? 'flex' : 'none',
              flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              width: '40px', height: '40px', borderRadius: '12px',
              background: t.surface, border: `1px solid ${t.shadow}`,
              cursor: 'pointer', gap: drawerOpen ? 0 : 5,
              transition: 'gap 0.2s',
            }}>
            <span style={{ width: '18px', height: '2px', background: t.heading, borderRadius: '2px', transform: drawerOpen ? 'rotate(45deg) translate(2px,2px)' : 'none', transition: 'transform 0.2s' }} />
            <span style={{ width: '18px', height: '2px', background: t.heading, borderRadius: '2px', opacity: drawerOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
            <span style={{ width: '18px', height: '2px', background: t.heading, borderRadius: '2px', transform: drawerOpen ? 'rotate(-45deg) translate(1px,-1px)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {drawerOpen && isMobile && (
          <motion.nav initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Menu mobile"
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '280px',
              background: t.surface, boxShadow: `-8px 0 40px ${t.shadowDeep}`,
              zIndex: 100, padding: '80px 24px 32px', display: 'flex', flexDirection: 'column', gap: '4px',
              borderLeft: `1px solid ${t.shadow}`,
            }}>
            <button aria-label="Fermer" onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px',
                borderRadius: '10px', background: t.surfaceAlt, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.heading, fontSize: '20px' }}>
              ✕
            </button>
            {links.map(([l, id], i) => (
              <motion.a key={l} href={`#${id}`} onClick={() => setDrawerOpen(false)}
                aria-current={active === id ? 'true' : undefined}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  fontFamily: 'var(--f-heading)', fontSize: '18px', fontWeight: 600,
                  color: active === id ? t.accent : t.text,
                  textDecoration: 'none', padding: '14px 16px', borderRadius: '12px',
                  background: active === id ? `${t.primary}0a` : 'transparent',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                {l}
                {active === id && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.accent }} />}
              </motion.a>
            ))}
            <a href="#contact" onClick={() => setDrawerOpen(false)}
              style={{ marginTop: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 600,
                color: '#fff', background: t.primary, padding: '14px', borderRadius: '100px',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: softShadowSm(t) }}>
              Réserver une table {Icon.arrow(16)}
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {drawerOpen && isMobile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
        )}
      </AnimatePresence>
    </header>
  )
}
