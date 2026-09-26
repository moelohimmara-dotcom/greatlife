import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bouton } from '@/admin/editor/chrome'
import { requestPasswordReset, updateOwnPassword, getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { evaluatePassword, isValidEmail, passwordRulesSummary } from '@/lib/password'
import '@/admin/console.css'

export function LoginScreen() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>(
    search.get('reset') === '1' ? 'recovery' : 'login',
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const sb = getSupabase()
    if (!sb) return
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery')
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
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

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!isSupabaseConfigured) {
      setError('Mode démo local — la réinitialisation nécessite Supabase Auth.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Adresse email invalide.')
      return
    }
    setLoading(true)
    try {
      const res = await requestPasswordReset(email)
      if (res.ok) {
        setInfo('Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.')
      } else if (res.error === 'not-configured') {
        setError('Supabase non configuré.')
      } else {
        setError(res.error || 'Envoi impossible. Réessayez.')
      }
    } finally {
      setLoading(false)
    }
  }

  const submitRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    const pwd = evaluatePassword(password, email)
    if (!pwd.ok) {
      setError(pwd.errors[0] || 'Mot de passe trop faible.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const res = await updateOwnPassword(password)
      if (res.ok) {
        setInfo('Mot de passe mis à jour. Vous pouvez vous connecter.')
        setPassword('')
        setConfirm('')
        setMode('login')
      } else {
        setError(res.error || 'Mise à jour impossible. Rouvrez le lien reçu par email.')
      }
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'forgot' ? 'Mot de passe oublié' : mode === 'recovery' ? 'Nouveau mot de passe' : 'Connexion'
  const subtitle =
    mode === 'forgot'
      ? 'Recevez un lien de réinitialisation sur votre email.'
      : mode === 'recovery'
        ? passwordRulesSummary()
        : "Accès réservé à l'équipe du restaurant."

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
          <h2 style={{ fontFamily: 'var(--admin-font-display)', color: 'var(--admin-ink)', fontSize: '22px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{title}</h2>
          <p style={{ fontSize: '13px', color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', margin: '0 0 24px' }}>{subtitle}</p>

          {mode === 'login' && (
            <form onSubmit={submitLogin} style={{ display: 'grid', gap: '16px' }}>
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
              {(error || info) && (
                <div role="alert" style={{ fontSize: '13px', color: error ? 'var(--admin-coral)' : 'var(--admin-forest)', fontWeight: 500, padding: '10px 14px', background: error ? 'color-mix(in srgb, var(--admin-coral) 10%, transparent)' : 'color-mix(in srgb, var(--admin-forest) 10%, transparent)', borderRadius: '12px', border: `1px solid ${error ? 'color-mix(in srgb, var(--admin-coral) 28%, transparent)' : 'color-mix(in srgb, var(--admin-forest) 28%, transparent)'}` }}>
                  {error || info}
                </div>
              )}
              <Bouton type="submit" genre="primaire" etendu busy={loading} disabled={loading} style={{ fontSize: 15, gap: 8, background: 'var(--admin-forest)', borderColor: 'var(--admin-forest)' }}>
                {loading ? 'Vérification…' : <>Se connecter {Icon.arrow(16)}</>}
              </Bouton>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={submitForgot} style={{ display: 'grid', gap: '16px' }}>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', marginBottom: '6px' }}>Email</Label>
                <Input type="email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required spellCheck={false}
                  style={{ background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--admin-ink)', width: '100%' }} />
              </div>
              {(error || info) && (
                <div role="status" style={{ fontSize: '13px', color: error ? 'var(--admin-coral)' : 'var(--admin-forest)', fontWeight: 500, padding: '10px 14px', background: error ? 'color-mix(in srgb, var(--admin-coral) 10%, transparent)' : 'color-mix(in srgb, var(--admin-forest) 10%, transparent)', borderRadius: '12px', border: `1px solid ${error ? 'color-mix(in srgb, var(--admin-coral) 28%, transparent)' : 'color-mix(in srgb, var(--admin-forest) 28%, transparent)'}` }}>
                  {error || info}
                </div>
              )}
              <Bouton type="submit" genre="primaire" etendu busy={loading} disabled={loading} style={{ fontSize: 15, gap: 8, background: 'var(--admin-forest)', borderColor: 'var(--admin-forest)' }}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </Bouton>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                ← Retour à la connexion
              </button>
            </form>
          )}

          {mode === 'recovery' && (
            <form onSubmit={submitRecovery} style={{ display: 'grid', gap: '16px' }}>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', marginBottom: '6px' }}>Nouveau mot de passe</Label>
                <Input type="password" name="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" required
                  style={{ background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--admin-ink)', width: '100%' }} />
              </div>
              <div>
                <Label style={{ fontSize: '13px', fontWeight: 600, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', marginBottom: '6px' }}>Confirmer</Label>
                <Input type="password" name="confirm" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••••••" required
                  style={{ background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--admin-ink)', width: '100%' }} />
              </div>
              {password.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', display: 'grid', gap: 4 }}>
                  {evaluatePassword(password, email).checks.map(c => (
                    <li key={c.id} style={{ color: c.ok ? 'var(--admin-forest)' : 'inherit' }}>
                      {c.ok ? '✓' : '○'} {c.label}
                    </li>
                  ))}
                </ul>
              )}
              {(error || info) && (
                <div role="alert" style={{ fontSize: '13px', color: error ? 'var(--admin-coral)' : 'var(--admin-forest)', fontWeight: 500, padding: '10px 14px', background: error ? 'color-mix(in srgb, var(--admin-coral) 10%, transparent)' : 'color-mix(in srgb, var(--admin-forest) 10%, transparent)', borderRadius: '12px', border: `1px solid ${error ? 'color-mix(in srgb, var(--admin-coral) 28%, transparent)' : 'color-mix(in srgb, var(--admin-forest) 28%, transparent)'}` }}>
                  {error || info}
                </div>
              )}
              <Bouton type="submit" genre="primaire" etendu busy={loading} disabled={loading} style={{ fontSize: 15, gap: 8, background: 'var(--admin-forest)', borderColor: 'var(--admin-forest)' }}>
                {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </Bouton>
            </form>
          )}
        </OrganicCard>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/" style={{ fontSize: '13px', color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)', textDecoration: 'none' }}>← Retour au site</Link>
        </div>
      </motion.div>
    </div>
  )
}
