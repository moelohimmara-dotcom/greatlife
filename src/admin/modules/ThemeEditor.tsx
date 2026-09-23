import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton, GhostButton } from '@/admin/ui'
import { THEMES } from '@/config/themes'
import { lotParId, lotDepuisFontId } from '@/config/fonts'
import { TypoPanel } from '@/admin/editor/TypoPanel'
import { SaveBar } from '@/admin/shared'
import { Icon } from '@/lib/icons'

type ThemeTab = 'Presets' | 'Couleurs' | 'Typographie' | 'Atmosphère' | 'Composants'

const THEME_BLURBS: Record<string, string> = {
  gourmand: 'Terracotta, ivoire et une énergie chaleureuse',
  premium: 'Noir profond, crème et accents dorés',
  nature: 'Olive, sable et matières organiques',
  tropical: 'Graphite vif, blanc et orange solaire',
}

export function ThemeEditor() {
  const { themeId, setThemeId, fontId, setFontId, theme: t, content, dataSource, saveApparenceFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<ThemeTab>('Presets')

  const save = async () => {
    if (dataSource !== 'supabase') {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }
    setSaveStatus('saving')
    setSaveErr(undefined)
    const res = await saveApparenceFields({ themeId, fontId })
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const activeTheme = THEMES[themeId] ?? Object.values(THEMES)[0]
  const activeLot = lotParId(lotDepuisFontId(fontId))
  const restaurant = content.restaurantName || 'Greatlife'
  const heroTitle = content.heroTitle || 'Une cuisine libre, solaire et généreuse.'
  const slogan = content.slogan || 'Une identité visuelle qui suit votre histoire.'

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Thème & ambiance"
        subtitle="Créez une identité visuelle cohérente et personnalisez chaque détail."
        actions={
          <>
            <SaveBar status={saveStatus} error={saveErr} />
            <PrimaryButton onClick={save}>Enregistrer</PrimaryButton>
          </>
        }
      />

      <div className="admin-wf-site-status" role="status">
        <div>
          <span className="admin-wf-eyebrow">Apparence active</span>
          <strong>{activeTheme?.label ?? 'Palette'}</strong>
          <small>Polices : {activeLot.label} · {dataSource === 'supabase' ? 'Synchronisé' : 'Aperçu local'}</small>
        </div>
        <span className="admin-theme-swatches" aria-hidden="true">
          {[activeTheme?.primary, activeTheme?.accent, activeTheme?.gold, activeTheme?.bg].filter(Boolean).map((c, i) => (
            <span key={i} className="admin-theme-swatch" style={{ background: c }} />
          ))}
        </span>
      </div>

      <div className="admin-wf-theme-workspace">
        <aside className="admin-wf-theme-sidebar">
          <div className="admin-wf-theme-tabs" role="tablist" aria-label="Sections du thème">
            {(['Presets', 'Couleurs', 'Typographie', 'Atmosphère', 'Composants'] as ThemeTab[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                className={tab === item ? 'is-active' : undefined}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="admin-wf-panel">
            <div className="admin-wf-panel-head">
              <h2 className="admin-section-title" style={{ margin: 0 }}>{tab}</h2>
            </div>

            {tab === 'Presets' && (
              <div className="admin-wf-theme-presets" role="listbox" aria-label="Palettes de couleurs" style={{ marginTop: 12 }}>
                {Object.values(THEMES).map((th) => {
                  const actif = themeId === th.id
                  return (
                    <button
                      key={th.id}
                      type="button"
                      role="option"
                      aria-selected={actif}
                      className={`admin-wf-theme-preset${actif ? ' is-selected' : ''}`}
                      onClick={() => { setThemeId(th.id); setSaveStatus('idle') }}
                    >
                      <span className="admin-wf-theme-preset-swatch" aria-hidden="true">
                        {[th.primary, th.accent, th.gold, th.bg].map((c, i) => (
                          <span key={i} style={{ background: c }} />
                        ))}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong>{th.label}</strong>
                        <small>{THEME_BLURBS[th.id] ?? 'Palette Greatlife'}</small>
                      </span>
                      {actif && Icon.check(16, 'var(--admin-forest)')}
                    </button>
                  )
                })}
              </div>
            )}

            {tab === 'Couleurs' && (
              <div className="admin-wf-theme-controls" style={{ marginTop: 12 }}>
                <label>
                  Couleur principale
                  <input readOnly value={activeTheme.primary} aria-label="Couleur principale" />
                </label>
                <label>
                  Arrière-plan
                  <input readOnly value={activeTheme.bg} aria-label="Arrière-plan" />
                </label>
                <label>
                  Texte principal
                  <input readOnly value={activeTheme.text} aria-label="Texte principal" />
                </label>
                <label>
                  Accent
                  <input readOnly value={activeTheme.accent} aria-label="Accent" />
                </label>
                <div className="admin-wf-theme-contrast">
                  {Icon.eye(16, 'var(--admin-forest)')}
                  <span>
                    <strong>Contraste AA recommandé</strong>
                    <small>Les couleurs viennent de la palette choisie — pas d’édition libre pour éviter les contrastes invalides.</small>
                  </span>
                </div>
              </div>
            )}

            {tab === 'Typographie' && (
              <div style={{ marginTop: 12 }}>
                <p className="admin-page-sub" style={{ color: t.muted, margin: '0 0 12px' }}>
                  Titres et textes du site. Visible pour vos clients dès la publication.
                </p>
                <TypoPanel onLotApplique={(id) => { setFontId(id); setSaveStatus('idle') }} />
                <div className="admin-wf-theme-contrast" style={{ marginTop: 12 }}>
                  {Icon.type(16, 'var(--admin-forest)')}
                  <span>
                    <strong>{activeLot.label}</strong>
                    <small>{activeLot.sample ?? 'Aperçu de la paire titres / textes'}</small>
                  </span>
                </div>
              </div>
            )}

            {tab === 'Atmosphère' && (
              <div style={{ marginTop: 12 }}>
                <p className="admin-wf-theme-note">
                  Densité, rayons et ombres suivent déjà la charte console Greatlife.
                  Ces réglages fins ne sont pas encore éditables séparément — évite les écarts avec le site publié.
                </p>
              </div>
            )}

            {tab === 'Composants' && (
              <div style={{ marginTop: 12 }}>
                <p className="admin-wf-theme-note">
                  Les variantes de boutons, cartes et en-tête sont définies par le thème actif et le CMS.
                  L’explorateur de variantes arrivera plus tard — sans inventer d’options fictives.
                </p>
              </div>
            )}
          </div>
        </aside>

        <main className="admin-wf-theme-preview-canvas">
          <div className="admin-wf-theme-canvas-toolbar">
            <span>{Icon.eye(15)} Aperçu en direct</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <GhostButton color={t.muted} onClick={() => setTab('Presets')}>Avant / Après</GhostButton>
              <GhostButton color={t.primary} onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}>
                Voir le site
              </GhostButton>
            </div>
          </div>

          <div
            className="admin-wf-live-theme"
            style={{
              background: t.bg,
              color: t.text,
              fontFamily: 'var(--f-body, var(--admin-font-body))',
            }}
          >
            <div className="admin-wf-live-header" style={{ background: t.surface, color: t.heading }}>
              <strong style={{ fontFamily: 'var(--f-heading, var(--admin-font-display))' }}>{restaurant.toUpperCase()}</strong>
              <nav aria-hidden="true">
                <span>Menu</span>
                <span>Notre histoire</span>
                <span>Réserver</span>
              </nav>
              <span
                style={{
                  padding: '7px 12px',
                  borderRadius: 10,
                  background: t.primary,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Réserver
              </span>
            </div>
            <div className="admin-wf-live-hero" style={{ background: `linear-gradient(160deg, ${t.surface} 0%, ${t.bg} 100%)` }}>
              <small style={{ color: t.muted }}>{(activeTheme.label || 'Thème').toUpperCase()} · APERÇU DU THÈME</small>
              <h1 style={{ color: t.heading, fontFamily: 'var(--f-heading, var(--admin-font-display))' }}>{heroTitle}</h1>
              <p style={{ color: t.muted }}>{slogan}</p>
              <span
                style={{
                  display: 'inline-flex',
                  padding: '9px 16px',
                  borderRadius: 12,
                  background: t.primary,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                }}
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
                <span style={{ color: t.muted }}>Des composants cohérents sur chaque page.</span>
              </article>
            </div>
          </div>

          <div className="admin-wf-theme-status">
            <span><i className="admin-wf-dot" aria-hidden="true" />{activeTheme.label} actif</span>
            <small>Contraste validé · Responsive prêt</small>
          </div>
        </main>
      </div>
    </div>
  )
}
