import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton } from '@/admin/ui'
import { Switch } from '@/components/ui/switch'
import { SaveBar, SectionTitle } from '@/admin/shared'

export function VisibilityEditor() {
  const { visibility, setVisibility, theme: t, dataSource, saveApparenceFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const toggle = (k: string) => { setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } }); setSaveStatus('idle'); setSaveErr(undefined) }
  const toggleExtra = (k: string) => { setVisibility({ ...visibility, [k]: !visibility[k as keyof typeof visibility] } as typeof visibility); setSaveStatus('idle'); setSaveErr(undefined) }
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveApparenceFields({ visibility })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const rows: [string, string][] = [['home', 'Accueil'], ['carte', 'La carte'], ['histoire', 'Notre histoire'], ['engagements', 'Engagements'], ['equipe', 'Équipe'], ['localisation', 'Localisation'], ['contact', 'Contact'], ['blog', 'Blog']]
  const extras = (['vertusPanel', 'suggestions', 'testimonials', 'badges'] as const)
  const sectionsOn = rows.filter(([k]) => visibility.sections[k]).length
  const sectionsOff = rows.length - sectionsOn
  const extrasOn = extras.filter((k) => visibility[k]).length
  return (
    <div className="admin-page" style={{ maxWidth: 720 }}>
      <PageHeader title="Visibilité" subtitle="Affichez ou masquez des éléments du site en un clic."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-wf-menu-summary" aria-label="Résumé de la visibilité">
        <div>
          <strong>{sectionsOn}</strong>
          <span>Sections visibles</span>
          <small>sur {rows.length}</small>
        </div>
        <div>
          <strong>{sectionsOff}</strong>
          <span>Sections masquées</span>
          <small>hors navigation</small>
        </div>
        <div>
          <strong>{extrasOn}</strong>
          <span>Éléments actifs</span>
          <small>sur {extras.length}</small>
        </div>
        <div className="is-status">
          <strong>●</strong>
          <span>{dataSource === 'supabase' ? 'Prêt à enregistrer' : 'Aperçu local'}</span>
          <small>effet après enregistrement</small>
        </div>
      </div>
      <div className="admin-wf-theme-layout">
        <div className="admin-wf-panel">
          <SectionTitle color={t.primary}>Sections de page</SectionTitle>
          <div style={{ marginTop: 12 }}>
            {rows.map(([k, l]) => (
              <div key={k} className="admin-toggle-row">
                <span className="admin-toggle-row-label">{l}</span>
                <Switch checked={visibility.sections[k]} onCheckedChange={() => toggle(k)} />
              </div>
            ))}
          </div>
        </div>
        <div className="admin-wf-panel">
          <SectionTitle color={t.accent}>Éléments de contenu</SectionTitle>
          <div style={{ marginTop: 12 }}>
            {extras.map(k => (
              <div key={k} className="admin-toggle-row">
                <span className="admin-toggle-row-label">{k === 'vertusPanel' ? 'Panneau « Vertus » dépliable' : k === 'suggestions' ? 'Suggestions du moment' : k === 'testimonials' ? 'Témoignages' : 'Badges régime & allergènes'}</span>
                <Switch checked={visibility[k]} onCheckedChange={() => toggleExtra(k)} />
              </div>
            ))}
          </div>
          <div className="admin-hint-box" style={{ marginTop: 16 }}>
            Les changements sont appliqués en direct sur le site après enregistrement.
          </div>
        </div>
      </div>
    </div>
  )
}
