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
  return (
    <div style={{ maxWidth: '700px' }}>
      <PageHeader title="Formulaires & emails" subtitle="L'auto-réponse envoyée aux visiteurs, et le chemin de la notification."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ marginTop: 12, marginBottom: 16 }}><SectionTitle color={t.accent}>Auto-réponse</SectionTitle></div>
      <div>
        <FieldLabel>Template d'auto-réponse (variable : {`{nom}`})</FieldLabel>
        <Textarea rows={4} value={content.autoReply} onChange={e => set('autoReply', e.target.value)} style={inp} />
      </div>
      <div style={{ fontSize: '12.5px', color: t.muted, marginBottom: 6 }}>
        Les destinataires se règlent dans « Réglages globaux », section « Destinataires & notifications ».
      </div>
      <div style={{ marginTop: 22, marginBottom: 16 }}><SectionTitle color={t.gold}>Pipeline d'envoi</SectionTitle></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: t.muted, fontWeight: 500 }}>
        {['Soumission', 'Table messages', 'Email destinataire', 'Auto-réponse client'].map((s, i, arr) => (
          <React.Fragment key={s}>
            <span style={{ padding: '6px 12px', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.shadow}`, color: t.heading }}>{s}</span>
            {i < arr.length - 1 && <span style={{ color: t.muted }}>{Icon.arrow(14, t.muted)}</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: t.muted, marginTop: '12px', lineHeight: 1.6 }}>
        Via Edge Function Supabase + SMTP Google. Historique consultable et exportable depuis le module Messages.
      </div>
    </div>
  )
}

