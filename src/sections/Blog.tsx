import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'
import type { BlogPost } from '@/lib/repository'

const FALLBACK_POSTS: BlogPost[] = [
  { title: 'Pourquoi le corossol mérite sa place dans votre assiette', excerpt: 'Découverte d\'un superfruit guinéen aux vertus digestives reconnues.', body: '', category: 'Découverte', published: true },
  { title: '5 façons de rendre le fast-food sain (sans le rendre triste)', excerpt: 'Notre approche pour réconcilier gourmandise et santé.', body: '', category: 'Santé', published: true },
  { title: 'Circuit court en Guinée : rencontre avec nos producteurs', excerpt: 'Derriàre chaque burger, des femmes et des hommes de la Fouta-Djallon.', body: '', category: 'Producteurs', published: true },
]

const illusMap: Record<string, string> = {
  'corossol': 'corossol', 'sain': 'sain', 'producteurs': 'producteurs',
  'découverte': 'corossol', 'santé': 'sain', 'producteur': 'producteurs',
}

function getIllus(title: string, category: string) {
  const key = (category + ' ' + title).toLowerCase()
  for (const [k, v] of Object.entries(illusMap)) {
    if (key.includes(k)) return v
  }
  return 'sain'
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatDate(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function BlogIllus({ illus, theme: t }: { illus: string; theme: { heading: string; primary: string; gold: string; accent: string } }) {
  if (illus === 'corossol') {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <ellipse cx="40" cy="42" rx="28" ry="32" fill={t.primary} opacity="0.15" />
        <path d="M 40 14 C 24 14 16 28 16 42 C 16 58 28 68 40 68 C 52 68 64 58 64 42 C 64 28 56 14 40 14 Z" fill={t.gold} opacity="0.25" stroke={t.heading} strokeWidth="1.5" />
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = a * Math.PI / 180
          return <line key={a} x1={40 + 28*Math.cos(rad)} y1={42 + 30*Math.sin(rad)} x2={40 + 36*Math.cos(rad)} y2={42 + 38*Math.sin(rad)} stroke={t.heading} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        })}
        <path d="M 40 14 L 38 6 L 42 6 Z" fill={t.primary} opacity="0.6" />
        <path d="M 38 6 Q 34 2 30 4" stroke={t.primary} strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 40 6 Q 48 2 52 8 Q 48 10 42 8" fill={t.primary} opacity="0.3" />
      </svg>
    )
  }
  if (illus === 'sain') {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <path d="M 50 16 C 44 14 38 18 36 26 C 34 34 40 40 48 38 C 54 36 56 28 50 16 Z" fill={t.primary} opacity="0.25" stroke={t.heading} strokeWidth="1.5" />
        <path d="M 38 28 Q 44 30 48 34" stroke={t.heading} strokeWidth="1" opacity="0.3" />
        <path d="M 18 30 Q 18 22 40 22 Q 62 22 62 30 Z" fill={t.gold} opacity="0.35" stroke={t.heading} strokeWidth="1.5" />
        <ellipse cx="28" cy="26" rx="1.5" ry="1" fill={t.heading} opacity="0.3" />
        <ellipse cx="40" cy="25" rx="1.5" ry="1" fill={t.heading} opacity="0.3" />
        <ellipse cx="52" cy="26" rx="1.5" ry="1" fill={t.heading} opacity="0.3" />
        <line x1="18" y1="34" x2="62" y2="34" stroke={t.heading} strokeWidth="1.5" opacity="0.4" />
        <rect x="20" y="36" width="40" height="8" rx="3" fill={t.accent} opacity="0.2" stroke={t.heading} strokeWidth="1.5" />
        <line x1="18" y1="46" x2="62" y2="46" stroke={t.heading} strokeWidth="1.5" opacity="0.3" />
        <path d="M 18 48 Q 18 60 40 60 Q 62 60 62 48 Z" fill={t.gold} opacity="0.25" stroke={t.heading} strokeWidth="1.5" />
        <path d="M 34 18 Q 36 14 40 16 Q 38 20 34 18" fill={t.primary} opacity="0.4" />
      </svg>
    )
  }
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <circle cx="58" cy="22" r="8" fill={t.gold} opacity="0.3" />
      {[0,45,90,135,180,225,270,315].map(a => {
        const rad = a * Math.PI / 180
        return <line key={a} x1={58+10*Math.cos(rad)} y1={22+10*Math.sin(rad)} x2={58+14*Math.cos(rad)} y2={22+14*Math.sin(rad)} stroke={t.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      })}
      <path d="M 8 52 Q 24 38 40 50 Q 56 40 72 50 L 72 70 L 8 70 Z" fill={t.primary} opacity="0.2" stroke={t.heading} strokeWidth="1.5" />
      <path d="M 8 58 Q 24 48 40 56 Q 56 50 72 56 L 72 70 L 8 70 Z" fill={t.primary} opacity="0.3" />
      {[16,24,32,44,52,60].map((x,i) => (
        <g key={i}>
          <line x1={x} y1={56-(i%2)*2} x2={x} y2={50-(i%2)*2} stroke={t.heading} strokeWidth="1" opacity="0.4" />
          <circle cx={x} cy={48-(i%2)*2} r="2" fill={t.accent} opacity="0.3" />
        </g>
      ))}
      <line x1="8" y1="70" x2="72" y2="70" stroke={t.heading} strokeWidth="1" opacity="0.2" />
    </svg>
  )
}

function ArticleModal({ post, onClose, postImg, illus }: { post: BlogPost; onClose: () => void; postImg?: string; illus: string }) {
  const { theme: t } = useSite()
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '560px', maxHeight: '88vh', overflow: 'auto', background: t.surface, borderRadius: '20px', boxShadow: `0 24px 60px ${t.shadowDeep}` }}>
        <div style={{
          height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '20px 20px 0 0',
          background: postImg ? `url(${postImg}) center/cover` : `linear-gradient(135deg, ${t.primary}18, ${t.gold}12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!postImg && <BlogIllus illus={illus} theme={t} />}
          <div style={{
            position: 'absolute', top: '16px', left: '16px',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: t.primary, color: '#fff', padding: '5px 12px', borderRadius: '100px',
            fontSize: '11px', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>{Icon.leaf(11, '#fff')} {post.category}</div>
          <button onClick={onClose} aria-label="Fermer"
            style={{ position: 'absolute', top: '12px', right: '12px', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.x(20, '#fff')}
          </button>
        </div>
        <div style={{ padding: '28px 28px 32px' }}>
          {post.created_at && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              {formatDate(post.created_at)}
            </div>
          )}
          <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '26px', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{post.title}</h3>
          <p style={{ fontSize: '16px', color: t.muted, lineHeight: 1.6, margin: '0 0 22px', fontStyle: 'italic' }}>{post.excerpt}</p>
          <div style={{ height: '1px', background: t.shadow, margin: '0 0 22px' }} />
          {post.body ? (
            <div style={{ fontSize: '15.5px', color: t.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.body}</div>
          ) : (
            <div style={{ fontSize: '15px', color: t.muted, lineHeight: 1.7 }}>Article à paraître prochainement. Revenez bientôt pour la lecture complète.</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Blog() {
  const { theme: t, blogPosts, media } = useSite()
  const [selected, setSelected] = useState<BlogPost | null>(null)
  const posts = blogPosts.length > 0
    ? blogPosts.filter(p => p.published)
    : FALLBACK_POSTS
  const mediaMap = new Map(media.filter(m => m.url).map(m => [m.slot, m.url!]))
  return (
    <section id="blog" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Reveal><SectionHead title="Le journal Greatlife" sub="Recettes, coulisses et rencontres avec nos producteurs." align="center" /></Reveal>
      <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: '24px' }}>
        {posts.map((post, i) => {
          const illus = getIllus(post.title, post.category)
          const postImg = mediaMap.get(`blog-${slugify(post.title)}`)
          return (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <OrganicCard hover style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              onClick={() => setSelected(post)} role="button" tabIndex={0}
              ariaLabel={`Lire l'article ${post.title}`}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(post) } }}>
              <div style={{ height: '160px', background: postImg ? `url(${postImg}) center/cover` : `linear-gradient(135deg, ${t.primary}18, ${t.gold}12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {!postImg && <BlogIllus illus={illus} theme={t} />}
                <div style={{
                  position: 'absolute', bottom: '12px', left: '12px',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: t.surface, padding: '4px 10px', borderRadius: '100px',
                  fontSize: '11px', fontWeight: 700, color: t.primary, boxShadow: `0 2px 8px ${t.shadow}`,
                }}>{Icon.leaf(10, t.primary)} {post.category}</div>
              </div>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {post.created_at && (
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {formatDate(post.created_at)}
                  </div>
                )}
                <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{post.title}</h4>
                <p style={{ fontSize: '13.5px', color: t.muted, lineHeight: 1.55, margin: 0, flex: 1 }}>{post.excerpt}</p>
                <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 600, color: t.primary }}>Lire l'article {Icon.arrow(14, t.primary)}</div>
              </div>
            </OrganicCard>
          </Reveal>
          )
        })}
      </div>
      <AnimatePresence>
        {selected && (
          <ArticleModal
            post={selected}
            onClose={() => setSelected(null)}
            postImg={mediaMap.get(`blog-${slugify(selected.title)}`)}
            illus={getIllus(selected.title, selected.category)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
