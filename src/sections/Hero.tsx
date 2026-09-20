import { motion, useScroll, useTransform } from 'framer-motion'
import { useSite, useMedia } from '@/contexts/SiteContext'
import { softShadow } from '@/components/ui/shadows'
import { Icon } from '@/lib/icons'
import { BurgerIllustration } from '@/lib/icons/FoodIcon'
import type { SectionComponentProps } from '@/cms/renderer'
import { anchorHref, cmsGroup, cmsText, cmsTextList, pick } from '@/cms/renderer/compat'
import { normaliserDisposition as choisirDisposition } from '@/cms/renderer/disposition'

/** Pastilles historiques — servent de repli tant que le CMS n'est pas activé. */
const LEGACY_CHIPS = ['100% bio', 'Emballages éco', 'Prix accessibles']

/**
 * Ancre des boutons historiques. ⚠️ Le bouton secondaire pointait vers
 * `#contact` alors que le libellé annonce une réservation ; le contenu migré
 * (migration 025) vise `#reservation`, qui est la cible correcte. L'écart
 * n'apparaîtra qu'à la bascule — il est signalé au rapport de lot.
 */
const LEGACY_PRIMARY_TARGET = 'carte'
const LEGACY_SECONDARY_TARGET = 'contact'

/**
 * LES DISPOSITIONS DE LA BANNIÈRE — TDR §13
 * =========================================
 * Le TDR §13 demande des « variantes maîtrisées » et donne cet exemple, mot pour
 * mot : Plein écran · Image + texte · Centré · Vidéo. Ces quatre identifiants
 * étaient déclarés, sélectionnables dans l'éditeur et enregistrés en base —
 * **et lus par aucun composant** : choisir « Centré » ne changeait rien.
 * C'est ce que ce fichier branche.
 *
 * UNE DISPOSITION INCONNUE RETOMBE SUR LE RENDU HISTORIQUE
 * `variants` porte une valeur venue de la base. Si elle est absente, inattendue,
 * ou écrite à la main, la bannière rend `image_text` — la mise en page qui est
 * celle du site depuis toujours. Une donnée imprévue ne peut donc pas casser la
 * page d'accueil, et `verify:lot1` continue de le prouver.
 */
const DISPOSITIONS = ['image_text', 'fullscreen', 'centered', 'video'] as const
type Disposition = (typeof DISPOSITIONS)[number]

export function normaliserDisposition(valeur: string | null | undefined): Disposition {
  return choisirDisposition(valeur, DISPOSITIONS, 'image_text')
}

/** Valeurs résolues, partagées par les quatre dispositions. */
interface HeroContent {
  tagline: string
  title: string
  subtitle: string
  chipLabels: readonly string[]
  heroImg: string | undefined
  pill: string
  badgeLabel: string
  badgeName: string
  badgeValue: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
  videoUrl: string
}

/**
 * Bannière « Plein écran » — l'image occupe toute la largeur et le texte se pose
 * dessus, sur un voile sombre qui garantit la lisibilité quel que soit le cliché.
 */
function HeroPleinEcran({
  c,
  video,
  manqueVideo,
}: {
  c: HeroContent
  video: string | null
  manqueVideo?: boolean
}) {
  const { theme: t } = useSite()
  const fond = c.heroImg ? `url(${c.heroImg}) center/cover` : `linear-gradient(135deg, ${t.primary}, ${t.primaryDark})`

  return (
    <section
      style={{ position: 'relative', overflow: 'hidden', minHeight: 'min(78vh, 680px)', display: 'flex', alignItems: 'center' }}
    >
      {video ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={c.heroImg}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src={video} />
        </video>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: fond }} />
      )}
      {/* Voile : sans lui, un titre clair sur une photo claire devient illisible. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.62))' }} />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', maxWidth: '820px', margin: '0 auto', padding: '96px 24px', textAlign: 'center', color: '#fff' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.14)', borderRadius: '100px', padding: '8px 16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.28)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.gold }} />
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em' }}>{c.tagline}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--f-heading)', fontSize: 'clamp(38px, 6vw, 66px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.04em', margin: 0, fontVariationSettings: '"opsz" 144' }}>
          {c.title}
        </h1>
        <p style={{ fontSize: '18px', lineHeight: 1.55, margin: '24px auto 32px', maxWidth: '620px', opacity: 0.92 }}>{c.subtitle}</p>
        {manqueVideo && (
          <p style={{
            display: 'inline-block',
            margin: '0 auto 24px',
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.35)',
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
            maxWidth: 420,
          }}>
            Disposition « Vidéo » : ajoutez une vidéo dans la colonne Modifier pour qu’elle se lance ici.
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={c.primaryHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.primary, color: '#fff', fontWeight: 600, padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none', boxShadow: `0 4px 16px ${t.shadowDeep}` }}>
            {c.primaryLabel} {Icon.arrow(16)}
          </a>
          <a href={c.secondaryHref} style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none', border: '2px solid rgba(255,255,255,0.4)' }}>
            {c.secondaryLabel}
          </a>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '36px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {c.chipLabels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/**
 * Bannière « Centrée » — aucune image, un bloc compact. Pour un site qui veut
 * aller droit au but, ou quand aucune photo n'est encore disponible.
 */
function HeroCentre({ c }: { c: HeroContent }) {
  const { theme: t } = useSite()

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '88px 24px 96px', background: t.surfaceAlt }}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.surfaceAlt, borderRadius: '100px', padding: '8px 16px', marginBottom: '24px', border: `1px solid ${t.shadow}` }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.primary }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: t.muted }}>{c.tagline}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: 'clamp(36px, 5.5vw, 56px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.04em', margin: 0, fontVariationSettings: '"opsz" 144' }}>
          {c.title}
        </h1>
        <p style={{ fontSize: '18px', color: t.muted, lineHeight: 1.55, margin: '24px auto 32px', maxWidth: '560px' }}>{c.subtitle}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={c.primaryHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.primary, color: '#fff', fontWeight: 600, padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none', boxShadow: `0 4px 16px ${t.shadowDeep}` }}>
            {c.primaryLabel} {Icon.arrow(16)}
          </a>
          <a href={c.secondaryHref} style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: t.heading, fontWeight: 600, padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none', border: `2px solid ${t.primary}33` }}>
            {c.secondaryLabel}
          </a>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '36px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {c.chipLabels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: t.muted }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export function Hero({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t, content: legacy } = useSite()
  const legacyHeroImg = useMedia('hero')
  const legacyHeroVideo = useMedia('hero-video')
  const { scrollY } = useScroll()
  const yImg = useTransform(scrollY, [0, 400], [0, 60])
  const opacity = useTransform(scrollY, [0, 300], [1, 0.7])

  // --- Contenu résolu : CMS s'il est renseigné, sinon valeurs historiques ---
  const tagline = pick(cmsText(cms, 'tagline'), legacy.slogan)
  const title = pick(cmsText(cms, 'title'), legacy.heroTitle)
  const subtitle = pick(cmsText(cms, 'subtitle'), legacy.heroSub)
  const chipLabels = pick(cmsTextList(cms, 'chips'), LEGACY_CHIPS)
  const heroImg = cmsText(cms, 'image') ?? legacyHeroImg
  const pill = pick(cmsText(cms, 'pill'), 'Bio')

  const badge = cmsGroup(cms, 'badge')
  const badgeLabel = pick(cmsText(badge, 'label'), 'Signature')
  const badgeName = pick(cmsText(badge, 'name'), 'Le Greatlife')
  const badgeValue = pick(cmsText(badge, 'value'), '48 000 FG')

  const primaryCta = cmsGroup(cms, 'primaryCta')
  const primaryLabel = pick(cmsText(primaryCta, 'label'), 'Découvrir la carte')
  const primaryHref = anchorHref(pick(cmsText(primaryCta, 'target'), LEGACY_PRIMARY_TARGET))

  const secondaryCta = cmsGroup(cms, 'secondaryCta')
  const secondaryLabel = pick(cmsText(secondaryCta, 'label'), 'Réserver une table')
  const secondaryHref = anchorHref(pick(cmsText(secondaryCta, 'target'), LEGACY_SECONDARY_TARGET))

  const videoUrl = cmsText(cms, 'video') ?? legacyHeroVideo ?? ''

  // Les icônes restent associées à la POSITION, comme dans le rendu historique :
  // seule la couleur change, jamais l'ordre.
  const chipIcons = [Icon.leaf(18, t.primary), Icon.recycle(18, t.accent), Icon.coin(18, t.gold)]

  const contenu: HeroContent = {
    tagline, title, subtitle, chipLabels, heroImg, pill,
    badgeLabel, badgeName, badgeValue,
    primaryLabel, primaryHref, secondaryLabel, secondaryHref, videoUrl,
  }

  const disposition = normaliserDisposition(variant)

  /*
    « Vidéo » SANS VIDÉO SE RABAT SUR « PLEIN ÉCRAN ».
    Le restaurateur peut choisir cette disposition avant d'avoir une adresse de
    vidéo. Sans ce repli, la bannière n'aurait plus ni image ni fond — un écran
    vide, sans que rien ne l'explique. Le champ le dit dans l'éditeur.
  */
  if (disposition === 'fullscreen') {
    return <HeroPleinEcran c={contenu} video={null} />
  }
  if (disposition === 'video') {
    return (
      <HeroPleinEcran
        c={contenu}
        video={videoUrl || null}
        manqueVideo={Boolean(preview) && !videoUrl}
      />
    )
  }
  if (disposition === 'centered') {
    return <HeroCentre c={contenu} />
  }

  // --- « Image + texte » : RENDU HISTORIQUE, INCHANGÉ ------------------------
  // C'est la disposition enregistrée par défaut. Elle doit produire exactement
  // ce qu'elle produisait avant ce lot — `npm run verify:lot1` le vérifie octet
  // par octet contre la révision `0528c544`.
  return (
    <section className="section-pad-top" style={{ position: 'relative', overflow: 'hidden', padding: '40px 24px 100px' }}>
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
            <span style={{ fontSize: '13px', fontWeight: 600, color: t.muted, letterSpacing: '0.01em' }}>{tagline}</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--f-heading)', color: t.heading,
            fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 700,
            lineHeight: 1.02, letterSpacing: '-0.04em', margin: 0,
            fontVariationSettings: '"opsz" 144',
          }}>{title}</h1>
          <p style={{ fontSize: '18px', color: t.muted, lineHeight: 1.55, margin: '24px 0 32px', maxWidth: '480px' }}>{subtitle}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={primaryHref} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: t.primary, color: '#fff', fontWeight: 600,
              padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none',
              boxShadow: `0 4px 16px ${t.shadowDeep}`, transition: 'transform 0.2s',
            }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {primaryLabel} {Icon.arrow(16)}
            </a>
            <a href={secondaryHref} style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'transparent', color: t.heading, fontWeight: 600,
              padding: '14px 28px', borderRadius: '100px', fontSize: '15px', textDecoration: 'none',
              border: `2px solid ${t.primary}33`,
            }}>{secondaryLabel}</a>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '36px' }}>
            {chipLabels.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {chipIcons[i % chipIcons.length]}
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
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{badgeLabel}</div>
              <div style={{ fontFamily: 'var(--f-heading)', fontSize: '18px', fontWeight: 700, color: t.heading }}>{badgeName}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: t.accent }}>{badgeValue}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
              style={{ position: 'absolute', top: '8%', left: '3%', background: t.primary, borderRadius: '14px', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 16px ${t.shadowDeep}` }}>
              {Icon.leaf(16, '#fff')} <span style={{ fontSize: '12px', fontWeight: 600 }}>{pill}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
