import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, PrimaryButton, GhostButton } from '@/admin/ui'
import { SaveBar } from '@/admin/shared'

const PAGE_ROWS: ReadonlyArray<{ key: string; label: string; help: string }> = [
  { key: 'home', label: 'Accueil', help: 'Page d’entrée du site' },
  { key: 'carte', label: 'La carte', help: 'Plats et prix publics' },
  { key: 'histoire', label: 'Notre histoire', help: 'Section récit' },
  { key: 'engagements', label: 'Engagements', help: 'Valeurs du restaurant' },
  { key: 'equipe', label: 'Équipe', help: 'Membres présentés' },
  { key: 'localisation', label: 'Localisation', help: 'Adresse et carte' },
  { key: 'contact', label: 'Contact', help: 'Formulaire et coordonnées' },
  { key: 'blog', label: 'Blog', help: 'Articles publiés' },
]

const EXTRA_ROWS: ReadonlyArray<{ key: 'vertusPanel' | 'suggestions' | 'testimonials' | 'badges'; label: string; help: string }> = [
  { key: 'vertusPanel', label: 'Panneau « Vertus »', help: 'Détails nutritionnels dépliables' },
  { key: 'suggestions', label: 'Suggestions du moment', help: 'Mise en avant saisonnière' },
  { key: 'testimonials', label: 'Témoignages', help: 'Avis clients sur le site' },
  { key: 'badges', label: 'Badges régime & allergènes', help: 'Légende des régimes' },
]

export function VisibilityEditor() {
  const { visibility, setVisibility, theme: t, dataSource, saveApparenceFields, content } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  const toggle = (k: string) => {
    setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } })
    setPending(true)
    setSaveStatus('idle')
    setSaveErr(undefined)
  }

  const toggleExtra = (k: typeof EXTRA_ROWS[number]['key']) => {
    setVisibility({ ...visibility, [k]: !visibility[k] })
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
    const res = await saveApparenceFields({ visibility })
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.error)
    if (res.ok) {
      setPending(false)
      setNotice('Visibilité enregistrée.')
    }
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const sectionsOn = PAGE_ROWS.filter((r) => visibility.sections[r.key]).length
  const extrasOn = EXTRA_ROWS.filter((r) => visibility[r.key]).length
  const essentialsOk = Boolean(content.restaurantName?.trim() && content.phone?.trim() && content.address?.trim())

  const checks: ReadonlyArray<{ ok: boolean; label: string; action: string }> = [
    {
      ok: sectionsOn >= 4,
      label: 'Les pages importantes sont visibles',
      action: sectionsOn >= 4 ? 'Voir' : 'Corriger',
    },
    {
      ok: extrasOn > 0,
      label: 'Éléments de contenu configurés',
      action: extrasOn > 0 ? 'Voir' : 'Corriger',
    },
    {
      ok: essentialsOk,
      label: 'Coordonnées essentielles renseignées',
      action: essentialsOk ? 'Voir' : 'Corriger',
    },
    {
      ok: Boolean(visibility.sections.carte),
      label: 'La carte est visible pour les visiteurs',
      action: visibility.sections.carte ? 'Voir' : 'Corriger',
    },
  ]

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Visibilité"
        subtitle="Contrôlez ce que vos visiteurs voient avant et après publication."
        actions={(
          <>
            <SaveBar status={saveStatus} error={saveErr} />
            <PrimaryButton onClick={() => void save()}>Publier les modifications</PrimaryButton>
          </>
        )}
      />

      {notice ? <div className="admin-status-live is-ok" role="status">{notice}</div> : null}

      <div className="admin-wf-site-status" aria-label="Statut du site">
        <div>
          <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Statut du site</p>
          <strong>{dataSource === 'supabase' ? 'Site publié' : 'Aperçu local'}</strong>
          <small>
            {sectionsOn} section{sectionsOn > 1 ? 's' : ''} visible{sectionsOn > 1 ? 's' : ''}
            {content.restaurantName ? ` · ${content.restaurantName}` : ''}
          </small>
        </div>
        <span className="admin-chip is-live"><i />En ligne</span>
      </div>

      <div className="admin-wf-visibility-grid">
        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Pages</span>
              <h2>Pages et visibilité</h2>
            </div>
            <span className="admin-chip">{sectionsOn}/{PAGE_ROWS.length}</span>
          </div>
          <div className="admin-wf-page-visibility-list">
            {PAGE_ROWS.map((row) => {
              const on = Boolean(visibility.sections[row.key])
              return (
                <div className="admin-wf-page-visibility-item" key={row.key}>
                  <div>
                    <strong>{row.label}</strong>
                    <small>{on ? 'Visible' : 'Masquée'} · {on ? 'dans la navigation' : 'hors navigation'} · {row.help}</small>
                  </div>
                  <label className="admin-wf-switch">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(row.key)}
                      aria-label={`${row.label} — ${on ? 'visible' : 'masquée'}`}
                    />
                    <span />
                  </label>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Programmation</span>
              <h2>Publication planifiée</h2>
            </div>
          </div>
          <div className="admin-wf-schedule-card">
            {Icon.calendar(26, 'var(--admin-forest)')}
            <div>
              <strong>Aucune publication programmée</strong>
              <small>La programmation n’est pas encore disponible — publiez immédiatement via « Publier les modifications ».</small>
            </div>
            <GhostButton
              color={t.muted}
              onClick={() => setNotice('La programmation arrive plus tard — enregistrez pour appliquer maintenant.')}
            >
              Programmer
            </GhostButton>
          </div>
        </section>
      </div>

      <div className="admin-wf-visibility-grid">
        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Contenu</span>
              <h2>Éléments de contenu</h2>
            </div>
            <span className="admin-chip">{extrasOn}/{EXTRA_ROWS.length}</span>
          </div>
          <div className="admin-wf-page-visibility-list">
            {EXTRA_ROWS.map((row) => {
              const on = Boolean(visibility[row.key])
              return (
                <div className="admin-wf-page-visibility-item" key={row.key}>
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.help}</small>
                  </div>
                  <label className="admin-wf-switch">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleExtra(row.key)}
                      aria-label={row.label}
                    />
                    <span />
                  </label>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Contrôle</span>
              <h2>Checklist avant publication</h2>
            </div>
          </div>
          <div className="admin-wf-publish-checks">
            {checks.map((c) => (
              <div key={c.label}>
                <span aria-hidden="true" style={{ color: c.ok ? 'var(--admin-forest)' : 'var(--admin-saffron)' }}>
                  {c.ok ? Icon.check(17) : Icon.eye(17)}
                </span>
                <span>{c.label}</span>
                <button type="button" onClick={() => setNotice(c.ok ? `${c.label} — OK` : `À corriger : ${c.label}`)}>
                  {c.action}
                </button>
              </div>
            ))}
          </div>
          <div className="admin-hint-box" style={{ marginTop: 14 }}>
            Les changements s’appliquent après enregistrement. Masquer une section la retire de la navigation publique.
            {pending ? ' Des modifications attendent d’être enregistrées.' : ''}
          </div>
        </section>
      </div>
    </div>
  )
}
