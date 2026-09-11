import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { useCart } from '@/contexts/CartContext'
import { Icon } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { insertOrder } from '@/lib/repository'
import { getSupabase } from '@/lib/supabase'

const PICKUP_TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00']

function genRef(): string {
  return 'GL' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4)
}

export function OrderCart() {
  const { theme: t } = useSite()
  const { items, setQty, remove, clear, count, totalLabel } = useCart()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [form, setForm] = useState({ nom: '', email: '', phone: '', pickup_time: PICKUP_TIMES[0], notes: '' })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  const validate = () => {
    const e: Record<string, string | undefined> = {}
    if (!form.nom.trim()) e.nom = 'Votre nom est requis'
    if (!form.email.trim()) e.email = 'Votre email est requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) { setErrMsg('Votre panier est vide'); setResult('err'); return }
    if (!validate()) return
    setSubmitting(true)
    setResult('idle')
    setErrMsg('')
    const ref = genRef()
    const sb = getSupabase()
    if (sb) {
      const res = await insertOrder({
        ref,
        nom: form.nom,
        email: form.email,
        phone: form.phone,
        items: items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
        total: totalLabel,
        pickup_time: form.pickup_time,
        notes: form.notes,
      })
      if (!res.ok) { setErrMsg(res.error || 'Échec de la commande'); setResult('err'); setSubmitting(false); return }
    } else {
      await new Promise(r => setTimeout(r, 600))
    }
    setSubmitting(false)
    setResult('ok')
    clear()
    setForm({ nom: '', email: '', phone: '', pickup_time: PICKUP_TIMES[0], notes: '' })
    setTimeout(() => setResult('idle'), 6000)
  }

  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  const errStyle: React.CSSProperties = { fontSize: '12px', color: t.accent, marginTop: '4px', fontWeight: 500 }

  return (
    <>
      {/* Bouton panier flottant */}
      <AnimatePresence>
        {count > 0 && !open && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setOpen(true)}
            aria-label="Voir mon panier de commande"
            style={{
              position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: t.primary, color: '#fff', border: 'none',
              padding: '14px 22px', borderRadius: '100px', cursor: 'pointer',
              fontSize: '15px', fontWeight: 700,
              boxShadow: `0 8px 28px ${t.shadowDeep}`,
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21.5 7H6" /></svg>
              <span style={{ position: 'absolute', top: -8, right: -10, background: t.accent, color: '#fff', fontSize: '11px', fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{count}</span>
            </span>
            Ma commande · {totalLabel} FG
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal panier */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', background: t.surface, borderRadius: '20px', boxShadow: `0 24px 60px ${t.shadowDeep}` }}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.shadow}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: t.surface, zIndex: 2, borderRadius: '20px 20px 0 0' }}>
                <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                  Ma commande
                </h3>
                <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.muted, padding: 4, display: 'inline-flex' }}>{Icon.x(20, t.muted)}</button>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {result === 'ok' && (
                  <div style={{ padding: '16px', borderRadius: 14, background: `${t.primary}12`, border: `1px solid ${t.primary}33`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icon.check(20, t.primary)}
                    <div style={{ fontSize: '14px', color: t.primary, fontWeight: 600 }}>Commande envoyée ! Nous vous confirmons par email. Un email de confirmation arrive dans votre boîte.</div>
                  </div>
                )}
                {result === 'err' && (
                  <div style={{ padding: '16px', borderRadius: 14, background: `${t.accent}12`, border: `1px solid ${t.accent}33`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, color: t.accent }}>✗</span>
                    <div style={{ fontSize: '14px', color: t.accent, fontWeight: 600 }}>{errMsg || 'Échec de la commande — veuillez réessayer.'}</div>
                  </div>
                )}

                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: t.muted }}>
                    <div style={{ fontSize: 40, opacity: 0.4, marginBottom: 12 }}>🛒</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: t.heading, marginBottom: 4 }}>Votre panier est vide</div>
                    <div style={{ fontSize: '13px' }}>Ajoutez des articles depuis la carte pour commander.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {items.map(it => (
                        <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: t.surfaceAlt, border: `1px solid ${t.shadow}` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{it.name}</div>
                            <div style={{ fontSize: '12px', color: t.muted }}>{it.price} FG l'unité</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => setQty(it.name, it.qty - 1)} aria-label="Diminuer" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.shadow}`, background: t.surface, color: t.heading, cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.heading }}>{it.qty}</span>
                            <button onClick={() => setQty(it.name, it.qty + 1)} aria-label="Augmenter" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.shadow}`, background: t.surface, color: t.heading, cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            <button onClick={() => remove(it.name)} aria-label="Retirer" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: t.accent, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.trash(16, t.accent)}</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={submit} style={{ display: 'grid', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                      <div>
                        <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Heure de retrait</Label>
                        <Select value={form.pickup_time} onValueChange={v => setForm({ ...form, pickup_time: v })}>
                          <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PICKUP_TIMES.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Notes (optionnel)</Label>
                        <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Sans oignon, allergie, etc." style={inputStyle} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg, ${t.primary}10, ${t.gold}08)`, border: `1px solid ${t.primary}20` }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>Total</span>
                        <span style={{ fontFamily: 'var(--f-heading)', fontSize: '22px', fontWeight: 700, color: t.accent }}>{totalLabel}<span style={{ fontSize: '12px', fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span></span>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="submit" disabled={submitting}
                          style={{ flex: 1, background: submitting ? t.muted : t.primary, color: '#fff', fontWeight: 700, padding: '14px 24px', borderRadius: '100px', fontSize: '15px', border: 'none', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: `0 4px 16px ${t.shadowDeep}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {submitting ? 'Envoi…' : 'Valider ma commande'}
                          {!submitting && Icon.arrow(16)}
                        </button>
                        <button type="button" onClick={() => { if (confirm('Vider le panier ?')) clear() }} style={{ padding: '14px 18px', borderRadius: '100px', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>Vider</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
