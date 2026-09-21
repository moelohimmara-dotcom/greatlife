import { useState } from 'react'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite, useFirstMedia } from '@/contexts/SiteContext'
import { productPhotoCandidates } from '@/lib/productPhotoSlot'
import { useCart } from '@/contexts/CartContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { BadgePill } from '@/components/ui/BadgePill'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'
import { FoodIcon } from '@/lib/icons/FoodIcon'
import { CATEGORY_ORDER } from '@/data/menu'
import type { MenuItem } from '@/data/menu'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsNumber, cmsText, pick } from '@/cms/renderer/compat'

function MenuCard({ item }: { item: MenuItem }) {
  const { theme: t, visibility } = useSite()
  const { add } = useCart()
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const prodImg = useFirstMedia(productPhotoCandidates(item))
  const handleAdd = () => {
    add(item.name, item.price)
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }
  return (
    <OrganicCard hover style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
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
      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <h4 style={{ fontFamily: 'var(--font-heading, var(--f-heading))', color: t.heading, fontSize: 'calc(19px * var(--font-scale, 1))', fontWeight: 'var(--font-heading-weight, 700)' as unknown as number, margin: 0, letterSpacing: '-0.02em' }}>{item.name}</h4>
        <p style={{ fontSize: '13.5px', fontFamily: 'var(--font-body, var(--f-body))', color: t.muted, lineHeight: 1.5, margin: 0, flex: 1 }}>{item.desc}</p>
        {visibility.badges && item.badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{item.badges.map(b => <BadgePill key={b} b={b} />)}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-heading, var(--f-heading))', fontWeight: 700, color: t.accent, fontSize: '18px', letterSpacing: '-0.01em' }}>
            {item.price}<span style={{ fontSize: '11px', fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

const DISPOSITIONS = ['full', 'by_category', 'tabs'] as const

export function Carte({ content: cms, data, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { menu: legacyMenu, visibility, theme: t } = useSite()

  // TDR §16 : les plats viennent du module Menu, jamais recopiés dans le bloc.
  // Le CMS les transmet par `data` ; sinon on garde la source historique.
  const menu = pick(data?.menu as MenuItem[] | undefined, legacyMenu)
  const title = pick(cmsText(cms, 'title'), 'La transgression saine')
  const subtitle = pick(
    cmsText(cms, 'subtitle'),
    'Burgers, frites, milkshakes — en version bio, avec les fruits tropicaux de notre terroir. Chaque plat porte ses vertus affichées.',
  )

  // Plafond global du nombre de plats affichés. Champ vide = tout afficher.
  // ⚠️ Sémantique (plafond global plutôt que par catégorie) à confirmer :
  // aucune valeur n'est stockée aujourd'hui, l'effet est donc nul.
  const limit = cmsNumber(cms, 'maxItems')

  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'full')
  const cats = CATEGORY_ORDER.filter(c => c !== 'Suggestions' || visibility.suggestions)
  const [catActive, setCatActive] = useState(cats[0] ?? '')

  // Quota par catégorie, calculé SANS mutation : le corps d'un composant doit
  // rester pur. React StrictMode l'exécute deux fois en développement, et un
  // compteur incrémenté ici fausserait la répartition.
  const quotaByCat = new Map<string, number>()
  if (limit !== undefined) {
    let remaining = Math.max(0, limit)
    for (const cat of cats) {
      const available = menu.filter(m => m.cat === cat).length
      const take = Math.min(available, remaining)
      quotaByCat.set(cat, take)
      remaining -= take
    }
  }

  const blocCategorie = (cat: string, ci: number) => {
    const all = menu.filter(m => m.cat === cat)
    const items = limit !== undefined ? all.slice(0, quotaByCat.get(cat) ?? 0) : all
    if (!items.length) return null
    return (
      <div key={cat} style={{ marginBottom: '56px' }}>
        <Reveal delay={ci * 0.05}>
          <h3 style={{
            fontFamily: 'var(--font-heading, var(--f-heading))', color: t.heading,
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
              <MenuCard item={it} />
            </Reveal>
          ))}
        </div>
      </div>
    )
  }

  if (disposition === 'full') {
    return (
      <section className="section-pad" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal><SectionHead title={title} sub={subtitle} align="center" preview={preview} /></Reveal>
        {cats.map((cat, ci) => blocCategorie(cat, ci))}
      </section>
    )
  }

  const visible = cats.filter((c) => {
    const all = menu.filter(m => m.cat === c)
    const items = limit !== undefined ? all.slice(0, quotaByCat.get(c) ?? 0) : all
    return items.length > 0
  })
  const choisie = visible.includes(catActive) ? catActive : (visible[0] ?? '')

  return (
    <section
      className="section-pad"
      data-disposition={disposition}
      style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}
    >
      <Reveal><SectionHead title={title} sub={subtitle} align="center" preview={preview} /></Reveal>
      {disposition === 'tabs' ? (
        <div role="tablist" aria-label="Catégories de la carte" style={{
          display: 'flex', gap: 4, marginBottom: 28, overflowX: 'auto',
          borderBottom: `1px solid ${t.shadow}`,
        }}>
          {visible.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={cat === choisie}
              onClick={() => setCatActive(cat)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 14, fontWeight: 700,
                color: cat === choisie ? t.heading : t.muted,
                borderBottom: cat === choisie ? `2px solid ${t.primary}` : '2px solid transparent',
                marginBottom: -1, whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : (
        <div role="group" aria-label="Catégories de la carte" style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, justifyContent: 'center',
        }}>
          {visible.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatActive(cat)}
              style={{
                cursor: 'pointer', padding: '8px 16px', borderRadius: 100,
                fontSize: 13, fontWeight: 600,
                border: `1px solid ${cat === choisie ? t.primary : t.shadow}`,
                background: cat === choisie ? t.primary : 'transparent',
                color: cat === choisie ? '#fff' : t.text,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {choisie ? blocCategorie(choisie, 0) : null}
    </section>
  )
}
