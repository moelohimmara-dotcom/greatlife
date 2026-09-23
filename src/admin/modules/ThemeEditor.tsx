import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton } from '@/admin/ui'
import { THEMES } from '@/config/themes'
import { lotParId, lotDepuisFontId } from '@/config/fonts'
import { TypoPanel } from '@/admin/editor/TypoPanel'
import { SaveBar, SectionTitle } from '@/admin/shared'

export function ThemeEditor() {
  const { themeId, setThemeId, fontId, setFontId, theme: t, content, dataSource, saveApparenceFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveApparenceFields({ themeId, fontId })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const activeTheme = THEMES[themeId] ?? Object.values(THEMES)[0]
  const activeLot = lotParId(lotDepuisFontId(fontId))
  return (
    <div className="admin-page" style={{ maxWidth: 960 }}>
      <PageHeader
        title="Thème & ambiance"
        subtitle="Choisissez l’univers visuel et la typographie de votre site."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
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
      <div className="admin-wf-theme-layout">
        <div className="admin-wf-panel">
          <SectionTitle color={t.primary}>Palette de couleurs</SectionTitle>
          <p className="admin-page-sub" style={{ color: t.muted, margin: '4px 0 12px' }}>Choisissez l’ambiance du restaurant. Une seule palette active à la fois.</p>
          <div className="admin-ops-list" role="listbox" aria-label="Palettes de couleurs">
            {Object.values(THEMES).map(th => {
              const actif = themeId === th.id
              return (
                <button
                  key={th.id}
                  type="button"
                  role="option"
                  aria-selected={actif}
                  className={`admin-theme-row${actif ? ' is-selected' : ''}`}
                  onClick={() => { setThemeId(th.id); setSaveStatus('idle') }}
                >
                  <span className="admin-theme-swatches" aria-hidden="true">
                    {[th.primary, th.accent, th.gold, th.bg].map((c, i) => (
                      <span key={i} className="admin-theme-swatch" style={{ background: c }} />
                    ))}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--admin-ink)' }}>{th.label}</span>
                    {actif && <span className="admin-chip is-live" style={{ marginTop: 6 }}>Active</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <aside className="admin-wf-panel">
          <SectionTitle color={t.gold}>Aperçu</SectionTitle>
          <div className="admin-preview-surface" style={{ marginTop: 12 }}>
            <div style={{ fontFamily: 'var(--f-heading)', fontSize: 28, fontWeight: 700, color: t.heading, letterSpacing: '-0.03em' }}>{content.heroTitle || content.restaurantName}</div>
            <div style={{ fontSize: 14, color: t.muted, marginTop: 8 }}>{content.slogan}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '9px 18px', borderRadius: 12, background: t.primary, color: '#fff', fontSize: 13, fontWeight: 600 }}>Bouton principal</span>
              <span style={{ padding: '9px 18px', borderRadius: 12, background: t.gold, color: '#fff', fontSize: 13, fontWeight: 600 }}>Bouton accent</span>
            </div>
          </div>
        </aside>
      </div>
      <div className="admin-settings-section" style={{ marginTop: 16 }}>
        <SectionTitle color={t.accent}>Polices</SectionTitle>
        <p className="admin-page-sub" style={{ color: t.muted, margin: '4px 0 12px' }}>Titres et textes du site. Visible pour vos clients dès la publication.</p>
        <TypoPanel onLotApplique={(id) => { setFontId(id); setSaveStatus('idle') }} />
      </div>
    </div>
  )
}
