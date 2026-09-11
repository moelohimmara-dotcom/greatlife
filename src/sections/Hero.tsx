import { motion, useScroll, useTransform } from 'framer-motion'
import { useSite, useMedia } from '@/contexts/SiteContext'
import { softShadow } from '@/components/ui/shadows'
import { Icon } from '@/lib/icons'
import { BurgerIllustration } from '@/lib/icons/FoodIcon'

export function Hero() {
  const { theme: t, content } = useSite()
  const heroImg = useMedia('hero')
  const { scrollY } = useScroll()
  const yImg = useTransform(scrollY, [0, 400], [0, 60])
  const opacity = useTransform(scrollY, [0, 300], [1, 0.7])

  return (
    <section id="home" className="section-pad-top" style={{ position: 'relative', overflow: 'hidden', padding: '40px 24px 100px' }}>
      <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${t.primary}15, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-120px', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, ${t.gold}12, transparent 70%)`, pointerEvents: 'none' }} />

      <div className="hero-grid" style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center', position: 'relative' }}>
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: t.surfaceAlt, borderRadius: '100px',
            padding: '8px 16px', marginBottom: '24px', border: `1px solid ${t.shadow}`,
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.primary }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: t.muted, letterSpacing: '0.01em' }}>{content.slogan}</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--f-heading)', color: t.heading,
            fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 700,
            lineHeight: 1.02, letterSpacing: '-0.04em', margin: 0,
            fontVariationSettings: '"opsz" 144',
          }}>{content.heroTitle}</h1>
          <p style={{ fontSize: '18px', color: t.muted, lineHeight: 1.55, margin: '24px 0 32px', maxWidth: '480px' }}>{content.heroSub}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#carte" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: t.primary, color: '#fff', fontWeight: 600,
              padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none',
              boxShadow: `0 4px 16px ${t.shadowDeep}`, transition: 'transform 0.2s',
            }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              Découvrir la carte {Icon.arrow(16)}
            </a>
            <a href="#contact" style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'transparent', color: t.heading, fontWeight: 600,
              padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none',
              border: `2px solid ${t.primary}33`,
            }}>Réserver une table</a>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '36px' }}>
            {[
              [Icon.leaf(18, t.primary), '100% bio'],
              [Icon.recycle(18, t.accent), 'Emballages éco'],
              [Icon.coin(18, t.gold), 'Prix accessibles'],
            ].map(([ic, label], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {ic}
                <span style={{ fontSize: '13px', fontWeight: 500, color: t.muted }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div style={{ y: yImg, opacity }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{
            position: 'relative', aspectRatio: '1', borderRadius: '50%',
            background: heroImg
              ? `url(${heroImg}) center/cover`
              : `radial-gradient(circle at 35% 35%, ${t.gold}30, ${t.accent}20 50%, ${t.primary}15 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: softShadow(t), border: `1px solid ${t.shadow}`, overflow: 'hidden',
          }}>
            {!heroImg && <div style={{ position: 'absolute', inset: '30px', borderRadius: '50%', border: `2px dashed ${t.primary}22` }} />}
            {!heroImg && (
              <div style={{ position: 'relative', width: '60%', height: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BurgerIllustration theme={t} />
              </div>
            )}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              style={{ position: 'absolute', bottom: '10%', right: '5%', background: t.surface, borderRadius: '16px', padding: '12px 18px', boxShadow: softShadow(t), border: `1px solid ${t.shadow}` }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signature</div>
              <div style={{ fontFamily: 'var(--f-heading)', fontSize: '18px', fontWeight: 700, color: t.heading }}>Le Greatlife</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: t.accent }}>48 000 FG</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
              style={{ position: 'absolute', top: '8%', left: '3%', background: t.primary, borderRadius: '14px', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 16px ${t.shadowDeep}` }}>
              {Icon.leaf(16, '#fff')} <span style={{ fontSize: '12px', fontWeight: 600 }}>Bio</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
