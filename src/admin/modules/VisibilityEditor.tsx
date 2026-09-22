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
  return (
    <div className="admin-page" style={{ maxWidth: 640 }}>
      <PageHeader title="Visibilité" subtitle="Affichez ou masquez des éléments du site en un clic."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-settings-section" style={{ marginTop: 20 }}>
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
      <div className="admin-settings-section">
        <SectionTitle color={t.accent}>Éléments de contenu</SectionTitle>
        <div style={{ marginTop: 12 }}>
          {(['vertusPanel', 'suggestions', 'testimonials', 'badges'] as const).map(k => (
            <div key={k} className="admin-toggle-row">
              <span className="admin-toggle-row-label">{k === 'vertusPanel' ? 'Panneau « Vertus » dépliable' : k === 'suggestions' ? 'Suggestions du moment' : k === 'testimonials' ? 'Témoignages' : 'Badges régime & allergènes'}</span>
              <Switch checked={visibility[k]} onCheckedChange={() => toggleExtra(k)} />
            </div>
          ))}
        </div>
      </div>
      <div className="admin-hint-box">
        Les changements sont appliqués en direct sur le site après enregistrement.
      </div>
    </div>
  )
}

