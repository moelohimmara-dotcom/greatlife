import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function LoginScreen() {
  const { login } = useAuth()
  const { theme: t, rootStyle } = useSite()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const result = login(email, password)
      setLoading(false)
      if (result.ok) navigate('/admin')
      else setError(result.error || 'Erreur')
    }, 500)
  }

  return (
    <div style={{ ...rootStyle, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, ${t.primary}20, transparent 70%)`, pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--f-heading)', fontSize: '36px', fontWeight: 700, color: t.heading, letterSpacing: '-0.03em' }}>Great<span style={{ color: t.accent }}>life</span></div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: t.muted, letterSpaci
ng: '0.08em', textTransform: 'uppercase', marginTop: '6px' }}>Espace de pilotage</div>
        </div>
        <OrganicCard style={{ padding: '36px' }}>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Connexion</h2>
          <p style={{ fontSize: '13px', color: t.muted, margin: '0 0 24px' }}>Accès réservé au propriétaire et au gérant.</p>
          <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
            <div>
              <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@greatlife.gn" required style={{ background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }} />
            </div>
            <div>
              <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Mot de passe</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }} />
            </div>
            {error && (
              <div style={{ fontSize: '13px', color: t.accent, fontWeight: 500, padding: '10px 14px', background: `${t.accent}0d`, borderRadius: '12px', border: `1px solid ${t.accent}22` }}>{error}</div>
            )}
            <Button type="submit" disabled={loading} style={{
              background: t.primary, color: '#fff', fontWeight: 600,
              padding: '13px 28px', borderRadius: '100px', fontSize: '15px',
              border: 'none', cursor: loading ? 'wait' : 'pointer',
              boxShadow: `0 4px 16px ${t.shadowDe
ep}`,
              display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            }}>
              {loading ? 'Vérification…' : 'Se connecter'} {!loading && Icon.arrow(16)}
            </Button>
          </form>
          <div style={{ marginTop: '20px', padding: '14px', borderRadius: '14px', background: t.surfaceAlt, border: `1px dashed ${t.shadow}`, fontSize: '12px', color: t.muted, lineHeight: 1.7 }}>
            <strong style={{ color: t.heading }}>Comptes de démonstration</strong><br />
            Propriétaire : owner@greatlife.gn<br />
            Gérant : gerant@greatlife.gn<br />
            Mot de passe : greatlife2026
          </div>
        </OrganicCard>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/" style={{ fontSize: '13px', color: t.muted, textDecoration: 'none' }}>← Retour au site</Link>
        </div>
      </motion.div>
    </div>
  )
}
