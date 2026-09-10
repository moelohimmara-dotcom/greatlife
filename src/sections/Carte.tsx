import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { BadgePill } from '@/components/ui/BadgePill'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'
import { FoodIcon } from '@/lib/icons/FoodIcon'
import { CATEGORY_ORDER } from '@/data/menu'
import type { MenuItem } from '@/data/menu'

function MenuCard({ item }: { item: MenuItem }) {
  const { theme: t, visibility } = useSite()
  const [open, setOpen] = useState(false)
  return (
    <OrganicCard hover style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: '140px', position: 'relative', overflow: 'hidden',
        background: item.sig
          ? `linear-gradient(135deg, ${t.gold}25, ${t.accent}18)`
          : `linear-gradient(135deg, ${t.primary}12, ${t.primary}06)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FoodIcon cat={item.cat} size={56} color={t.heading} />
        {item.sig && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            display: 'flex', alignItems: 'center', gap: 4,
            background: t.gold, color: '#fff', padding: '4px 10px', borderRadius: '100px',
            fontSize: '11px', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>{Icon.star(10)} Signature</div>
        )}
      </div>
      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '19px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{item.name}</h4>
        <p style={{ fontSize: '13.5px', color: t.muted, lineHeight: 1.5, margin: 0, flex: 1 }}>{item.desc}</p>
        {visibility.badges && item.badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{item.badges.map(b => <BadgePill key={b} b={b} />)}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, color: t.accent, fontSize: '18px', letterSpacing: '-0.01em' }}>
            {item.price}<span style={{ fontSize: '11px', fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span>
          </span>
          {visibility.vertusPanel && (
            <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Vertus nutritionnelles de ${item.name}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '12px', fontWeight: 600, color: t.primary,
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0',
              }}>
              {open ? 'Fermer' : 'Vertus'} {open ? '−' : Icon.plus(12, t.primary)}
            </button>
          )}
        </div>
        <AnimatePresence>
          {open && visibility.vertusPanel && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '12px 14px', borderRadius: '14px',
                background: `linear-gradient(135deg, ${t.primary}0a, ${t.gold}08)`,
                border: `1px solid ${t.primary}15`,
                fontSize: '12.5px', lineHeight: 1.55, color: t.text,
              }}>
                <div style={{ fontWeight: 700, color: t.primary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Icon.leaf(14, t.primary)} Vertus nutritionnelles
                </div>
                {item.vertus}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OrganicCard>
  )
}

export function Carte() {
  const { menu, visibility, theme: t } = useSite()
  const cats = CATEGORY_ORDER.filter(c => c !== 'Suggestions' || visibility.suggestions)
  return (
    <section id="carte" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Reveal><SectionHead title="La transgression saine" sub="Burgers, frites, milkshakes — en version bio, avec les fruits tropicaux de notre terroir. Chaque plat porte ses vertus affichées." align="center" /></Reveal>
      {cats.map((cat, ci) => {
        const items = menu.filter(m => m.cat === cat)
        if (!items.length) return null
        return (
          <div key={cat} style={{ marginBottom: '56px' }}>
            <Reveal delay={ci * 0.05}>
              <h3 style={{
                fontFamily: 'var(--f-heading)', color: t.heading,
                fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em',
                marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {cat}
                <span style={{ flex: 1, height: '1px', background: t.shadow }} />
              </h3>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {items.map((it, i) => (
                <Reveal key={it.name} delay={(i % 4) * 0.06}>
                  <MenuCard item={it} />
                </Reveal>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
