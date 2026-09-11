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

export function Reservation() {
  const { theme: t } = useSite()
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
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${errors.nom ? t.accent : t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%', transition: 'border 0.2s' }
  const errStyle: React.CSSProperties = { fontSize: '12px', color: t.accent, marginTop: '4px', fontWeight: 500 }
  const today = new Date().toISOString().split('T')[0]
  return (
    <section id="reservation" className="section-pad" style={{ padding: '100px 24px', background: t.surface }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <Reveal><SectionHead title="Réservez votre table" sub="Réservez en quelques secondes — confirmation par email." align="center" /></Reveal>
        <Reveal delay={0.1}>
          <OrganicCard style={{ padding: '32px' }}>
            <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
              <div className="reservation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Nom</Label>
                  <Input value={form.nom} onChange={e => { setForm({ ...form, nom: e.target.value }); setErrors({ ...errors, nom: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.nom ? t.accent : t.shadow}` }} required />
                  {errors.nom && <div style={errStyle}>{errors.nom}</div>}
                </div>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Téléphone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+224 ..." style={inputStyle} />
                </div>
              </div>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Email</Label>
                <Input type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.email ? t.accent : t.shadow}` }} required />
                {errors.email && <div style={errStyle}>{errors.email}</div>}
              </div>
              <div className="reservation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Date</Label>
                  <Input type="date" min={today} value={form.date} onChange={e => { setForm({ ...form, date: e.target.value }); setErrors({ ...errors, date: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.date ? t.accent : t.shadow}` }} required />
                  {errors.date && <div style={errStyle}>{errors.date}</div>}
                </div>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Heure</Label>
                  <Input type="time" value={form.time} onChange={e => { setForm({ ...form, time: e.target.value }); setErrors({ ...errors, time: undefined }) }} style={{ ...inputStyle, border: `1px solid ${errors.time ? t.accent : t.shadow}` }} required />
                  {errors.time && <div style={errStyle}>{errors.time}</div>}
                </div>
                <div>
                  <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Personnes</Label>
                  <Select value={form.guests} onValueChange={v => setForm({ ...form, guests: v })}>
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(n => <SelectItem key={n} value={n}>{n}{n === '10' ? '+' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Demande particulière (optionnel)</Label>
                <Textarea rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Anniversaire, allergies, table en terrasse…" style={inputStyle} />
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
                }}>
                  {loading ? 'Réservation…' : 'Réserver'}
                  {!loading && Icon.arrow(16)}
                </Button>
                {sent && (
                  <span style={{ fontSize: '13px', color: t.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icon.check(16, t.primary)} Réservation envoyée ! Nous vous confirmons par email.
                  </span>
                )}
                {error && (
                  <span style={{ fontSize: '13px', color: t.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✗ Échec de la réservation — veuillez réessayer.
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
