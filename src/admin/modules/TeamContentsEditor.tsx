import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SaveBar } from '@/admin/shared'

const ENGAGEMENT_ICONS = ['leaf', 'recycle', 'fire', 'search', 'coin', 'star']

export function TeamContentsEditor() {
  const { content, setContent, theme: t, dataSource, saveContentFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<'team' | 'engagements' | 'testimonials'>('team')
  const inp = inputStyle(t)

  const setTeam = (team: typeof content.team) => { setContent({ ...content, team }); setSaveStatus('idle'); setSaveErr(undefined) }
  const setEngagements = (engagements: typeof content.engagements) => { setContent({ ...content, engagements }); setSaveStatus('idle'); setSaveErr(undefined) }
  const setTestimonials = (testimonials: typeof content.testimonials) => { setContent({ ...content, testimonials }); setSaveStatus('idle'); setSaveErr(undefined) }

  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    
    const res = await saveContentFields({
      team: content.team,
      engagements: content.engagements,
      testimonials: content.testimonials,
    })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const tabs: [string, string][] = [['team', 'Équipe'], ['engagements', 'Engagements'], ['testimonials', 'Témoignages']]

  return (
    <div className="admin-page-wide">
      <PageHeader title="Équipe & contenus" subtitle="Gérez l’équipe, les engagements et les témoignages du restaurant."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-wf-menu-summary" aria-label="Résumé des contenus">
        <div>
          <strong>{content.team.length}</strong>
          <span>Membres</span>
          <small>équipe</small>
        </div>
        <div>
          <strong>{content.engagements.length}</strong>
          <span>Engagements</span>
          <small>sur le site</small>
        </div>
        <div>
          <strong>{content.testimonials.length}</strong>
          <span>Témoignages</span>
          <small>avis clients</small>
        </div>
        <div className="is-status">
          <strong>●</strong>
          <span>{dataSource === 'supabase' ? 'Synchronisé' : 'Aperçu local'}</span>
          <small>section {tabs.find(([k]) => k === tab)?.[1]}</small>
        </div>
      </div>
      <div className="admin-segment" role="tablist" aria-label="Sections équipe et contenus">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={`admin-segment-btn${tab === k ? ' is-active' : ''}`}
            onClick={() => setTab(k as 'team' | 'engagements' | 'testimonials')}
          >
            {l} <span className="admin-segment-count">{k === 'team' ? content.team.length : k === 'engagements' ? content.engagements.length : content.testimonials.length}</span>
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <div className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Équipe</span>
              <h2 style={{ margin: '4px 0 0' }}>Membres de l’équipe</h2>
            </div>
          </div>
          <div className="admin-wf-table" role="table" aria-label="Membres">
            <div className="admin-wf-table-row is-head" role="row">
              <span role="columnheader">Nom</span>
              <span role="columnheader">Rôle</span>
              <span role="columnheader">Description</span>
              <span role="columnheader">Actions</span>
            </div>
            {content.team.map((m, i) => (
              <div key={i} className="admin-wf-table-row is-team" role="row">
                <Input value={m.name} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={inp} aria-label={`Nom membre ${i + 1}`} />
                <Input value={m.role} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} style={inp} aria-label={`Rôle membre ${i + 1}`} />
                <Input value={m.desc} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} style={inp} aria-label={`Description membre ${i + 1}`} />
                <GhostButton color="var(--admin-coral)" onClick={() => setTeam(content.team.filter((_, j) => j !== i))}>
                  {Icon.trash(12, 'var(--admin-coral)')} Retirer
                </GhostButton>
              </div>
            ))}
          </div>
          {content.team.length === 0 && <EmptyState title="Aucun membre" subtitle="Ajoutez les personnes présentées sur le site." />}
          <button type="button" className="admin-add-dashed" style={{ marginTop: 12 }} onClick={() => setTeam([...content.team, { name: 'Nouveau membre', role: 'Rôle', desc: '' }])}>
            {Icon.plus(14, 'var(--admin-forest)')} Ajouter un membre
          </button>
        </div>
      )}

      {tab === 'engagements' && (
        <div className="admin-content-stack">
          {content.engagements.map((e, i) => (
            <div key={i} className="admin-content-card">
              <div className="admin-grid-icon-title">
                <div><FieldLabel>Icône</FieldLabel>
                  <Select value={e.icon} onValueChange={v => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, icon: v } : x))}>
                    <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-paper-muted)', padding: '10px 12px', minHeight: 44 }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><FieldLabel>Titre</FieldLabel><Input value={e.title} onChange={ev => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} style={inp} /></div>
              </div>
              <div><FieldLabel>Description</FieldLabel><Textarea rows={2} value={e.desc} onChange={ev => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, desc: ev.target.value } : x))} style={inp} /></div>
              <div className="admin-ops-actions" style={{ justifyContent: 'flex-end' }}>
                <GhostButton color="var(--admin-coral)" onClick={() => setEngagements(content.engagements.filter((_, j) => j !== i))}>{Icon.trash(12, 'var(--admin-coral)')} Retirer</GhostButton>
              </div>
            </div>
          ))}
          <button type="button" className="admin-add-dashed" onClick={() => setEngagements([...content.engagements, { icon: 'leaf', title: 'Nouvel engagement', desc: '' }])}>
            {Icon.plus(14, 'var(--admin-forest)')} Ajouter un engagement
          </button>
        </div>
      )}

      {tab === 'testimonials' && (
        <div className="admin-content-stack">
          {content.testimonials.length === 0 && <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun témoignage" subtitle="Ajoutez les avis de vos clients ; ils apparaîtront sur le site (si activés dans Visibilité)." />}
          {content.testimonials.map((tm, i) => (
            <div key={i} className="admin-content-card">
              <div><FieldLabel>Auteur</FieldLabel><Input value={tm.author} onChange={e => setTestimonials(content.testimonials.map((x, j) => j === i ? { ...x, author: e.target.value } : x))} style={inp} /></div>
              <div><FieldLabel>Témoignage</FieldLabel><Textarea rows={3} value={tm.text} onChange={e => setTestimonials(content.testimonials.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} style={inp} /></div>
              <div className="admin-ops-actions" style={{ justifyContent: 'flex-end' }}>
                <GhostButton color="var(--admin-coral)" onClick={() => setTestimonials(content.testimonials.filter((_, j) => j !== i))}>{Icon.trash(12, 'var(--admin-coral)')} Retirer</GhostButton>
              </div>
            </div>
          ))}
          <button type="button" className="admin-add-dashed" onClick={() => setTestimonials([...content.testimonials, { author: 'Client', text: '' }])}>
            {Icon.plus(14, 'var(--admin-forest)')} Ajouter un témoignage
          </button>
        </div>
      )}
    </div>
  )
}

