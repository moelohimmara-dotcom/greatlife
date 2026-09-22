import React, { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, FieldLabel, inputStyle, PrimaryButton } from '@/admin/ui'
import { Textarea } from '@/components/ui/textarea'
import { SaveBar, SectionTitle } from '@/admin/shared'

export function FormsConfig() {
  const { content, setContent, theme: t, dataSource, saveContentFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle'); setSaveErr(undefined) }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)

    const res = await saveContentFields({ autoReply: content.autoReply })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const replyReady = Boolean(content.autoReply?.trim())
  const contactReady = Boolean(content.emailContact?.trim())
  const resaReady = Boolean(content.emailReservation?.trim())
  return (
    <div className="admin-page" style={{ maxWidth: 800 }}>
      <PageHeader title="Formulaires & emails" subtitle="L'auto-réponse envoyée aux visiteurs, et le chemin de la notification."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-wf-menu-summary" aria-label="État des formulaires">
        <div>
          <strong>{replyReady ? 'Oui' : 'Non'}</strong>
          <span>Auto-réponse</span>
          <small>{replyReady ? 'texte renseigné' : 'à compléter'}</small>
        </div>
        <div>
          <strong>{contactReady ? 'Oui' : 'Non'}</strong>
          <span>Destinataire messages</span>
          <small>{contactReady ? content.emailContact : 'réglages globaux'}</small>
        </div>
        <div>
          <strong>{resaReady ? 'Oui' : 'Non'}</strong>
          <span>Destinataire réservations</span>
          <small>{resaReady ? content.emailReservation : 'réglages globaux'}</small>
        </div>
        <div className="is-status">
          <strong>●</strong>
          <span>{dataSource === 'supabase' ? 'En ligne' : 'Aperçu local'}</span>
          <small>pipeline actif</small>
        </div>
      </div>
      <div className="admin-wf-panel" style={{ marginBottom: 14 }}>
        <SectionTitle color={t.accent}>Auto-réponse</SectionTitle>
        <div style={{ marginTop: 12 }}>
          <FieldLabel>Template d'auto-réponse (variable : {`{nom}`})</FieldLabel>
          <Textarea rows={4} value={content.autoReply} onChange={e => set('autoReply', e.target.value)} style={inp} />
        </div>
        <p className="admin-page-sub" style={{ color: t.muted, marginTop: 10 }}>
          Les destinataires se règlent dans « Réglages du restaurant », section « Destinataires & notifications ».
        </p>
      </div>
      <div className="admin-wf-panel">
        <SectionTitle color={t.gold}>Pipeline d'envoi</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: t.muted, fontWeight: 500, marginTop: 12 }}>
          {['Soumission', 'Messages', 'Email destinataire', 'Auto-réponse client'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className="admin-chip">{s}</span>
              {i < arr.length - 1 && <span style={{ color: t.muted }}>{Icon.arrow(14, t.muted)}</span>}
            </React.Fragment>
          ))}
        </div>
        <p className="admin-page-sub" style={{ color: t.muted, marginTop: 12, lineHeight: 1.6 }}>
          Historique consultable et exportable depuis le module Messages.
        </p>
      </div>
    </div>
  )
}
