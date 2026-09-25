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
 * Mon compte — modifier email et/ou mot de passe indépendamment
 * (sans passer par le dashboard Supabase). Backlog B-1.
 */
export function AccountSettings() {
  const { theme: t, dataSource } = useSite()
  const { user, refreshRole } = useAuth()
  const isSupabase = dataSource === 'supabase' && isSupabaseConfigured
  const inp = inputStyle(t)
  const isOwner = user?.role === 'owner'

  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [replaceEmail, setReplaceEmail] = useState(user?.email ?? '')
  const [replacePassword, setReplacePassword] = useState('')
  const [replaceConfirm, setReplaceConfirm] = useState('')
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({
    kind: 'idle',
    msg: '',
  })

  const isBusy = status.kind === 'busy'
  const pwdEval = evaluatePassword(password, user?.email ?? email)
  const replacePwdEval = evaluatePassword(replacePassword, replaceEmail)

  const mapAuthError = (raw: string): string => {
    if (/admin_users_email_key|duplicate key|unique constraint/i.test(raw)) {
      return 'Cet email est déjà utilisé par un autre compte admin'
    }
    if (raw === 'Acces non autorise' || raw === 'Accès non autorisé') {
      return 'Accès refusé : votre compte n’a pas le rôle Propriétaire en base (admin_users). Reconnectez-vous avec le compte owner, ou demandez une promotion de rôle.'
    }
    if (raw === 'Authentification requise' || raw === 'Session admin invalide') {
      return 'Session expirée — reconnectez-vous puis réessayez.'
    }
    return raw
  }

  /** Changement de mot de passe seul — email inchangé. */
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

    // Owner : Edge Function (même email = password-only, déjà géré côté serveur).
    // Autres rôles : updateUser sur la session courante.
    if (isOwner && user?.email) {
      const res = await invokeManageAdminAuth({
        action: 'set-credentials',
        email: user.email,
        name: user.name,
        password,
        role: 'owner',
        previousEmail: user.email,
      })
      if (!res.ok) {
        // Repli session si la fonction refuse / est indisponible
        const fallback = await updateOwnPassword(password)
        if (!fallback.ok) {
          setStatus({ kind: 'err', msg: mapAuthError(res.error || fallback.error || 'Échec de la mise à jour.') })
          return
        }
      }
    } else {
      const res = await updateOwnPassword(password)
      if (!res.ok) {
        setStatus({ kind: 'err', msg: res.error || 'Échec de la mise à jour.' })
        return
      }
    }

    setPassword('')
    setConfirm('')
    logAudit({
      actor: user?.email ?? '',
      action: 'user_password_update',
      target: user?.email ?? '',
      detail: 'Mot de passe modifié depuis Mon compte (sans changer l’email)',
    })
    setStatus({ kind: 'ok', msg: 'Mot de passe mis à jour. Utilisez-le à la prochaine connexion.' })
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
    if (!isOwner) {
      setStatus({
        kind: 'err',
        msg: 'Seul le propriétaire peut remplacer immédiatement email et mot de passe. Utilisez les sections séparées ci-dessus, ou demandez au propriétaire.',
      })
      return
    }
    const next = replaceEmail.trim().toLowerCase()
    if (!isValidEmail(next)) {
      setStatus({ kind: 'err', msg: 'Adresse email invalide.' })
      return
    }
    if (!replacePwdEval.ok) {
      setStatus({ kind: 'err', msg: replacePwdEval.errors[0] || 'Mot de passe trop faible.' })
      return
    }
    if (replacePassword !== replaceConfirm) {
      setStatus({ kind: 'err', msg: 'Les deux mots de passe ne correspondent pas.' })
      return
    }
    setStatus({ kind: 'busy', msg: 'Remplacement des identifiants…' })
    const res = await invokeManageAdminAuth({
      action: 'set-credentials',
      email: next,
      name: user?.name,
      password: replacePassword,
      role: 'owner',
      previousEmail: user?.email,
    })
    if (!res.ok) {
      setStatus({ kind: 'err', msg: mapAuthError(res.error || 'Échec du remplacement.') })
      return
    }
    logAudit({
      actor: user?.email ?? '',
      action: 'user_credentials_replace',
      target: next,
      detail: `Ancien email : ${user?.email ?? ''}`,
    })
    setReplacePassword('')
    setReplaceConfirm('')
    setStatus({
      kind: 'ok',
      msg: `Identifiants remplacés (${next}). Déconnectez-vous puis reconnectez-vous avec le nouvel email et le nouveau mot de passe.`,
    })
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Mon compte"
        subtitle="Modifiez l’email ou le mot de passe séparément — pas besoin de toucher aux deux."
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

      <section className="admin-wf-panel" style={{ marginTop: 16 }} aria-labelledby="account-email-heading">
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Identité</span>
            <h2 id="account-email-heading">Email de connexion</h2>
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
            disabled={!isSupabase || isBusy}
          />
        </div>
        <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
          <PrimaryButton onClick={saveEmail} disabled={!isSupabase || isBusy}>
            {Icon.mail(14, '#fff')} Remplacer l’email
          </PrimaryButton>
        </div>
      </section>

      <section className="admin-wf-panel" style={{ marginTop: 16 }} aria-labelledby="account-password-heading">
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Sécurité</span>
            <h2 id="account-password-heading">Changer le mot de passe</h2>
          </div>
        </div>
        <p className="admin-page-sub" style={{ marginBottom: 8 }}>
          Changez uniquement le mot de passe — l’email reste inchangé.
        </p>
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
              disabled={!isSupabase || isBusy}
            />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <FieldLabel>Confirmation du mot de passe</FieldLabel>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={inp}
              placeholder="••••••••••••"
              disabled={!isSupabase || isBusy}
            />
          </div>
          <ul className="admin-ops-meta" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {pwdEval.checks.map((c) => (
              <li key={c.id} style={{ color: password.length === 0 ? 'inherit' : c.ok ? 'var(--admin-forest)' : 'inherit' }}>
                {password.length > 0 && c.ok ? '✓' : '○'} {c.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-ops-actions" style={{ marginTop: 14, justifyContent: 'flex-start' }}>
          <PrimaryButton
            onClick={savePassword}
            disabled={!isSupabase || isBusy}
            title="Enregistre le nouveau mot de passe sans modifier l’email"
          >
            {Icon.lock(14, '#fff')} Enregistrer le mot de passe
          </PrimaryButton>
          <GhostButton
            color={t.muted}
            onClick={() => {
              setPassword('')
              setConfirm('')
              setStatus({ kind: 'idle', msg: '' })
            }}
            disabled={isBusy}
          >
            Effacer
          </GhostButton>
        </div>
        <p className="admin-page-sub" style={{ marginTop: 10 }}>
          Mot de passe oublié hors session ? Utilisez « Mot de passe oublié ? » sur l’écran de connexion.
        </p>
      </section>

      {isOwner && (
        <section className="admin-wf-panel" style={{ marginTop: 16 }} aria-labelledby="account-replace-heading">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Avancé · Propriétaire</span>
              <h2 id="account-replace-heading">Remplacer email + mot de passe</h2>
            </div>
          </div>
          <p className="admin-page-sub" style={{ marginBottom: 12 }}>
            Applique immédiatement un nouvel email et un nouveau mot de passe (identifiants temporaires → réels).
            Pour changer seulement le mot de passe, utilisez la section « Changer le mot de passe » ci-dessus.
          </p>
          <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <FieldLabel>Nouvel email</FieldLabel>
              <Input
                type="email"
                autoComplete="username"
                value={replaceEmail}
                onChange={(e) => setReplaceEmail(e.target.value)}
                style={inp}
                placeholder="vous@exemple.com"
                disabled={!isSupabase || isBusy}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <FieldLabel>Nouveau mot de passe</FieldLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={replacePassword}
                onChange={(e) => setReplacePassword(e.target.value)}
                style={inp}
                placeholder="••••••••••••"
                disabled={!isSupabase || isBusy}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <FieldLabel>Confirmation du mot de passe</FieldLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={replaceConfirm}
                onChange={(e) => setReplaceConfirm(e.target.value)}
                style={inp}
                placeholder="••••••••••••"
                disabled={!isSupabase || isBusy}
              />
            </div>
            {replacePassword.length > 0 && (
              <ul className="admin-ops-meta" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                {replacePwdEval.checks.map((c) => (
                  <li key={c.id} style={{ color: c.ok ? 'var(--admin-forest)' : 'inherit' }}>
                    {c.ok ? '✓' : '○'} {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
            <PrimaryButton onClick={replaceCredentials} disabled={!isSupabase || isBusy}>
              Remplacer email + mot de passe
            </PrimaryButton>
          </div>
        </section>
      )}
    </div>
  )
}
