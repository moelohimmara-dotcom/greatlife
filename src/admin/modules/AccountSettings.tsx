import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { isValidEmail, evaluatePassword, passwordRulesSummary } from '@/lib/password'
import { updateOwnPassword, updateOwnEmail, isSupabaseConfigured, invokeManageAdminAuth } from '@/lib/supabase'
import { logAudit } from '@/lib/repository'
import { Input } from '@/components/ui/input'
import { ROLE_LABELS } from '@/data/rbac'

/**
 * Mon compte — remplacer / modifier ses propres identifiants
 * (email fonctionnel + mot de passe fort) sans passer par le dashboard Supabase.
 * Backlog B-1.
 */
export function AccountSettings() {
  const { theme: t, dataSource } = useSite()
  const { user, refreshRole } = useAuth()
  const isSupabase = dataSource === 'supabase' && isSupabaseConfigured
  const inp = inputStyle(t)

  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({
    kind: 'idle',
    msg: '',
  })

  const pwdEval = evaluatePassword(password, email)

  const savePassword = async () => {
    if (!isSupabase) {
      setStatus({
        kind: 'err',
        msg: 'Mode démo local — la modification du mot de passe nécessite Supabase Auth.',
      })
      return
    }
    if (!pwdEval.ok) {
      setStatus({ kind: 'err', msg: pwdEval.errors[0] || 'Mot de passe trop faible.' })
      return
    }
    if (password !== confirm) {
      setStatus({ kind: 'err', msg: 'Les deux mots de passe ne correspondent pas.' })
      return
    }
    setStatus({ kind: 'busy', msg: 'Enregistrement du mot de passe…' })
    const res = await updateOwnPassword(password)
    if (res.ok) {
      setPassword('')
      setConfirm('')
      logAudit({
        actor: user?.email ?? '',
        action: 'user_password_update',
        target: user?.email ?? '',
        detail: 'Mot de passe modifié depuis Mon compte',
      })
      setStatus({ kind: 'ok', msg: 'Mot de passe mis à jour. Utilisez-le à la prochaine connexion.' })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la mise à jour.' })
    }
  }

  const saveEmail = async () => {
    if (!isSupabase) {
      setStatus({
        kind: 'err',
        msg: 'Mode démo local — le changement d’email nécessite Supabase Auth.',
      })
      return
    }
    const next = email.trim().toLowerCase()
    if (!isValidEmail(next)) {
      setStatus({ kind: 'err', msg: 'Adresse email invalide.' })
      return
    }
    if (next === (user?.email ?? '').toLowerCase()) {
      setStatus({ kind: 'err', msg: 'Saisissez une adresse différente de l’actuelle.' })
      return
    }
    setStatus({ kind: 'busy', msg: 'Demande de changement d’email…' })
    const res = await updateOwnEmail(next)
    if (!res.ok) {
      setStatus({ kind: 'err', msg: res.error || 'Échec du changement d’email.' })
      return
    }
    // Ne pas INSERT une 2ᵉ ligne admin_users : Auth n'a pas encore basculé
    // l'email (confirmation requise). La ligne sera mise à jour après confirmation
    // ou via « Remplacer email + mot de passe » (Edge Function, owner).
    logAudit({
      actor: user?.email ?? '',
      action: 'user_email_update_request',
      target: next,
      detail: `Ancien email : ${user?.email ?? ''} — confirmation en attente`,
    })
    refreshRole().catch(() => {})
    setStatus({
      kind: 'ok',
      msg: `Un courriel de confirmation a été envoyé à ${next}. Confirmez le lien pour finaliser le remplacement de l’email temporaire.`,
    })
  }

  /** Remplacement immédiat email + mot de passe (owner → Edge Function). */
  const replaceCredentials = async () => {
    if (!isSupabase) {
      setStatus({
        kind: 'err',
        msg: 'Mode démo local — le remplacement d’identifiants nécessite Supabase.',
      })
      return
    }
    if (user?.role !== 'owner') {
      setStatus({
        kind: 'err',
        msg: 'Seul le propriétaire peut remplacer immédiatement email et mot de passe. Utilisez les champs séparés ci-dessus, ou demandez au propriétaire.',
      })
      return
    }
    const next = email.trim().toLowerCase()
    if (!isValidEmail(next)) {
      setStatus({ kind: 'err', msg: 'Adresse email invalide.' })
      return
    }
    const pwd = evaluatePassword(password, next)
    if (!pwd.ok) {
      setStatus({ kind: 'err', msg: pwd.errors[0] || 'Mot de passe trop faible.' })
      return
    }
    if (password !== confirm) {
      setStatus({ kind: 'err', msg: 'Les deux mots de passe ne correspondent pas.' })
      return
    }
    setStatus({ kind: 'busy', msg: 'Remplacement des identifiants…' })
    const res = await invokeManageAdminAuth({
      action: 'set-credentials',
      email: next,
      name: user.name,
      password,
      role: 'owner',
      previousEmail: user.email,
    })
    if (!res.ok) {
      const raw = res.error || 'Échec du remplacement.'
      const msg =
        raw === 'Acces non autorise' || raw === 'Accès non autorisé'
          ? 'Accès refusé : votre compte n’a pas le rôle Propriétaire en base (admin_users). Reconnectez-vous avec le compte owner, ou demandez une promotion de rôle.'
          : raw === 'Authentification requise' || raw === 'Session admin invalide'
            ? 'Session expirée — reconnectez-vous puis réessayez.'
            : raw
      setStatus({ kind: 'err', msg })
      return
    }
    logAudit({
      actor: user.email,
      action: 'user_credentials_replace',
      target: next,
      detail: `Ancien email : ${user.email}`,
    })
    setPassword('')
    setConfirm('')
    setStatus({
      kind: 'ok',
      msg: `Identifiants remplacés (${next}). Déconnectez-vous puis reconnectez-vous avec le nouvel email et le nouveau mot de passe.`,
    })
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Mon compte"
        subtitle="Remplacez vos identifiants temporaires par un email réel et un mot de passe fort."
      />

      {!isSupabase && (
        <div className="admin-empty" style={{ marginTop: 14, fontSize: 13 }}>
          Mode démo local — la gestion des mots de passe et des emails nécessite une connexion Supabase Auth.
          Connectez le projet (variables VITE_SUPABASE_*) pour activer ces actions.
        </div>
      )}

      {status.kind !== 'idle' && (
        <div
          className={`admin-status-live${status.kind === 'err' ? ' is-error' : status.kind === 'ok' ? ' is-ok' : ''}`}
          role="status"
          aria-live="polite"
          style={{ marginTop: 14 }}
        >
          {status.msg}
        </div>
      )}

      <section className="admin-wf-panel" style={{ marginTop: 16 }}>
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Identité</span>
            <h2>Email de connexion</h2>
          </div>
        </div>
        <p className="admin-page-sub" style={{ marginBottom: 12 }}>
          Compte actuel : <strong>{user?.email}</strong>
          {user?.role ? ` · ${ROLE_LABELS[user.role] ?? user.role}` : ''}
        </p>
        <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
          <FieldLabel>Nouvel email</FieldLabel>
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
            placeholder="vous@exemple.com"
            disabled={!isSupabase || status.kind === 'busy'}
          />
        </div>
        <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
          <PrimaryButton onClick={saveEmail} disabled={!isSupabase || status.kind === 'busy'}>
            {Icon.mail(14, '#fff')} Remplacer l’email
          </PrimaryButton>
        </div>
      </section>

      <section className="admin-wf-panel" style={{ marginTop: 16 }}>
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Sécurité</span>
            <h2>Mot de passe</h2>
          </div>
        </div>
        <p className="admin-page-sub" style={{ marginBottom: 12 }}>{passwordRulesSummary()}</p>
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <FieldLabel>Nouveau mot de passe</FieldLabel>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inp}
              placeholder="••••••••••••"
              disabled={!isSupabase || status.kind === 'busy'}
            />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <FieldLabel>Confirmer</FieldLabel>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={inp}
              placeholder="••••••••••••"
              disabled={!isSupabase || status.kind === 'busy'}
            />
          </div>
          {password.length > 0 && (
            <ul className="admin-ops-meta" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {pwdEval.checks.map((c) => (
                <li key={c.id} style={{ color: c.ok ? 'var(--admin-forest)' : 'inherit' }}>
                  {c.ok ? '✓' : '○'} {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
          <PrimaryButton onClick={savePassword} disabled={!isSupabase || status.kind === 'busy' || !pwdEval.ok}>
            Enregistrer le mot de passe
          </PrimaryButton>
          {user?.role === 'owner' && (
            <PrimaryButton onClick={replaceCredentials} disabled={!isSupabase || status.kind === 'busy' || !pwdEval.ok}>
              Remplacer email + mot de passe
            </PrimaryButton>
          )}
          <GhostButton
            color={t.muted}
            onClick={() => {
              setPassword('')
              setConfirm('')
              setStatus({ kind: 'idle', msg: '' })
            }}
          >
            Effacer
          </GhostButton>
        </div>
        {user?.role === 'owner' ? (
          <p className="admin-page-sub" style={{ marginTop: 10 }}>
            « Remplacer email + mot de passe » applique immédiatement les deux champs (identifiants temporaires → réels).
            Réservé au compte dont le rôle en base est <strong>Propriétaire</strong>.
          </p>
        ) : (
          <p className="admin-page-sub" style={{ marginTop: 10 }}>
            Votre rôle actuel « {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'} » permet de changer email ou mot de passe séparément.
            Le remplacement immédiat des deux champs est réservé au propriétaire.
          </p>
        )}
      </section>
    </div>
  )
}
