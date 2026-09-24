import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { useCart } from '@/contexts/CartContext'
import { Icon } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { insertOrder } from '@/lib/repository'
import { invokeContactEmail, getSupabase } from '@/lib/supabase'
import { normaliserPickupTimes } from '@/cms/repository/settings'

const FIELD = {
  nom: 'order-nom',
  phone: 'order-phone',
  email: 'order-email',
  pickup: 'order-pickup',
  notes: 'order-notes',
} as const

const MSG_AUCUN_CRENEAU =
  'Aucun créneau de retrait n’est proposé pour le moment. Contactez le restaurant ou réessayez plus tard.'

function genRef(): string {
  return 'GL' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4)
}

function CartGlyph({ size = 40, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21.5 7H6" />
    </svg>
  )
}

const qtyBtnStyle = (t: { shadow: string; surface: string; heading: string }): React.CSSProperties => ({
  boxSizing: 'border-box',
  width: 48,
  height: 48,
  minWidth: 48,
  minHeight: 48,
  flexShrink: 0,
  borderRadius: 10,
  border: `1px solid ${t.shadow}`,
  background: t.surface,
  color: t.heading,
  cursor: 'pointer',
  fontSize: 18,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'manipulation',
  padding: 0,
})

export function OrderCart({ pickupTimes = [] }: { pickupTimes?: readonly string[] }) {
  const { theme: t } = useSite()
  const { items, setQty, remove, clear, count, totalLabel } = useCart()
  const reduceMotion = useReducedMotion()
  const slots = normaliserPickupTimes(pickupTimes)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [form, setForm] = useState({ nom: '', email: '', phone: '', pickup_time: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  // Si les créneaux publiés changent, coller la sélection sur une valeur valide.
  useEffect(() => {
    if (slots.length === 0) {
      if (form.pickup_time) setForm((f) => ({ ...f, pickup_time: '' }))
      return
    }
    if (!slots.includes(form.pickup_time)) {
      setForm((f) => ({ ...f, pickup_time: slots[0] }))
    }
  // Intentionnel : réagir à la liste publiée, pas à chaque frappe du formulaire.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.join('|')])

  const motionDur = reduceMotion ? 0 : undefined

  const validate = () => {
    const e: Record<string, string | undefined> = {}
    if (!form.nom.trim()) e.nom = 'Votre nom est requis'
    if (!form.email.trim()) e.email = 'Votre email est requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    if (slots.length === 0) e.pickup = MSG_AUCUN_CRENEAU
    else if (!form.pickup_time || !slots.includes(form.pickup_time)) e.pickup = 'Choisissez une heure de retrait'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) { setErrMsg('Votre panier est vide'); setResult('err'); return }
    if (slots.length === 0) { setErrMsg(MSG_AUCUN_CRENEAU); setResult('err'); return }
    if (!validate()) return
    setSubmitting(true)
    setResult('idle')
    setErrMsg('')
    const ref = genRef()
    const itemsLabel = items.map(i => `${i.qty}× ${i.name}`).join(', ')
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
      if (!res.ok) {
        setErrMsg(res.error || 'Impossible d’envoyer la commande. Vérifiez vos informations et réessayez.')
        setResult('err')
        setSubmitting(false)
        return
      }
      await invokeContactEmail({
        nom: form.nom,
        email: form.email,
        sujet: 'commande',
        message: `Commande ${ref} — retrait à ${form.pickup_time}\nArticles: ${itemsLabel}\nTotal: ${totalLabel} FG${form.phone ? `\nTél: ${form.phone}` : ''}${form.notes ? `\nNotes: ${form.notes}` : ''}`,
      })
    } else {
      await new Promise(r => setTimeout(r, 600))
    }
    setSubmitting(false)
    setResult('ok')
    clear()
    setForm({ nom: '', email: '', phone: '', pickup_time: slots[0] ?? '', notes: '' })
    setTimeout(() => setResult('idle'), 6000)
  }

  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%', transition: 'border-color 0.2s' }
  const errStyle: React.CSSProperties = { fontSize: '12px', color: t.accent, marginTop: '4px', fontWeight: 500 }
  const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px', display: 'block' }

  return (
    <>
      {/* Bouton panier flottant */}
      <AnimatePresence>
        {count > 0 && !open && (
          <motion.button
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: motionDur ?? 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setOpen(true)}
            aria-label={`Voir mon panier de commande, ${count} article${count > 1 ? 's' : ''}`}
            style={{
              position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: t.primary, color: '#fff', border: 'none',
              padding: '14px 22px', borderRadius: '100px', cursor: 'pointer',
              fontSize: '15px', fontWeight: 700,
              boxShadow: `0 8px 28px ${t.shadowDeep}`,
              minHeight: 48,
              touchAction: 'manipulation',
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <CartGlyph size={22} color="#fff" />
              <span style={{ position: 'absolute', top: -8, right: -10, background: t.accent, color: '#fff', fontSize: '11px', fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }} aria-hidden="true">{count}</span>
            </span>
            Ma commande · {totalLabel} FG
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal panier */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: motionDur ?? 0.2 }}
            onClick={() => setOpen(false)}
            role="presentation"
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overscrollBehavior: 'contain' }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-cart-title"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: motionDur ?? 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', background: t.surface, borderRadius: '20px', boxShadow: `0 24px 60px ${t.shadowDeep}`, overscrollBehavior: 'contain' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.shadow}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: t.surface, zIndex: 2, borderRadius: '20px 20px 0 0' }}>
                <h3 id="order-cart-title" style={{ fontFamily: 'var(--font-heading, var(--f-heading))', color: t.heading, fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                  Ma commande
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer le panier"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.muted, padding: 0, width: 44, height: 44, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                >
                  {Icon.x(20, t.muted)}
                </button>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {result === 'ok' && (
                  <div role="status" aria-live="polite" style={{ padding: '16px', borderRadius: 14, background: `${t.primary}12`, border: `1px solid ${t.primary}33`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icon.check(20, t.primary)}
                    <div style={{ fontSize: '14px', color: t.primary, fontWeight: 600 }}>Commande envoyée ! Nous vous confirmons par email. Un email de confirmation arrive dans votre boîte.</div>
                  </div>
                )}
                {result === 'err' && (
                  <div role="alert" aria-live="assertive" style={{ padding: '16px', borderRadius: 14, background: `${t.accent}12`, border: `1px solid ${t.accent}33`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, color: t.accent }} aria-hidden="true">✗</span>
                    <div style={{ fontSize: '14px', color: t.accent, fontWeight: 600 }}>{errMsg || 'Impossible d’envoyer la commande. Vérifiez vos informations et réessayez.'}</div>
                  </div>
                )}

                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: t.muted }}>
                    <div style={{ opacity: 0.45, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                      <CartGlyph size={40} color={t.muted} />
                    </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button type="button" onClick={() => setQty(it.name, it.qty - 1)} aria-label={`Diminuer ${it.name}`} style={qtyBtnStyle(t)}>−</button>
                            <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.heading }} aria-live="polite" aria-atomic="true">{it.qty}</span>
                            <button type="button" onClick={() => setQty(it.name, it.qty + 1)} aria-label={`Augmenter ${it.name}`} style={qtyBtnStyle(t)}>+</button>
                            <button
                              type="button"
                              onClick={() => remove(it.name)}
                              aria-label={`Retirer ${it.name}`}
                              style={{ ...qtyBtnStyle(t), border: 'none', background: 'transparent', color: t.accent }}
                            >
                              {Icon.trash(16, t.accent)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={submit} style={{ display: 'grid', gap: '14px' }} noValidate>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                      <div>
                        <Label id={`${FIELD.pickup}-label`} htmlFor={FIELD.pickup} style={labelStyle}>Heure de retrait</Label>
                        {slots.length === 0 ? (
                          <div
                            id={FIELD.pickup}
                            role="status"
                            aria-live="polite"
                            style={{ ...inputStyle, color: t.accent, fontWeight: 600, lineHeight: 1.45 }}
                          >
                            {MSG_AUCUN_CRENEAU}
                          </div>
                        ) : (
                          <Select
                            id={FIELD.pickup}
                            aria-labelledby={`${FIELD.pickup}-label`}
                            value={form.pickup_time || slots[0]}
                            onValueChange={v => setForm({ ...form, pickup_time: v })}
                          >
                            <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {slots.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {errors.pickup && <div id={`${FIELD.pickup}-error`} role="alert" style={errStyle}>{errors.pickup}</div>}
                      </div>
                      <div>
                        <Label htmlFor={FIELD.notes} style={labelStyle}>Notes (optionnel)</Label>
                        <Textarea
                          id={FIELD.notes}
                          name="order-notes"
                          autoComplete="off"
                          rows={2}
                          value={form.notes}
                          onChange={e => setForm({ ...form, notes: e.target.value })}
                          placeholder="Sans oignon, allergie, etc."
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg, ${t.primary}10, ${t.gold}08)`, border: `1px solid ${t.primary}20` }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>Total</span>
                        <span style={{ fontFamily: 'var(--font-heading, var(--f-heading))', fontSize: '22px', fontWeight: 700, color: t.accent }}>{totalLabel}<span style={{ fontSize: '12px', fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span></span>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="submit" disabled={submitting || slots.length === 0}
                          style={{ flex: 1, background: submitting || slots.length === 0 ? t.muted : t.primary, color: '#FFFFFF', fontWeight: 700, padding: '14px 24px', borderRadius: '100px', fontSize: '16px', border: 'none', cursor: submitting || slots.length === 0 ? 'not-allowed' : 'pointer', opacity: submitting || slots.length === 0 ? 0.7 : 1, boxShadow: `0 4px 16px ${t.shadowDeep}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, touchAction: 'manipulation' }}>
                          {submitting ? 'Envoi…' : slots.length === 0 ? 'Commande indisponible' : 'Valider ma commande'}
                          {!submitting && slots.length > 0 && Icon.arrow(16)}
                        </button>
                        <button type="button" onClick={() => { if (confirm('Vider le panier ?')) clear() }} style={{ padding: '14px 18px', borderRadius: '100px', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer', fontSize: '14px', fontWeight: 600, minHeight: 48, touchAction: 'manipulation' }}>Vider</button>
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
