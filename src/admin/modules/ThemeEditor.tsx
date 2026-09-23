import { useId, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton, GhostButton } from '@/admin/ui'
import { THEMES } from '@/config/themes'
import { lotParId, lotDepuisFontId } from '@/config/fonts'
import { TypoPanel } from '@/admin/editor/TypoPanel'
import { SaveBar } from '@/admin/shared'
import { Icon } from '@/lib/icons'

type ThemeTab = 'palettes' | 'couleurs' | 'polices' | 'ambiance' | 'elements'
type PreviewSize = 'bureau' | 'telephone'

const TABS: ReadonlyArray<{ id: ThemeTab; label: string; blurb: string }> = [
  { id: 'palettes', label: 'Palettes', blurb: 'Choisissez l’ambiance générale du site.' },
  { id: 'couleurs', label: 'Couleurs', blurb: 'Teintes de la palette active — protégées pour rester lisibles.' },
  { id: 'polices', label: 'Polices', blurb: 'Titres et textes vus par vos clients après enregistrement.' },
  { id: 'ambiance', label: 'Ambiance', blurb: 'Densité et ombres suivent déjà la charte Greatlife.' },
  { id: 'elements', label: 'Éléments', blurb: 'Boutons, cartes et en-tête suivent la palette choisie.' },
]

const THEME_BLURBS: Record<string, string> = {
  gourmand: 'Terracotta, ivoire et une énergie chaleureuse',
  premium: 'Noir profond, crème et accents dorés',
  nature: 'Olive, sable et matières organiques',
  tropical: 'Graphite vif, blanc et orange solaire',
}

const COLOR_ROLES: ReadonlyArray<{
  key: 'primary' | 'bg' | 'text' | 'accent' | 'gold' | 'heading'
  label: string
  help: string
}> = [
  { key: 'primary', label: 'Couleur principale', help: 'Boutons et actions fortes' },
  { key: 'heading', label: 'Titres', help: 'En-têtes et noms de plats' },
  { key: 'accent', label: 'Touche d’accent', help: 'Mises en avant et détails' },
  { key: 'gold', label: 'Lumière / or', help: 'Points de chaleur' },
  { key: 'bg', label: 'Fond de page', help: 'Arrière-plan général' },
  { key: 'text', label: 'Texte courant', help: 'Paragraphes et menus' },
]

function ThemeGuide({ onClose }: { onClose: () => void }) {
  return (
    <section className="admin-wf-media-guide" id="theme-guide" aria-label="Comment ça marche">
      <header className="admin-wf-media-guide-head">
        <strong>
          <span aria-hidden="true">{Icon.eye(15)}</span>
          Comment ça marche
        </strong>
        <GhostButton color="var(--admin-ink)" onClick={onClose}>
          Fermer
        </GhostButton>
      </header>
      <ol>
        <li>
          <strong>Choisissez une palette</strong>
          {' '}— l’aperçu à droite se met à jour tout de suite.
        </li>
        <li>
          <strong>Regardez les couleurs</strong>
          {' '}pour comprendre ce qui change (boutons, fond, textes). Elles restent protégées pour éviter les contrastes illisibles.
        </li>
        <li>
          <strong>Ajustez les polices</strong>
          {' '}si besoin (ensemble prêt à l’emploi, ou à la carte).
        </li>
        <li>
          <strong>Enregistrez</strong>
          {' '}pour garder l’apparence. Vérifiez ensuite le site public.
        </li>
      </ol>
    </section>
  )
}

export function ThemeEditor() {
  const { themeId, setThemeId, fontId, setFontId, theme: t, content, dataSource, saveApparenceFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const [tab, setTab] = useState<ThemeTab>('palettes')
  const [previewSize, setPreviewSize] = useState<PreviewSize>('bureau')
  const [guideOpen, setGuideOpen] = useState(false)
  const tabsId = useId()

  const markDirty = () => {
    setPending(true)
    setSaveStatus('idle')
    setSaveErr(undefined)
  }

  const save = async () => {
    if (dataSource !== 'supabase') {
      setSaveStatus('saved')
      setPending(false)
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }
    setSaveStatus('saving')
    setSaveErr(undefined)
    const res = await saveApparenceFields({ themeId, fontId })
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.error)
    if (res.ok) setPending(false)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const activeTheme = THEMES[themeId] ?? Object.values(THEMES)[0]
  const activeLot = lotParId(lotDepuisFontId(fontId))
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0]
  const restaurant = content.restaurantName || 'Greatlife'
  const heroTitle = content.heroTitle || 'Une cuisine libre, solaire et généreuse.'
  const slogan = content.slogan || 'Une identité visuelle qui suit votre histoire.'
  const syncLabel = dataSource === 'supabase' ? 'Synchronisé' : 'Aperçu local'

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Thème & ambiance"
        subtitle="Palette, couleurs et polices — l’apparence de votre restaurant, sans jargon."
        actions={
          <>
            <GhostButton
              color={t.primary}
              aria-expanded={guideOpen}
              aria-controls="theme-guide"
              onClick={() => setGuideOpen((v) => !v)}
            >
              {Icon.eye(15)} Comment ça marche
            </GhostButton>
            <SaveBar status={saveStatus} error={saveErr} />
            <PrimaryButton onClick={() => void save()} disabled={saveStatus === 'saving'}>
              {pending ? 'Enregistrer les changements' : 'Enregistrer'}
            </PrimaryButton>
          </>
        }
      />

      {guideOpen && <ThemeGuide onClose={() => setGuideOpen(false)} />}

      <div className="admin-wf-site-status" role="status">
        <div>
          <span className="admin-wf-eyebrow">Apparence active</span>
          <strong>{activeTheme?.label ?? 'Palette'}</strong>
          <small>
            Polices : {activeLot.label}
            {' · '}
            {syncLabel}
            {pending ? ' · Modifications non enregistrées' : ''}
          </small>
        </div>
        <span className="admin-theme-swatches" aria-hidden="true">
          {[activeTheme?.primary, activeTheme?.accent, activeTheme?.gold, activeTheme?.bg].filter(Boolean).map((c, i) => (
            <span key={i} className="admin-theme-swatch" style={{ background: c }} />
          ))}
        </span>
      </div>

      <div className="admin-wf-theme-workspace">
        <aside className="admin-wf-theme-sidebar">
          <div className="admin-wf-theme-tabs admin-segment" role="tablist" aria-label="Sections de l’apparence">
            {TABS.map((item) => {
              const selected = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  className={`admin-segment-btn${selected ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div
            className="admin-wf-panel"
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-${tab}`}
          >
            <div className="admin-wf-panel-head admin-wf-theme-panel-head">
              <div>
                <h2 className="admin-section-title" style={{ margin: 0 }}>{activeTab.label}</h2>
                <p className="admin-wf-theme-panel-blurb">{activeTab.blurb}</p>
              </div>
            </div>

            {tab === 'palettes' && (
              <div className="admin-wf-theme-presets" role="listbox" aria-label="Palettes de couleurs">
                {Object.values(THEMES).map((th) => {
                  const actif = themeId === th.id
                  return (
                    <button
                      key={th.id}
                      type="button"
                      role="option"
                      aria-selected={actif}
                      className={`admin-wf-theme-preset${actif ? ' is-selected' : ''}`}
                      onClick={() => { setThemeId(th.id); markDirty() }}
                    >
                      <span className="admin-wf-theme-preset-swatch" aria-hidden="true">
                        {[th.primary, th.accent, th.gold, th.bg].map((c, i) => (
                          <span key={i} style={{ background: c }} />
                        ))}
                      </span>
                      <span className="admin-wf-theme-preset-copy">
                        <strong>{th.label}</strong>
                        <small>{THEME_BLURBS[th.id] ?? 'Palette Greatlife'}</small>
                      </span>
                      {actif && (
                        <span className="admin-wf-theme-preset-check" aria-hidden="true">
                          {Icon.check(16, 'var(--admin-forest)')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {tab === 'couleurs' && (
              <div className="admin-wf-theme-controls">
                <p className="admin-wf-theme-inline-help">
                  Ces teintes viennent de la palette «{'\u00a0'}{activeTheme.label}{'\u00a0'}».
                  Pas d’édition libre : cela protège la lisibilité pour vos clients.
                </p>
                <ul className="admin-wf-theme-color-list">
                  {COLOR_ROLES.map((role) => {
                    const value = activeTheme[role.key]
                    return (
                      <li key={role.key} className="admin-wf-theme-color-row">
                        <span
                          className="admin-wf-theme-color-chip"
                          style={{ background: value }}
                          aria-hidden="true"
                        />
                        <span className="admin-wf-theme-color-meta">
                          <strong>{role.label}</strong>
                          <small>{role.help}</small>
                        </span>
                        <code className="admin-wf-theme-color-hex" title={value}>{value}</code>
                      </li>
                    )
                  })}
                </ul>
                <div className="admin-wf-theme-contrast">
                  {Icon.eye(16, 'var(--admin-forest)')}
                  <span>
                    <strong>Contraste protégé</strong>
                    <small>Chaque palette a été vérifiée pour rester lisible (texte sur fond).</small>
                  </span>
                </div>
                <GhostButton color={t.primary} onClick={() => setTab('palettes')}>
                  Changer de palette
                </GhostButton>
              </div>
            )}

            {tab === 'polices' && (
              <div className="admin-wf-theme-typo">
                <TypoPanel onLotApplique={(id) => { setFontId(id); markDirty() }} />
                <div className="admin-wf-theme-contrast">
                  {Icon.type(16, 'var(--admin-forest)')}
                  <span>
                    <strong>{activeLot.label}</strong>
                    <small>{activeLot.sample ?? 'Aperçu de la paire titres / textes'}</small>
                  </span>
                </div>
              </div>
            )}

            {tab === 'ambiance' && (
              <div className="admin-wf-theme-coming">
                <div className="admin-wf-theme-coming-icon" aria-hidden="true">
                  {Icon.palette(22, 'var(--admin-forest)')}
                </div>
                <h3>Déjà calée sur votre palette</h3>
                <p>
                  Espacements, coins arrondis et ombres suivent la charte console Greatlife
                  pour rester cohérents avec le site publié. Pas de réglage séparé pour l’instant —
                  cela évite les écarts entre l’aperçu et ce que voient vos clients.
                </p>
                <GhostButton color={t.primary} onClick={() => setTab('palettes')}>
                  Revenir aux palettes
                </GhostButton>
              </div>
            )}

            {tab === 'elements' && (
              <div className="admin-wf-theme-coming">
                <div className="admin-wf-theme-coming-icon" aria-hidden="true">
                  {Icon.layout(22, 'var(--admin-forest)')}
                </div>
                <h3>Boutons et cartes suivent le thème</h3>
                <p>
                  Les variantes de boutons, cartes et en-tête sont définies par la palette active
                  et le contenu du site. Un explorateur de variantes arrivera plus tard —
                  sans inventer d’options fictives aujourd’hui.
                </p>
                <div className="admin-wf-theme-coming-actions">
                  <GhostButton color={t.primary} onClick={() => setTab('palettes')}>
                    Choisir une palette
                  </GhostButton>
                  <GhostButton
                    color={t.muted}
                    onClick={() => {
                      setPreviewSize('bureau')
                      document.querySelector('.admin-wf-theme-preview-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }}
                  >
                    Voir l’aperçu
                  </GhostButton>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="admin-wf-theme-preview-canvas">
          <div className="admin-wf-theme-canvas-toolbar">
            <span className="admin-wf-theme-canvas-label">
              {Icon.eye(15)} Aperçu en direct
            </span>
            <div className="admin-wf-theme-preview-tools" role="group" aria-label="Taille de l’aperçu">
              <div className="admin-segment admin-wf-theme-size-segment">
                {([
                  { id: 'bureau' as const, label: 'Bureau' },
                  { id: 'telephone' as const, label: 'Téléphone' },
                ]).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-segment-btn${previewSize === item.id ? ' is-active' : ''}`}
                    aria-pressed={previewSize === item.id}
                    onClick={() => setPreviewSize(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <GhostButton color={t.primary} onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}>
                Voir le site
              </GhostButton>
            </div>
          </div>

          <div
            className={`admin-wf-theme-preview-frame is-${previewSize}`}
            data-preview-size={previewSize}
          >
            <div
              className="admin-wf-live-theme"
              style={{
                background: t.bg,
                color: t.text,
                fontFamily: 'var(--f-body, var(--admin-font-body))',
              }}
            >
              <div className="admin-wf-live-header" style={{ background: t.surface, color: t.heading }}>
                <strong style={{ fontFamily: 'var(--f-heading, var(--admin-font-display))' }}>
                  {restaurant.toUpperCase()}
                </strong>
                <nav aria-hidden="true">
                  <span>Menu</span>
                  <span>Notre histoire</span>
                  <span>Réserver</span>
                </nav>
                <span
                  className="admin-wf-live-cta"
                  style={{ background: t.primary, color: '#fff' }}
                >
                  Réserver
                </span>
              </div>
              <div
                className="admin-wf-live-hero"
                style={{ background: `linear-gradient(160deg, ${t.surface} 0%, ${t.bg} 100%)` }}
              >
                <small style={{ color: t.muted }}>
                  {(activeTheme.label || 'Thème').toUpperCase()} · APERÇU
                </small>
                <h1 style={{ color: t.heading, fontFamily: 'var(--f-heading, var(--admin-font-display))' }}>
                  {heroTitle}
                </h1>
                <p style={{ color: t.muted }}>{slogan}</p>
                <span
                  className="admin-wf-live-cta is-hero"
                  style={{ background: t.primary, color: '#fff' }}
                >
                  Découvrir la carte
                </span>
              </div>
              <div className="admin-wf-live-cards">
                <article style={{ background: t.surface, borderColor: `${t.primary}22` }}>
                  {Icon.image(18, t.primary)}
                  <strong style={{ color: t.heading }}>Carte de saison</strong>
                  <span style={{ color: t.muted }}>Des détails lisibles et une mise en page chaleureuse.</span>
                </article>
                <article style={{ background: t.surface, borderColor: `${t.primary}22` }}>
                  {Icon.star(18)}
                  <strong style={{ color: t.heading }}>Une table vivante</strong>
                  <span style={{ color: t.muted }}>Des éléments cohérents sur chaque page.</span>
                </article>
              </div>
            </div>
          </div>

          <div className="admin-wf-theme-status">
            <span>
              <i className="admin-wf-dot" aria-hidden="true" />
              {activeTheme.label} actif
              {pending ? ' · à enregistrer' : ''}
            </span>
            <small>Contraste validé · Aperçu {previewSize === 'telephone' ? 'mobile' : 'bureau'}</small>
          </div>
        </main>
      </div>
    </div>
  )
}
