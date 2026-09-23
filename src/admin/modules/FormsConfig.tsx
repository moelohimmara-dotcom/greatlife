import React, { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, FieldLabel, inputStyle, PrimaryButton, GhostButton } from '@/admin/ui'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SaveBar } from '@/admin/shared'

export function FormsConfig() {
  const { content, setContent, theme: t, dataSource, saveContentFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const set = (k: string, v: string) => {
    setContent({ ...content, [k]: v })
    setPending(true)
    setSaveStatus('idle')
    setSaveErr(undefined)
  }
  const inp = inputStyle(t)

  const save = async () => {
    if (dataSource !== 'supabase') {
      setSaveStatus('saved')
      setPending(false)
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }
    setSaveStatus('saving')
    setSaveErr(undefined)
    const res = await saveContentFields({
      autoReply: content.autoReply,
      emailContact: content.emailContact,
      emailReservation: content.emailReservation,
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.error)
    if (res.ok) setPending(false)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const replyReady = Boolean(content.autoReply?.trim())
  const contactReady = Boolean(content.emailContact?.trim())
  const resaReady = Boolean(content.emailReservation?.trim())

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Formulaires & emails"
        subtitle="Configurez les destinataires et les réponses automatiques."
        actions={(
          <>
            <SaveBar status={saveStatus} error={saveErr} />
            <PrimaryButton onClick={() => void save()}>Enregistrer</PrimaryButton>
          </>
        )}
      />

      <div className="admin-wf-site-status" role="status">
        <div>
          <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Pipeline actif</p>
          <strong>{replyReady && contactReady ? 'Prêt à recevoir' : 'À compléter'}</strong>
          <small>
            {contactReady ? content.emailContact : 'Aucun destinataire messages'}
            {resaReady ? ` · résas → ${content.emailReservation}` : ''}
          </small>
        </div>
        <span className={`admin-chip${replyReady && contactReady ? ' is-live' : ' is-warn'}`}>
          {dataSource === 'supabase' ? 'En ligne' : 'Aperçu local'}
        </span>
      </div>

      <div className="admin-wf-menu-summary" aria-label="État des formulaires">
        <div>
          <strong>{replyReady ? 'Oui' : 'Non'}</strong>
          <span>Auto-réponse</span>
          <small>{replyReady ? 'texte renseigné' : 'à compléter'}</small>
        </div>
        <div>
          <strong>{contactReady ? 'Oui' : 'Non'}</strong>
          <span>Destinataire messages</span>
          <small>{contactReady ? content.emailContact : 'manquant'}</small>
        </div>
        <div>
          <strong>{resaReady ? 'Oui' : 'Non'}</strong>
          <span>Destinataire réservations</span>
          <small>{resaReady ? content.emailReservation : 'manquant'}</small>
        </div>
        <div className="is-status">
          <strong>●</strong>
          <span>{pending ? 'Modifs en cours' : 'À jour'}</span>
          <small>{pending ? 'enregistrer' : 'rien à sauver'}</small>
        </div>
      </div>

      <div className="admin-wf-theme-layout">
        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Destinataires</span>
              <h2>Qui reçoit les messages</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div>
              <FieldLabel>Email contact</FieldLabel>
              <Input
                value={content.emailContact}
                onChange={(e) => set('emailContact', e.target.value)}
                style={inp}
                placeholder="contact@…"
              />
            </div>
            <div>
              <FieldLabel>Email réservations</FieldLabel>
              <Input
                value={content.emailReservation}
                onChange={(e) => set('emailReservation', e.target.value)}
                style={inp}
                placeholder="resa@…"
              />
            </div>
            <p className="admin-page-sub" style={{ color: t.muted, margin: 0, lineHeight: 1.5 }}>
              Ces adresses reçoivent une notification à chaque soumission. Elles sont aussi éditables dans Réglages globaux.
            </p>
          </div>
        </section>

        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Réponse automatique</span>
              <h2>Message envoyé aux clients</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div>
              <FieldLabel>Template (variable : {'{nom}'})</FieldLabel>
              <Textarea
                rows={5}
                value={content.autoReply}
                onChange={(e) => set('autoReply', e.target.value)}
                style={inp}
              />
            </div>
            <GhostButton
              color={t.muted}
              onClick={() => set('autoReply', 'Bonjour {nom}, merci pour votre message à Greatlife ! Nous revenons vers vous sous 24h. — L’équipe Greatlife')}
            >
              Restaurer le modèle par défaut
            </GhostButton>
          </div>
        </section>
      </div>

      <div className="admin-wf-panel" style={{ marginTop: 14 }}>
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Parcours</span>
            <h2>Pipeline d’envoi</h2>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: t.muted, fontWeight: 500, marginTop: 4 }}>
          {['Soumission', 'Messages', 'Email destinataire', 'Auto-réponse client'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className="admin-chip">{s}</span>
              {i < arr.length - 1 && <span aria-hidden="true">{Icon.arrow(14, t.muted)}</span>}
            </React.Fragment>
          ))}
        </div>
        <p className="admin-page-sub" style={{ color: t.muted, marginTop: 12, lineHeight: 1.6 }}>
          Historique consultable et exportable depuis le module Messages.
        </p>
      </div>

      {pending ? (
        <div className="admin-wf-dirty-bar" role="status">
          <span>
            <strong>Modifications non enregistrées</strong>
            <small>Destinataires et auto-réponse</small>
          </span>
          <PrimaryButton onClick={() => void save()} busy={saveStatus === 'saving'}>Enregistrer</PrimaryButton>
        </div>
      ) : null}
    </div>
  )
}
