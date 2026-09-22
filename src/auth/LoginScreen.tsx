import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bouton } from '@/admin/editor/chrome'
import '@/admin/console.css'

export function LoginScreen() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const result = await login(email, password)
      if (result.ok) navigate('/admin')
      else setError(result.error ?? 'Connexion impossible. Réessayez.')
    } catch {
      setError('Connexion impossible. Réessayez.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      data-admin-shell=""
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--admin-paper)',
        color: 'var(--admin-ink)',
        fontFamily: 'var(--admin-font-ui)',
      }}
    >
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--admin-forest) 18%, transparent), transparent 70%)', pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--admin-font-display)', fontSize: '36px', fontWeight: 700, color: 'var(--admin-ink)', letterSpacing: '-0.03em' }}>Great<span style={{ color: 'var(--admin-forest)' }}>life</span></div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '6px' }}>Espace de pilotage</div>
        </div>
        <OrganicCard style={{ padding: '36px', background: 'var(--admin-surface)', border: '1px solid var(--admin-line)', boxShadow: 'var(--admin-shadow)' }}>
          <h2 style={{ fontFamily: 'var(--admin-font-display)', color: 'var(--admin-ink)', fontSize: '22px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Connexion</h2>
          <p style={{ fontSize: '13px', color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', margin: '0 0 24px' }}>Accès réservé à l'équipe du restaurant.</p>
          <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
            <div>
              <Label style={{ fontSize: '13px', fontWeight: 600, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', marginBottom: '6px' }}>Email</Label>
              <Input type="email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required spellCheck={false}
                style={{ background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--admin-ink)', width: '100%' }} />
            </div>
            <div>
              <Label style={{ fontSize: '13px', fontWeight: 600, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', marginBottom: '6px' }}>Mot de passe</Label>
              <Input type="password" name="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--admin-ink)', width: '100%' }} />
            </div>
            {error && (
              <div role="alert" style={{ fontSize: '13px', color: 'var(--admin-coral)', fontWeight: 500, padding: '10px 14px', background: 'color-mix(in srgb, var(--admin-coral) 10%, transparent)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--admin-coral) 28%, transparent)' }}>
                {error}
              </div>
            )}
            <Bouton type="submit" genre="primaire" etendu busy={loading} disabled={loading} style={{ fontSize: 15, gap: 8, background: 'var(--admin-forest)', borderColor: 'var(--admin-forest)' }}>
              {loading ? 'Vérification…' : <>Se connecter {Icon.arrow(16)}</>}
            </Bouton>
          </form>
        </OrganicCard>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/" style={{ fontSize: '13px', color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', textDecoration: 'none' }}>← Retour au site</Link>
        </div>
      </motion.div>
    </div>
  )
}
