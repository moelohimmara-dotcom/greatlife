import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite, useMedia } from '@/contexts/SiteContext'
import { useCart } from '@/contexts/CartContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { BadgePill } from '@/components/ui/BadgePill'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'
import { FoodIcon } from '@/lib/icons/FoodIcon'
import { CATEGORY_ORDER } from '@/data/menu'
import type { MenuItem } from '@/data/menu'

function productSlot(item: MenuItem) {
  const base = item.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return `produit-${base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function useProductImage(slotId: string) {
  const supabaseImg = useMedia(slotId)
  const localImg = `/produits/${slotId}.jpg`
  const [localOk, setLocalOk] = useState(false)
  useEffect(() => {
    if (supabaseImg) return
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setLocalOk(true) }
    img.onerror = () => { if (!cancelled) setLocalOk(false) }
    img.src = localImg
    return () => { cancelled = true }
  }, [localImg, supabaseImg])
  return supabaseImg || (localOk ? localImg : undefined)
}

function ProductModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { theme: t, visibility } = useSite()
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const [qty, setQty] = useState(1)
  const slotId = productSlot(item)
  const prodImg = useProductImage(slotId)
  const handleAdd = () => {
    for (let i = 0; i < qty; i++) add(item.name, item.price)
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto', background: t.surface, borderRadius: '20px', boxShadow: `0 24px 60px ${t.shadowDeep}` }}>
        <div style={{
          height: '220px', position: 'relative', overflow: 'hidden', borderRadius: '20px 20px 0 0',
          background: prodImg
            ? `url(${prodImg}) center/cover`
            : item.sig
              ? `linear-gradient(135deg, ${t.gold}30, ${t.accent}20)`
              : `linear-gradient(135deg, ${t.primary}18, ${t.primary}0a)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!prodImg && <FoodIcon cat={item.cat} size={96} color={t.heading} />}
          {item.sig && (
            <div style={{
              position: 'absolute', top: '16px', left: '16px',
              display: 'flex', alignItems: 'center', gap: 4,
              background: t.gold, color: '#fff', padding: '5px 12px', borderRadius: '100px',
              fontSize: '11px', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>{Icon.star(10)} Signature</div>
          )}
          <button onClick={onClose} aria-label="Fermer"
            style={{ position: 'absolute', top: '12px', right: '12px', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.x(20, '#fff')}
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{item.name}</h3>
            <span style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, color: t.accent, fontSize: '22px', letterSpacing: '-0.01em' }}>
              {item.price}<span style={{ fontSize: '12px', fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span>
            </span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{item.cat}</div>
          <p style={{ fontSize: '15px', color: t.text, lineHeight: 1.6, margin: '0 0 16px' }}>{item.desc}</p>
          {visibility.badges && item.badges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>{item.badges.map(b => <BadgePill key={b} b={b} />)}</div>
          )}
          {visibility.vertusPanel && (
            <div style={{
              padding: '14px 16px', borderRadius: '14px', marginBottom: 20,
              background: `linear-gradient(135deg, ${t.primary}0a, ${t.gold}08)`,
              border: `1px solid ${t.primary}15`,
            }}>
              <div style={{ fontWeight: 700, color: t.primary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px' }}>
                {Icon.leaf(15, t.primary)} Vertus nutritionnelles
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: t.text }}>{item.vertus}</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuer" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.shadow}`, background: t.surfaceAlt, color: t.heading, cursor: 'pointer', fontSize: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ minWidth: 30, textAlign: 'center', fontSize: 16, fontWeight: 700, color: t.heading }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label="Augmenter" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.shadow}`, background: t.surfaceAlt, color: t.heading, cursor: 'pointer', fontSize: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <button onClick={handleAdd} disabled={added} className="gbtn"
              style={{
                flex: 1, minWidth: 160, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: '15px', fontWeight: 700, padding: '14px 24px', cursor: 'pointer', border: 'none',
                background: added ? t.primary : t.primary, color: '#fff',
                boxShadow: `0 4px 16px ${t.shadowDeep}`, transition: 'all 0.2s',
              }}>
              {added ? Icon.check(16, '#fff') : Icon.plus(16, '#fff')} {added ? 'Ajouté' : `Ajouter à ma commande`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function MenuCard({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const { theme: t, visibility } = useSite()
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const slotId = productSlot(item)
  const prodImg = useProductImage(slotId)
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    add(item.name, item.price)
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }
  return (
    <OrganicCard hover style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <div onClick={onOpen} role="button" tabIndex={0} aria-label={`Voir la fiche de ${item.name}`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
        style={{
          height: '140px', position: 'relative', overflow: 'hidden',
          background: prodImg
            ? `url(${prodImg}) center/cover`
            : item.sig
              ? `linear-gradient(135deg, ${t.gold}25, ${t.accent}18)`
              : `linear-gradient(135deg, ${t.primary}12, ${t.primary}06)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {!prodImg && <FoodIcon cat={item.cat} size={56} color={t.heading} />}
        {item.sig && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            display: 'flex', alignItems: 'center', gap: 4,
            background: t.gold, color: '#fff', padding: '4px 10px', borderRadius: '100px',
            fontSize: '11px', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>{Icon.star(10)} Signature</div>
        )}
      </div>
      <div onClick={onOpen} role="button" tabIndex={0} aria-label={`Voir la fiche de ${item.name}`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
        style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '19px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{item.name}</h4>
        <p style={{ fontSize: '13.5px', color: t.muted, lineHeight: 1.5, margin: 0, flex: 1 }}>{item.desc}</p>
        {visibility.badges && item.badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{item.badges.map(b => <BadgePill key={b} b={b} />)}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, color: t.accent, fontSize: '18px', letterSpacing: '-0.01em' }}>
            {item.price}<span style={{ fontSize: '11px', fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleAdd} aria-label={`Ajouter ${item.name} à ma commande`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: '12.5px', fontWeight: 700,
                padding: '7px 14px', borderRadius: '100px', cursor: 'pointer',
                border: `1px solid ${t.primary}55`,
                background: added ? t.primary : 'transparent',
                color: added ? '#fff' : t.primary, transition: 'all 0.2s',
              }}>
              {added ? Icon.check(14, '#fff') : Icon.plus(14, t.primary)} {added ? 'Ajouté' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </OrganicCard>
  )
}

export function Carte() {
  const { menu, visibility, theme: t } = useSite()
  const [selected, setSelected] = useState<MenuItem | null>(null)
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
            <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {items.map((it, i) => (
                <Reveal key={it.name} delay={(i % 4) * 0.06}>
                  <MenuCard item={it} onOpen={() => setSelected(it)} />
                </Reveal>
              ))}
            </div>
          </div>
        )
      })}
      <AnimatePresence>
        {selected && <ProductModal item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  )
}
