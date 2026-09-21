import React, { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { Icon } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { getSupabase, invokeContactEmail } from '@/lib/supabase'
import { insertMessage } from '@/lib/repository'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText, pick } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'

/** Motifs du formulaire, tels quels avant la bascule CMS. */
const LEGACY_SUBJECTS = [
  { value: 'contact', label: 'Message général' },
  { value: 'reservation', label: 'Réservation de table' },
  { value: 'commande', label: 'Commande en ligne' },
  { value: 'recrutement', label: 'Recrutement' },
]

interface Subject {
  value: string
  label: string
}

const DISPOSITIONS = ['card', 'wide'] as const

export function Contact({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t, setMessages } = useSite()

  const title = pick(cmsText(cms, 'title'), 'Écrivez-nous')
  const subtitle = pick(
    cmsText(cms, 'subtitle'),
    'Réservation, commande, question — on vous répond sous 24h.',
  )
  const subjects: Subject[] = pick(cmsList<Subject>(cms, 'subjects'), LEGACY_SUBJECTS)

  // Le motif par défaut doit exister dans la liste, sinon le menu s'affiche vide.
  const defaultSubject = subjects.some((s) => s.value === 'contact')
    ? 'contact'
    : (subjects[0]?.value ?? '')

  const [form, setForm] = useState({ nom: '', email: '', sujet: defaultSubject, message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const validate = () => {
    const e: Record<string, string | undefined> = {}
    if (!form.nom.trim()) e.nom = 'Votre nom est requis'
    if (!form.email.trim()) e.email = 'Votre email est requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    if (!form.message.trim()) e.message = 'Votre message est vide'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(false)
    const sb = getSupabase()
    if (sb) {
      const insertOk = await insertMessage(form)
      const emailResult = await invokeContactEmail(form)
      if (!insertOk || !emailResult.ok) {
        setError(true)
        setLoading(false)
        return
      }
    } else {
      await new Promise(r => setTimeout(r, 600))
      setMessages(prev => [{ ...form, date: new Date().toISOString() }, ...prev])
    }
    setSent(true)
    setLoading(false)
    setForm({ nom: '', email: '', sujet: defaultSubject, message: '' })
    setTimeout(() => setSent(false), 4000)
  }
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${errors.nom ? t.accent : t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%', transition: 'border 0.2s' }
  const errStyle: React.CSSProperties = { fontSize: '12px', color: t.accent, marginTop: '4px', fontWeight: 500 }
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'card')
  const large = disposition === 'wide'
  return (
    <section className="section-pad" {...(large ? { 'data-disposition': 'wide' } : {})} style={{ padding: '100px 24px', background: t.surfaceAlt }}>
      <div style={{ maxWidth: large ? '1100px' : '680px', margin: '0 auto' }}>
        <Reveal><SectionHead title={title} sub={subtitle} align="center" preview={preview} /></Reveal>
        <Reveal delay={0.1}>
          <OrganicCard style={{ padding: large ? '48px' : '32px' }}>
            <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
              <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Nom</Label>
                  <Input value={form.nom} onChange={e => { setForm({ ...form, nom: e.target.value }); setErrors({ ...errors, nom: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.nom ? t.accent : t.shadow}` }} required aria-invalid={!!errors.nom} />
                  {errors.nom && <div style={errStyle}>{errors.nom}</div>}
                </div>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Email</Label>
                  <Input type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.email ? t.accent : t.shadow}` }} required aria-invalid={!!errors.email} />
                  {errors.email && <div style={errStyle}>{errors.email}</div>}
                </div>
              </div>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Type de demande</Label>
               
 <Select value={form.sujet} onValueChange={v => setForm({ ...form, sujet: v })}>
                  <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Message</Label>
                <Textarea rows={4} value={form.message} onChange={e => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.message ? t.accent : t.shadow}` }} required aria-invalid={!!errors.message} />
                {errors.message && <div style={errStyle}>{errors.message}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <Button type="submit" disabled={loading} aria-label="Envoyer le message"
                  style={{
                  background: loading ? t.muted : t.primary, color: '#fff', fontWeight: 600,
                  padding: '12px 28px', borderRadius: '100px', fontSize: '15px',
                  border: 'none', cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: `0 4px 16px ${t.shadowDeep}`,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  {loading ? 'Envoi en cours…' : 'Envoyer'}
                  {!loading && Icon.arrow(16)}
                </Button>
                <Button type="button" onClick={() => { setForm(
{ nom: '', email: '', sujet: defaultSubject, message: '' }); setErrors({}) }}
                  aria-label="Effacer le formulaire"
                  style={{
                  background: 'transparent', color: t.muted, fontWeight: 600,
                  padding: '12px 20px', borderRadius: '100px', fontSize: '14px',
                  border: `1px solid ${t.shadow}`, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                }} onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.primary + '40' }}
                  onMouseLeave={e => { e.currentTarget.style.color = t.muted; e.currentTarget.style.borderColor = t.shadow }}>
                  Effacer
                </Button>
                {sent && (
                  <span style={{ fontSize: '13px', color: t.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icon.check(16, t.primary)} Envoyé ! Auto-réponse transmise au client.
                  </span>
                )}
                {error && (
                  <span style={{ fontSize: '13px', color: t.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✗ Échec de l'envoi — veuillez réessayer.
                  </span>
                )}
              </div>
            </form>
          </OrganicCard>
        </Reveal>
      </div>
    </section>
  )
}
