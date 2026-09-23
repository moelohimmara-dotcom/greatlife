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
import { getSupabase } from '@/lib/supabase'
import { insertReservation } from '@/lib/repository'
import { invokeContactEmail } from '@/lib/supabase'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsText, pick } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'

const DISPOSITIONS = ['card', 'wide'] as const

const FIELD = {
  nom: 'reservation-nom',
  phone: 'reservation-phone',
  email: 'reservation-email',
  date: 'reservation-date',
  time: 'reservation-time',
  guests: 'reservation-guests',
  message: 'reservation-message',
} as const

export function Reservation({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t } = useSite()

  const title = pick(cmsText(cms, 'title'), 'Réservez votre table')
  const subtitle = pick(
    cmsText(cms, 'subtitle'),
    'Réservez en quelques secondes — confirmation par email.',
  )

  const [form, setForm] = useState({ nom: '', email: '', phone: '', date: '', time: '12:00', guests: '2', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const validate = () => {
    const e: Record<string, string | undefined> = {}
    if (!form.nom.trim()) e.nom = 'Votre nom est requis'
    if (!form.email.trim()) e.email = 'Votre email est requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    if (!form.date.trim()) e.date = 'La date est requise'
    if (!form.time.trim()) e.time = 'L\'heure est requise'
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
      const insertOk = await insertReservation({ ...form, guests: parseInt(form.guests) || 2 })
      const emailResult = await invokeContactEmail({
        nom: form.nom,
        email: form.email,
        sujet: 'reservation',
        message: `Réservation — ${form.date} à ${form.time}, ${form.guests} personnes${form.phone ? `, tel: ${form.phone}` : ''}${form.message ? `, message: ${form.message}` : ''}`,
      })
      if (!insertOk || !emailResult.ok) {
        setError(true)
        setLoading(false)
        return
      }
    } else {
      await new Promise(r => setTimeout(r, 600))
    }
    setSent(true)
    setLoading(false)
    setForm({ nom: '', email: '', phone: '', date: '', time: '12:00', guests: '2', message: '' })
    setTimeout(() => setSent(false), 5000)
  }
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${errors.nom ? t.accent : t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%', transition: 'border-color 0.2s' }
  const errStyle: React.CSSProperties = { fontSize: '12px', color: t.accent, marginTop: '4px', fontWeight: 500 }
  const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px', display: 'block' }
  const today = new Date().toISOString().split('T')[0]
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'card')
  const large = disposition === 'wide'
  return (
    <section className="section-pad" {...(large ? { 'data-disposition': 'wide' } : {})} style={{ padding: '100px 24px', background: t.surface }}>
      <div style={{ maxWidth: large ? '1100px' : '680px', margin: '0 auto' }}>
        <Reveal><SectionHead title={title} sub={subtitle} align="center" preview={preview} /></Reveal>
        <Reveal delay={0.1}>
          <OrganicCard style={{ padding: large ? '48px' : '32px' }}>
            <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }} noValidate>
              <div className="reservation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Label htmlFor={FIELD.nom} style={labelStyle}>Nom</Label>
                  <Input
                    id={FIELD.nom}
                    name="name"
                    autoComplete="name"
                    value={form.nom}
                    onChange={e => { setForm({ ...form, nom: e.target.value }); setErrors({ ...errors, nom: undefined }) }}
                    style={{ ...inputStyle, border: `1px solid ${errors.nom ? t.accent : t.shadow}` }}
                    required
                    aria-invalid={!!errors.nom}
                    aria-describedby={errors.nom ? `${FIELD.nom}-error` : undefined}
                  />
                  {errors.nom && <div id={`${FIELD.nom}-error`} role="alert" style={errStyle}>{errors.nom}</div>}
                </div>
                <div>
                  <Label htmlFor={FIELD.phone} style={labelStyle}>Téléphone</Label>
                  <Input
                    id={FIELD.phone}
                    name="tel"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+224 ..."
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={FIELD.email} style={labelStyle}>Email</Label>
                <Input
                  id={FIELD.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  inputMode="email"
                  value={form.email}
                  onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }) }}
                  style={{ ...inputStyle, border: `1px solid ${errors.email ? t.accent : t.shadow}` }}
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? `${FIELD.email}-error` : undefined}
                />
                {errors.email && <div id={`${FIELD.email}-error`} role="alert" style={errStyle}>{errors.email}</div>}
              </div>
              <div className="reservation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <Label htmlFor={FIELD.date} style={labelStyle}>Date</Label>
                  <Input
                    id={FIELD.date}
                    name="reservation-date"
                    type="date"
                    autoComplete="off"
                    min={today}
                    value={form.date}
                    onChange={e => { setForm({ ...form, date: e.target.value }); setErrors({ ...errors, date: undefined }) }}
                    style={{ ...inputStyle, border: `1px solid ${errors.date ? t.accent : t.shadow}` }}
                    required
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? `${FIELD.date}-error` : undefined}
                  />
                  {errors.date && <div id={`${FIELD.date}-error`} role="alert" style={errStyle}>{errors.date}</div>}
                </div>
                <div>
                  <Label htmlFor={FIELD.time} style={labelStyle}>Heure</Label>
                  <Input
                    id={FIELD.time}
                    name="reservation-time"
                    type="time"
                    autoComplete="off"
                    value={form.time}
                    onChange={e => { setForm({ ...form, time: e.target.value }); setErrors({ ...errors, time: undefined }) }}
                    style={{ ...inputStyle, border: `1px solid ${errors.time ? t.accent : t.shadow}` }}
                    required
                    aria-invalid={!!errors.time}
                    aria-describedby={errors.time ? `${FIELD.time}-error` : undefined}
                  />
                  {errors.time && <div id={`${FIELD.time}-error`} role="alert" style={errStyle}>{errors.time}</div>}
                </div>
                <div>
                  <Label id={`${FIELD.guests}-label`} htmlFor={FIELD.guests} style={labelStyle}>Personnes</Label>
                  <Select
                    id={FIELD.guests}
                    aria-labelledby={`${FIELD.guests}-label`}
                    value={form.guests}
                    onValueChange={v => setForm({ ...form, guests: v })}
                  >
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(n => <SelectItem key={n} value={n}>{n}{n === '10' ? '+' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor={FIELD.message} style={labelStyle}>Demande particulière (optionnel)</Label>
                <Textarea
                  id={FIELD.message}
                  name="reservation-notes"
                  autoComplete="off"
                  rows={3}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Anniversaire, allergies, table en terrasse…"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <Button type="submit" disabled={loading} aria-label="Réserver la table"
                  style={{
                  background: loading ? t.muted : t.primary, color: '#fff', fontWeight: 600,
                  padding: '12px 28px', borderRadius: '100px', fontSize: '15px',
                  border: 'none', cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: `0 4px 16px ${t.shadowDeep}`,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  minHeight: 44,
                }}>
                  {loading ? 'Réservation…' : 'Réserver'}
                  {!loading && Icon.arrow(16)}
                </Button>
                {sent && (
                  <span role="status" aria-live="polite" style={{ fontSize: '13px', color: t.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icon.check(16, t.primary)} Réservation envoyée ! Nous vous confirmons par email.
                  </span>
                )}
                {error && (
                  <span role="alert" aria-live="assertive" style={{ fontSize: '13px', color: t.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Échec de la réservation — veuillez réessayer.
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
