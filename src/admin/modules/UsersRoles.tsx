import React, { useState, useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { ROLES, canDo, ROLE_LABELS, ROLE_DESCRIPTIONS, ALL_MODULES, permLevelFor, MODULE_ACCESS, CRUD_ACTIONS, computeEffectiveAccess, roleSummary, type RbacOverrides, type CrudAction } from '@/data/rbac'
import { upsertAdminUser, deleteAdminUser, fetchAuditLog, logAudit, updateAdminUserStatus, setUserInvitedAt, type AuditEntry } from '@/lib/repository'
import { invokeReplyEmail, sendMagicLink, invokeManageAdminAuth } from '@/lib/supabase'
import { isValidEmail, evaluatePassword, passwordRulesSummary } from '@/lib/password'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { dateFr, ADMIN_URL } from '@/admin/shared'

const ROLE_OPTIONS = ROLES.map(r => ({ id: r.id, name: r.name }))

export function emailErrLabel(err?: string): string {
  if (!err) return 'raison inconnue'
  if (err === 'not-configured') return 'Supabase non configuré'
  if (err === 'network') return 'erreur réseau'
  if (err === 'no-credentials') return 'secrets SMTP manquants (SMTP_USER/SMTP_PASS)'
  if (err === 'Authentification requise' || err === 'Session admin invalide') return 'authentification admin requise'
  if (err === 'Acces non autorise' || err === 'Accès non autorisé') return 'accès non autorisé'
  return err
}

export function UsersRoles() {
  const { theme: t, dataSource, adminUsers, refreshAdminUsers, rbacOverrides, saveRbac } = useSite()
  const { user: currentUser, refreshRole } = useAuth()
  const isOwner = currentUser?.role === 'owner'
  const permColor = (p: 'write' | 'read' | 'none') => p === 'write' ? t.accent : p === 'read' ? t.primary : t.muted
  const permIcon = (p: 'write' | 'read' | 'none') => p === 'write' ? Icon.write(13, t.accent) : p === 'read' ? Icon.eye(13, t.primary) : '—'

  const isSupabase = dataSource === 'supabase'
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [editing, setEditing] = useState<{
    id?: string
    email: string
    name: string
    role: string
    password: string
    confirm: string
    previousEmail?: string
    mode: 'user' | 'tester' | 'credentials'
  } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const inp = inputStyle(t)

  const savedOverrides = rbacOverrides ?? null
  const [pendingOverrides, setPendingOverrides] = useState<RbacOverrides | null>(null)
  const effAccess = computeEffectiveAccess(pendingOverrides ?? savedOverrides)
  const pendingCount = (() => {
    if (!pendingOverrides) return 0
    let n = 0
    for (const m of ALL_MODULES) for (const a of CRUD_ACTIONS) {
      const p = pendingOverrides[m]?.[a]
      const s = savedOverrides?.[m]?.[a] ?? MODULE_ACCESS[m].actions[a]
      const pj = p ? JSON.stringify([...p].sort()) : null
      const sj = s ? JSON.stringify([...s].sort()) : null
      if (pj !== sj) n++
    }
    return n
  })()
  const [rbacBusy, setRbacBusy] = useState(false)
  const [rbacStatus, setRbacStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; msg: string }>({ kind: 'idle', msg: '' })
  const [moduleQuery, setModuleQuery] = useState('')
  const filteredModules = ALL_MODULES.filter(m => MODULE_ACCESS[m].module.toLowerCase().includes(moduleQuery.trim().toLowerCase()))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const RBAC_ACTIONS_SET = new Set(['user_create', 'user_role_update', 'user_delete', 'rbac_update', 'rbac_reset'])
  const [rbacHistory, setRbacHistory] = useState<AuditEntry[]>([])
  const [auditAll, setAuditAll] = useState<AuditEntry[]>([])
  const [rbacHistOpen, setRbacHistOpen] = useState(false)
  useEffect(() => {
    if (dataSource !== 'supabase') return
    let active = true
    const refresh = async () => {
      const res = await fetchAuditLog()
      if (!active || !res.fromDb) return
      setAuditAll(res.data)
      setRbacHistory(res.data.filter(e => RBAC_ACTIONS_SET.has(e.action)))
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [dataSource])
  const userActivity = (email: string) => auditAll.filter(e => e.actor.toLowerCase() === email.toLowerCase())

  const actionsFor = (m: string): CrudAction[] => CRUD_ACTIONS.filter(act => MODULE_ACCESS[m].actions[act] !== undefined)
  const roleHas = (m: string, a: CrudAction, role: string): boolean => {
    const roles = effAccess[m].actions[a]
    return roles ? roles.includes(role) : false
  }
  const isLocked = (m: string, role: string): boolean =>
    m === 'users' && role === 'owner'
  const togglePerm = (m: string, a: CrudAction, role: string) => {
    if (!isOwner) return
    if (isLocked(m, role)) return
    const base = pendingOverrides ?? savedOverrides ?? {}
    const next: RbacOverrides = { ...base }
    const cur = effAccess[m].actions[a] ?? []
    const has = cur.includes(role)
    const updated = has ? cur.filter(r => r !== role) : [...cur, role]
    next[m] = { ...next[m], [a]: updated }
    setPendingOverrides(next)
  }
  const discardPerms = () => {
    setPendingOverrides(null)
    setRbacStatus({ kind: 'idle', msg: '' })
  }
  const commitPerms = async () => {
    if (!isOwner || !pendingOverrides) return
    setRbacBusy(true)
    const res = await saveRbac(pendingOverrides)
    setRbacBusy(false)
    if (res.ok) {
      let mailFail = 0
      let mailTotal = 0
      for (const m of ALL_MODULES) for (const a of CRUD_ACTIONS) {
        const p = pendingOverrides[m]?.[a]
        const s = savedOverrides?.[m]?.[a] ?? MODULE_ACCESS[m].actions[a]
        const pj = p ? JSON.stringify([...p].sort()) : null
        const sj = s ? JSON.stringify([...s].sort()) : null
        if (pj !== sj && p) {
          const before = s ?? []
          const added = p.filter(r => !before.includes(r))
          const removed = before.filter(r => !p.includes(r))
          for (const role of [...added, ...removed]) {
            const granted = added.includes(role)
            logAudit({ actor: currentUser?.email ?? '', action: 'rbac_update', target: `${MODULE_ACCESS[m].module} / ${ROLE_LABELS[role] ?? role}`, detail: `${a} ${granted ? 'ajoutée' : 'retirée'}` })
            const permLabel = a === 'create' ? 'Création' : a === 'update' ? 'Modification' : a === 'delete' ? 'Suppression' : 'Publication'
            const permText = `${permLabel} sur le module « ${MODULE_ACCESS[m].module} » ${granted ? 'vous a été accordée' : 'vous a été retirée'}.`
            for (const u of adminUsers.filter(u => u.role === role)) {
              mailTotal++
              const rs = roleSummary(role)
              const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
              const r = await invokeReplyEmail({
                to: u.email,
                subject: `Greatlife - Mise à jour de vos permissions (${ROLE_LABELS[role] ?? role})`,
                replyMessage: `Bonjour ${u.name},

Vos permissions d'accès au panneau d'administration Greatlife ont été modifiées.

Rôle : ${ROLE_LABELS[role] ?? role}
${permText}

Récapitulatif de votre rôle : ${rs.modulesWrite} module(s) en écriture, ${rs.modulesRead} en lecture, ${rs.actionsGranted}/${rs.actionsTotal} actions autorisées.

Pour accéder au panneau d'administration, cliquez sur le lien suivant :
${ADMIN_URL}

Cette modification a été effectuée par ${currentUser?.name ?? currentUser?.email ?? 'un administrateur'} le ${dateStr}. Si vous n'êtes pas à l'origine de cette demande, contactez le propriétaire.

— L'équipe Greatlife`,
                replyFromName: 'Greatlife',
              })
              if (!r.ok) mailFail++
            }
          }
        }
      }
      setPendingOverrides(null)
      const okMsg = 'Permissions enregistrées.'
      if (mailTotal === 0) {
        setRbacStatus({ kind: 'ok', msg: okMsg })
      } else if (mailFail === 0) {
        setRbacStatus({ kind: 'ok', msg: `${okMsg} ${mailTotal} email(s) de notification envoyé(s).` })
      } else {
        setRbacStatus({ kind: 'err', msg: `${okMsg} — ${mailFail}/${mailTotal} email(s) non envoyé(s) (vérifiez les secrets SMTP et l'Edge Function).` })
      }
      refreshRole().catch(() => {})
    } else {
      setRbacStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
    setTimeout(() => setRbacStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 2500)
  }
  const resetPerms = async () => {
    if (!isOwner) return
    setPendingOverrides(null)
    setRbacBusy(true)
    const res = await saveRbac(null)
    setRbacBusy(false)
    if (res.ok) {
      logAudit({ actor: currentUser?.email ?? '', action: 'rbac_reset', target: 'Matrice globale', detail: 'Réinitialisation' })
      let mailFail = 0
      for (const u of adminUsers) {
        const rs = roleSummary(u.role)
        const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
        const r = await invokeReplyEmail({
          to: u.email,
          subject: 'Greatlife - Réinitialisation des permissions',
          replyMessage: `Bonjour ${u.name},

La matrice des permissions d'accès au panneau d'administration Greatlife a été réinitialisée à ses valeurs par défaut.

Rôle : ${ROLE_LABELS[u.role] ?? u.role}
Récapitulatif : ${rs.modulesWrite} module(s) en écriture, ${rs.modulesRead} en lecture, ${rs.actionsGranted}/${rs.actionsTotal} actions autorisées.

Pour accéder au panneau d'administration, cliquez sur le lien suivant :
${ADMIN_URL}

Cette réinitialisation a été effectuée par ${currentUser?.name ?? currentUser?.email ?? 'un administrateur'} le ${dateStr}. Si vous n'êtes pas à l'origine de cette demande, contactez le propriétaire.

— L'équipe Greatlife`,
          replyFromName: 'Greatlife',
        })
        if (!r.ok) mailFail++
      }
      const okMsg = 'Permissions réinitialisées (valeurs par défaut).'
      if (mailFail === 0) {
        setRbacStatus({ kind: 'ok', msg: `${okMsg} ${adminUsers.length} email(s) envoyé(s).` })
      } else {
        setRbacStatus({ kind: 'err', msg: `${okMsg} — ${mailFail}/${adminUsers.length} email(s) non envoyé(s) (vérifiez les secrets SMTP et l'Edge Function).` })
      }
      refreshRole().catch(() => {})
    } else {
      setRbacStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
  }

  const startAdd = () => setEditing({ email: '', name: '', role: 'guest', password: '', confirm: '', mode: 'user' })
  const startInviteTester = () =>
    setEditing({ email: '', name: '', role: 'guest', password: '', confirm: '', mode: 'tester' })
  const startEdit = (u: { id: string; email: string; name: string; role: string }) =>
    setEditing({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      password: '',
      confirm: '',
      previousEmail: u.email,
      mode: 'user',
    })
  const startReplaceCredentials = (u: { id: string; email: string; name: string; role: string }) =>
    setEditing({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      password: '',
      confirm: '',
      previousEmail: u.email,
      mode: 'credentials',
    })

  const saveEdit = async () => {
    if (!editing) return
    if (!editing.email.trim() || !editing.name.trim()) {
      setStatus({ kind: 'err', msg: 'Email et nom requis.' }); return
    }
    if (!isValidEmail(editing.email)) {
      setStatus({ kind: 'err', msg: 'Adresse email invalide.' }); return
    }
    const wantsPassword = editing.password.trim().length > 0 || editing.mode === 'tester' || editing.mode === 'credentials'
    if (wantsPassword) {
      if (!editing.password.trim()) {
        setStatus({ kind: 'err', msg: 'Mot de passe requis pour créer ou remplacer les identifiants.' }); return
      }
      const pwd = evaluatePassword(editing.password, editing.email)
      if (!pwd.ok) {
        setStatus({ kind: 'err', msg: pwd.errors[0] || 'Mot de passe trop faible.' }); return
      }
      if (editing.password !== editing.confirm) {
        setStatus({ kind: 'err', msg: 'Les deux mots de passe ne correspondent pas.' }); return
      }
    }
    const isSelfEdit = !!editing.id && editing.email.trim().toLowerCase() === currentEmail
    if (isSelfEdit && isOwner && editing.role !== 'owner') {
      setStatus({ kind: 'err', msg: 'Vous ne pouvez pas rétrograder votre propre rôle propriétaire.' }); return
    }
    if (editing.id) {
      const target = adminUsers.find(u => u.id === editing.id)
      const otherOwners = adminUsers.filter(u => u.role === 'owner' && u.id !== editing.id).length
      if (target?.role === 'owner' && editing.role !== 'owner' && otherOwners === 0) {
        setStatus({ kind: 'err', msg: 'Impossible : il faut au moins un propriétaire.' }); return
      }
    }

    const dest = editing.email.trim().toLowerCase()
    const role = editing.mode === 'tester' ? 'guest' : editing.role

    // Création / remplacement d'identifiants Auth (email + mdp) via Edge Function.
    if (wantsPassword && isSupabase) {
      setStatus({ kind: 'busy', msg: editing.mode === 'tester' ? 'Invitation du testeur…' : 'Enregistrement des identifiants…' })
      const authRes = await invokeManageAdminAuth({
        action: editing.mode === 'tester' ? 'invite-tester' : 'set-credentials',
        email: dest,
        name: editing.name.trim(),
        password: editing.password,
        role,
        previousEmail: editing.previousEmail && editing.previousEmail.toLowerCase() !== dest
          ? editing.previousEmail.toLowerCase()
          : editing.mode === 'credentials'
            ? editing.previousEmail?.toLowerCase()
            : undefined,
        sendInviteEmail: editing.mode === 'tester' || !editing.id,
      })
      if (!authRes.ok) {
        // Repli gracieux : on enregistre quand même la ligne admin_users + magic link.
        setStatus({ kind: 'busy', msg: `Identifiants Auth indisponibles (${emailErrLabel(authRes.error)}). Enregistrement du rôle + lien magique…` })
        const res = await upsertAdminUser({
          id: editing.id,
          email: dest,
          name: editing.name.trim(),
          role,
        })
        if (!res.ok) {
          setStatus({ kind: 'err', msg: res.error || authRes.error || 'Échec.' })
          return
        }
        let magic: { ok: boolean; error?: string } = { ok: false }
        magic = await sendMagicLink(dest)
        if (magic.ok) await setUserInvitedAt(dest)
        setEditing(null)
        await refreshAdminUsers()
        setStatus({
          kind: magic.ok ? 'ok' : 'err',
          msg: magic.ok
            ? `Rôle enregistré pour ${dest}. Lien magique envoyé (le mot de passe n’a pas pu être posé : ${emailErrLabel(authRes.error)}).`
            : `Rôle enregistré, mais ni mot de passe ni invitation (${emailErrLabel(authRes.error)} / ${emailErrLabel(magic.error)}).`,
        })
        return
      }
      logAudit({
        actor: currentUser?.email ?? '',
        action: editing.mode === 'tester' ? 'user_invite_tester' : editing.id ? 'user_credentials_update' : 'user_create',
        target: dest,
        detail: `Rôle : ${ROLE_LABELS[role] ?? role}`,
      })
      setEditing(null)
      await refreshAdminUsers()
      refreshRole().catch(() => {})
      const base = editing.mode === 'tester'
        ? `Testeur invité : ${dest}.`
        : editing.mode === 'credentials'
          ? `Identifiants mis à jour pour ${dest}.`
          : editing.id
            ? 'Utilisateur modifié.'
            : 'Utilisateur créé avec email et mot de passe.'
      if (authRes.inviteSent) {
        setStatus({ kind: 'ok', msg: `${base} Courriel d’invitation envoyé.` })
      } else if (authRes.inviteError) {
        setStatus({ kind: 'ok', msg: `${base} Invitation email non envoyée (${emailErrLabel(authRes.inviteError)}).` })
      } else {
        setStatus({ kind: 'ok', msg: base })
      }
      return
    }

    if (wantsPassword && !isSupabase) {
      setStatus({ kind: 'err', msg: 'Mode démo — impossible de poser un mot de passe Auth. Connectez Supabase.' })
      return
    }

    setStatus({ kind: 'busy', msg: 'Enregistrement…' })
    const res = await upsertAdminUser({
      id: editing.id,
      email: dest,
      name: editing.name.trim(),
      role,
    })
    if (res.ok) {
      logAudit({
        actor: currentUser?.email ?? '',
        action: editing.id ? 'user_role_update' : 'user_create',
        target: dest,
        detail: `Rôle : ${ROLE_LABELS[role] ?? role}`,
      })
      const rs = roleSummary(role)
      const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
      const mail = await invokeReplyEmail({
        to: dest,
        subject: editing.mode === 'tester'
          ? 'Greatlife - Invitation testeur'
          : 'Greatlife - Votre accès au panneau d\'administration',
        replyMessage: `Bonjour ${editing.name.trim()},

Votre compte d'administration Greatlife a été ${editing.id ? 'modifié' : 'créé'}.

Rôle attribué : ${ROLE_LABELS[role] ?? role}${ROLE_DESCRIPTIONS[role] ? '\n' + ROLE_DESCRIPTIONS[role] : ''}
Récapitulatif de votre rôle : ${rs.modulesWrite} module(s) en écriture, ${rs.modulesRead} en lecture, ${rs.actionsGranted}/${rs.actionsTotal} actions autorisées.

Pour accéder au panneau d'administration, cliquez sur le lien suivant :
${ADMIN_URL}

Un lien de connexion sécurisé à usage unique vous a également été envoyé séparément par Supabase : cliquez dessus pour vous connecter sans mot de passe. Cette modification a été effectuée par ${currentUser?.name ?? currentUser?.email ?? 'un administrateur'} le ${dateStr}. Si vous n'êtes pas à l'origine de cette demande, contactez le propriétaire.

— L'équipe Greatlife`,
        replyFromName: 'Greatlife',
      })
      let magic: { ok: boolean; error?: string } = { ok: false }
      if (isSupabase) {
        magic = await sendMagicLink(dest)
        if (magic.ok) await setUserInvitedAt(dest)
      }
      setEditing(null)
      await refreshAdminUsers()
      refreshRole().catch(() => {})
      const okMsg = editing.id ? 'Utilisateur modifié.' : 'Utilisateur ajouté.'
      if (mail.ok && (!isSupabase || magic.ok)) {
        setStatus({ kind: 'ok', msg: `${okMsg} Email de notification + lien de connexion envoyés à ${dest}.` })
      } else if (mail.ok && isSupabase && !magic.ok) {
        setStatus({ kind: 'ok', msg: `${okMsg} Email envoyé à ${dest}. Lien de connexion non envoyé (${emailErrLabel(magic.error)}).` })
      } else {
        setStatus({ kind: 'err', msg: `${okMsg} — Email non envoyé (${emailErrLabel(mail.error)}).` })
      }
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
  }

  const remove = async (id: string, name: string) => {
    const target = adminUsers.find(u => u.id === id)
    if (target?.role === 'owner' && adminUsers.filter(u => u.role === 'owner').length <= 1) {
      setStatus({ kind: 'err', msg: 'Impossible : il faut au moins un propriétaire.' }); return
    }
    setBusyId(id)
    const res = await deleteAdminUser(id)
    setBusyId(null)
    if (res.ok) {
      logAudit({
        actor: currentUser?.email ?? '',
        action: 'user_delete',
        target: name,
        detail: 'Suppression utilisateur',
      })
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `${name} supprimé.` })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la suppression.' })
    }
  }

  const resendInvite = async (u: { id: string; email: string; name: string; role: string }) => {
    if (!isSupabase) { setStatus({ kind: 'err', msg: 'Supabase non configuré.' }); return }
    setBusyId(u.id)
    const magic = await sendMagicLink(u.email)
    if (magic.ok) await setUserInvitedAt(u.email)
    setBusyId(null)
    if (magic.ok) {
      logAudit({ actor: currentUser?.email ?? '', action: 'user_invite_resend', target: u.email, detail: `Rôle : ${ROLE_LABELS[u.role] ?? u.role}` })
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `Lien de connexion renvoyé à ${u.email}.` })
    } else {
      setStatus({ kind: 'err', msg: `Lien non envoyé (${emailErrLabel(magic.error)}).` })
    }
    setTimeout(() => setStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 2500)
  }

  const toggleActive = async (u: { id: string; email: string; name: string; role: string; active?: boolean }) => {
    if (u.role === 'owner') { setStatus({ kind: 'err', msg: 'Impossible de suspendre un propriétaire.' }); return }
    const next = !u.active
    setBusyId(u.id)
    const res = await updateAdminUserStatus(u.id, next)
    setBusyId(null)
    if (res.ok) {
      logAudit({ actor: currentUser?.email ?? '', action: next ? 'user_activate' : 'user_suspend', target: u.email, detail: next ? 'Compte réactivé' : 'Compte suspendu' })
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `${u.name} ${next ? 'réactivé' : 'suspendu'}.` })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
    setTimeout(() => setStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 2500)
  }

  const inviteAllPending = async () => {
    if (!isSupabase) { setStatus({ kind: 'err', msg: 'Supabase non configuré.' }); return }
    const pending = adminUsers.filter(u => !u.invited_at && u.role !== 'owner')
    if (pending.length === 0) { setStatus({ kind: 'ok', msg: 'Aucune invitation en attente.' }); return }
    setStatus({ kind: 'busy', msg: `Envoi de ${pending.length} invitation(s)...` })
    let ok = 0
    let fail = 0
    for (const u of pending) {
      const r = await sendMagicLink(u.email)
      if (r.ok) { await setUserInvitedAt(u.email); ok++ } else { fail++ }
    }
    await refreshAdminUsers()
    if (fail === 0) setStatus({ kind: 'ok', msg: `${ok} invitation(s) envoyée(s).` })
    else setStatus({ kind: 'err', msg: `${ok} envoyée(s), ${fail} échec(s).` })
    setTimeout(() => setStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 3000)
  }

  const currentEmail = currentUser?.email?.toLowerCase()

  const whenLabel = (u: { invited_at?: string | null; created_at?: string }) => {
    if (u.invited_at) return dateFr(u.invited_at)
    if (u.created_at) return dateFr(u.created_at)
    return '—'
  }

  const activeUsers = adminUsers.filter(u => u.active !== false).length
  const pendingInvites = adminUsers.filter(u => !u.invited_at && u.role !== 'owner').length
  const ownerCount = adminUsers.filter(u => u.role === 'owner').length

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Utilisateurs & rôles"
        subtitle="Contrôlez qui peut consulter ou modifier chaque espace. Invitez un testeur ou remplacez des identifiants temporaires."
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <GhostButton
              color={t.primary}
              onClick={startInviteTester}
              disabled={!isSupabase || !!editing || !canDo('users', 'create', currentUser?.role ?? '')}
            >
              {Icon.mail(14, t.primary)} Inviter un testeur
            </GhostButton>
            <PrimaryButton onClick={startAdd} disabled={!isSupabase || !!editing || !canDo('users', 'create', currentUser?.role ?? '')}>
              {Icon.plus(14, '#fff')} Inviter un utilisateur
            </PrimaryButton>
          </div>
        )}
      />

      {!isSupabase && (
        <div className="admin-empty" style={{ marginTop: 14, fontSize: 13 }}>
          Mode local — la gestion des utilisateurs nécessite une connexion en ligne.
        </div>
      )}

      <div className="admin-wf-menu-summary" aria-label="Résumé de l’équipe">
        <div>
          <strong>{adminUsers.length}</strong>
          <span>Utilisateurs</span>
          <small>{activeUsers} actif{activeUsers > 1 ? 's' : ''}</small>
        </div>
        <div>
          <strong>{ownerCount}</strong>
          <span>Propriétaires</span>
          <small>accès complet</small>
        </div>
        <div>
          <strong>{pendingInvites}</strong>
          <span>Invitations</span>
          <small>{pendingInvites > 0 ? 'en attente' : 'à jour'}</small>
        </div>
        <div className="is-status">
          <strong>●</strong>
          <span>{pendingCount > 0 ? `${pendingCount} droit(s) en attente` : 'Droits à jour'}</span>
          <small>{isOwner ? 'vous pouvez modifier' : 'lecture'}</small>
        </div>
      </div>

      <section className="admin-wf-panel" style={{ marginTop: 16 }}>
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Équipe</span>
            <h2>Utilisateurs</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="admin-chip">{adminUsers.length}</span>
            {isSupabase && isOwner && pendingInvites > 0 && (
              <GhostButton color={t.primary} onClick={inviteAllPending} disabled={status.kind === 'busy'}>Inviter tous les non-invités</GhostButton>
            )}
          </div>
        </div>

        {status.kind !== 'idle' && (
          <div className={`admin-status-live${status.kind === 'err' ? ' is-error' : status.kind === 'ok' ? ' is-ok' : ''}`} role="status" aria-live="polite" style={{ marginBottom: 12 }}>
            {status.msg}
          </div>
        )}

        {editing && (
          <div className="admin-detail-panel" style={{ position: 'static', maxHeight: 'none', marginBottom: 12 }}>
            <div className="admin-wf-eyebrow" style={{ marginBottom: 8 }}>
              {editing.mode === 'tester'
                ? 'Invitation testeur'
                : editing.mode === 'credentials'
                  ? 'Remplacer les identifiants'
                  : editing.id
                    ? 'Modifier l’utilisateur'
                    : 'Nouvel utilisateur'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <FieldLabel>Nom</FieldLabel>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inp} placeholder="Nom complet" />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <FieldLabel>Email{editing.mode === 'credentials' ? ' (réel)' : ''}</FieldLabel>
                <Input
                  type="email"
                  value={editing.email}
                  onChange={e => setEditing({ ...editing, email: e.target.value })}
                  style={inp}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>
            {editing.mode !== 'tester' && (
              <div style={{ display: 'grid', gap: 6, maxWidth: 260, marginTop: 12 }}>
                <FieldLabel>Rôle</FieldLabel>
                <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
                  <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-paper-muted)', padding: '11px 14px', fontSize: 14 }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {ROLE_DESCRIPTIONS[editing.role] && (
                  <span className="admin-page-sub">{ROLE_DESCRIPTIONS[editing.role]}</span>
                )}
              </div>
            )}
            {editing.mode === 'tester' && (
              <p className="admin-page-sub" style={{ marginTop: 12 }}>
                Le testeur reçoit le rôle « {ROLE_LABELS.guest} » : consultation seule, idéal pour une revue avant ouverture.
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <FieldLabel>
                  Mot de passe{editing.mode === 'user' && !editing.id ? ' (optionnel — sinon lien magique)' : ''}
                </FieldLabel>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={editing.password}
                  onChange={e => setEditing({ ...editing, password: e.target.value })}
                  style={inp}
                  placeholder="••••••••••••"
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <FieldLabel>Confirmer le mot de passe</FieldLabel>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={editing.confirm}
                  onChange={e => setEditing({ ...editing, confirm: e.target.value })}
                  style={inp}
                  placeholder="••••••••••••"
                />
              </div>
            </div>
            {(editing.password.length > 0 || editing.mode === 'tester' || editing.mode === 'credentials') && (
              <div style={{ marginTop: 10 }}>
                <p className="admin-page-sub" style={{ marginBottom: 6 }}>{passwordRulesSummary()}</p>
                <ul className="admin-ops-meta" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  {evaluatePassword(editing.password, editing.email).checks.map(c => (
                    <li key={c.id} style={{ color: c.ok ? 'var(--admin-forest)' : 'inherit' }}>
                      {c.ok ? '✓' : '○'} {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
              <PrimaryButton onClick={saveEdit} disabled={status.kind === 'busy'}>
                {editing.mode === 'tester' ? 'Envoyer l’invitation' : editing.mode === 'credentials' ? 'Remplacer les identifiants' : 'Enregistrer'}
              </PrimaryButton>
              <GhostButton color={t.muted} onClick={() => setEditing(null)}>Annuler</GhostButton>
            </div>
          </div>
        )}

        {adminUsers.length === 0 ? (
          <p className="admin-loading">Aucun utilisateur en base. {isSupabase ? 'Cliquez sur « Inviter un utilisateur ».' : ''}</p>
        ) : (
          <div className="admin-wf-table admin-wf-users-table" role="table" aria-label="Liste des utilisateurs">
            <div className="admin-wf-table-row is-head admin-wf-users-row" role="row">
              <span role="columnheader">Nom</span>
              <span role="columnheader">Email</span>
              <span role="columnheader">Rôle</span>
              <span role="columnheader">Invitation / ajout</span>
              <span role="columnheader">Actions</span>
            </div>
            {adminUsers.map(u => {
              const role = ROLES.find(r => r.id === u.role) || ROLES.find(r => r.id === 'guest')!
              const isSelf = u.email.toLowerCase() === currentEmail
              return (
                <React.Fragment key={u.id}>
                  <div className={`admin-wf-table-row admin-wf-users-row${expandedId === u.id ? ' is-selected' : ''}`} role="row">
                    <strong role="cell">
                      {u.name}{isSelf ? ' (vous)' : ''}
                      {u.active === false && <span className="admin-chip is-danger" style={{ marginLeft: 8 }}>Suspendu</span>}
                      {u.active !== false && isSupabase && !u.invited_at && u.role !== 'owner' && (
                        <span className="admin-chip is-warn" style={{ marginLeft: 8 }}>À inviter</span>
                      )}
                    </strong>
                    <span role="cell" className="admin-ops-meta">{u.email}</span>
                    <span role="cell"><span className="admin-chip is-live">{role.name}</span></span>
                    <span role="cell" className="admin-mono" style={{ fontSize: 12, opacity: 0.7 }}>{whenLabel(u)}</span>
                    <span role="cell" className="admin-ops-actions" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {isSupabase && u.active !== false && !u.invited_at && u.role !== 'owner' && canDo('users', 'update', currentUser?.role ?? '') && (
                        <GhostButton color={t.primary} disabled={busyId === u.id} onClick={() => resendInvite(u)}>Inviter</GhostButton>
                      )}
                      {isSupabase && u.active !== false && u.invited_at && u.role !== 'owner' && canDo('users', 'update', currentUser?.role ?? '') && (
                        <GhostButton color={t.primary} disabled={busyId === u.id} onClick={() => resendInvite(u)}>Renvoyer</GhostButton>
                      )}
                      {isSupabase && u.role !== 'owner' && canDo('users', 'update', currentUser?.role ?? '') && (
                        <GhostButton color={u.active === false ? '#16a34a' : '#b8860b'} disabled={busyId === u.id} onClick={() => toggleActive(u)}>{u.active === false ? 'Réactiver' : 'Suspendre'}</GhostButton>
                      )}
                      <GhostButton color={t.primary} disabled={!isSupabase || busyId === u.id || !canDo('users', 'update', currentUser?.role ?? '')} onClick={() => startEdit(u)}>Modifier</GhostButton>
                      {isSupabase && canDo('users', 'update', currentUser?.role ?? '') && (
                        <GhostButton color={t.accent || t.primary} disabled={busyId === u.id || !!editing} onClick={() => startReplaceCredentials(u)}>
                          Identifiants
                        </GhostButton>
                      )}
                      <GhostButton color="#dc2626" disabled={!isSupabase || isSelf || busyId === u.id || !canDo('users', 'delete', currentUser?.role ?? '')} onClick={() => remove(u.id, u.name)}>{busyId === u.id ? '…' : 'Supprimer'}</GhostButton>
                      <GhostButton color={t.muted} onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>{expandedId === u.id ? 'Masquer' : 'Détails'}</GhostButton>
                    </span>
                  </div>
                  {expandedId === u.id && (
                    <div className="admin-user-detail">
                      {(() => {
                        const writeMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'write').map(m => MODULE_ACCESS[m].module)
                        const readMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'read').map(m => MODULE_ACCESS[m].module)
                        const noneMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'none').map(m => MODULE_ACCESS[m].module)
                        return (
                          <>
                            {writeMods.length > 0 && (
                              <div className="admin-user-detail-group">
                                <div className="admin-user-detail-label is-write">Écriture ({writeMods.length})</div>
                                <div className="admin-user-detail-chips">{writeMods.map(m => <span key={m} className="admin-chip is-live">{m}</span>)}</div>
                              </div>
                            )}
                            {readMods.length > 0 && (
                              <div className="admin-user-detail-group">
                                <div className="admin-user-detail-label is-read">Lecture seule ({readMods.length})</div>
                                <div className="admin-user-detail-chips">{readMods.map(m => <span key={m} className="admin-chip">{m}</span>)}</div>
                              </div>
                            )}
                            {noneMods.length > 0 && (
                              <div className="admin-user-detail-group">
                                <div className="admin-user-detail-label">Aucun accès ({noneMods.length})</div>
                                <div className="admin-user-detail-chips">{noneMods.map(m => <span key={m} className="admin-chip" style={{ opacity: 0.7 }}>{m}</span>)}</div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                      {(() => {
                        const acts = userActivity(u.email).slice(0, 8)
                        if (acts.length === 0 && dataSource !== 'supabase') return null
                        return (
                          <div className="admin-user-activity">
                            <div className="admin-user-detail-label">Activité récente ({acts.length})</div>
                            {acts.length === 0 ? (
                              <div className="admin-ops-meta">Aucune action enregistrée.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {acts.map(e => (
                                  <div key={e.id} className="admin-user-activity-row">
                                    <span className="admin-ops-meta"><span className="admin-chip" style={{ marginRight: 6 }}>{e.action}</span>{e.target}{e.detail ? ` — ${e.detail}` : ''}</span>
                                    <span className="admin-mono" style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>{e.created_at ? dateFr(e.created_at) : ''}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        )}
      </section>

      <section className="admin-wf-panel" style={{ marginTop: 16 }}>
      <div className="admin-wf-panel-head">
        <div>
          <span className="admin-wf-eyebrow">Accès</span>
          <h2>Matrice des accès</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {rbacStatus.kind !== 'idle' && (
            <span className={`admin-status-live${rbacStatus.kind === 'err' ? ' is-error' : ' is-ok'}`}>{rbacStatus.msg}</span>
          )}
          {isOwner && (
            <GhostButton color={t.muted} disabled={rbacBusy || !isSupabase} onClick={resetPerms}>Réinitialiser</GhostButton>
          )}
        </div>
      </div>
      {!isOwner && (
        <div className="admin-ops-meta" style={{ marginBottom: 10 }}>Lecture seule — seul le propriétaire peut modifier les permissions.</div>
      )}
      {pendingCount > 0 && (
        <div className="admin-rbac-pending">
          <span className="admin-rbac-pending-label">{pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente</span>
          <PrimaryButton onClick={commitPerms} disabled={rbacBusy || !isSupabase}>{rbacBusy ? 'Enregistrement…' : 'Enregistrer'}</PrimaryButton>
          <GhostButton color={t.muted} disabled={rbacBusy} onClick={discardPerms}>Annuler</GhostButton>
        </div>
      )}
      <div className="admin-toolbar" style={{ marginTop: 0, marginBottom: 10 }}>
        <div className="admin-search-field">
          <input value={moduleQuery} onChange={e => setModuleQuery(e.target.value)} placeholder="Rechercher un module…" aria-label="Rechercher un module" />
          <span className="admin-search-field-icon" aria-hidden="true">{Icon.search(13, t.muted)}</span>
        </div>
        {moduleQuery && <span className="admin-ops-meta">{filteredModules.length} module{filteredModules.length > 1 ? 's' : ''}</span>}
      </div>
      <div className="admin-rbac-stack">
        {ROLES.map(r => {
          const s = roleSummary(r.id)
          return (
            <div key={r.id} className="admin-rbac-role">
              <div className="admin-rbac-role-head">
                <div>
                  <div className="admin-rbac-role-title">{ROLE_LABELS[r.id] ?? r.name}</div>
                  <div className="admin-rbac-role-meta">{s.modulesWrite} écriture · {s.modulesRead} lecture · {s.actionsGranted}/{s.actionsTotal} actions</div>
                </div>
              </div>
              <div className="admin-rbac-modules">
                {filteredModules.map(m => {
                  const acts = actionsFor(m)
                  const p = permLevelFor(m, r.id)
                  const locked = isLocked(m, r.id)
                  const disabled = !isOwner || rbacBusy || locked
                  return (
                    <div key={m} className={`admin-rbac-module${p === 'write' ? ' is-write' : p === 'read' ? ' is-read' : ''}`}>
                      <div className={`admin-rbac-module-head${acts.length > 0 ? ' has-actions' : ''}`}>
                        <span className="admin-rbac-module-name">{MODULE_ACCESS[m].module}</span>
                        {acts.length === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: permColor(p) }}>{permIcon(p)}</span>}
                      </div>
                      {acts.length > 0 ? (
                        <div className="admin-rbac-actions">
                          {acts.map(a => {
                            const on = roleHas(m, a, r.id)
                            const aLabel = a === 'create' ? 'Créer' : a === 'update' ? 'Modif.' : a === 'delete' ? 'Suppr.' : 'Publ.'
                            return (
                              <div key={a} className={`admin-rbac-action${disabled ? ' is-disabled' : ''}`} title={locked ? 'Protégé (propriétaire)' : `${aLabel} : ${on ? 'autorisé' : 'interdit'}`}>
                                <Switch checked={on} onCheckedChange={() => togglePerm(m, a, r.id)} />
                                <span className={`admin-rbac-action-label${on ? ' is-on' : ''}`}>{aLabel}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="admin-rbac-module-level">{p === 'write' ? 'Écriture' : p === 'read' ? 'Lecture seule' : 'Aucun accès'}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="admin-rbac-footnote">
        <span>Les modules sans actions (ex. Tableau de bord, Journal) restent en lecture seule. Le rôle propriétaire sur le module Utilisateurs est protégé (anti-verrouillage).</span>
      </div>

      <div className="admin-rbac-hist">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 className="admin-editor-col-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Historique des changements RBAC
            <span className="admin-chip">{rbacHistory.length}</span>
          </h3>
          <GhostButton color={t.muted} onClick={() => setRbacHistOpen(o => !o)}>{rbacHistOpen ? 'Masquer' : 'Afficher'}</GhostButton>
        </div>
        {rbacHistOpen && (
          rbacHistory.length === 0 ? (
            <p className="admin-loading" style={{ marginTop: 0 }}>Aucun changement RBAC enregistré pour le moment.</p>
          ) : (
            <div className="admin-rbac-hist-list">
              {rbacHistory.slice(0, 50).map(e => (
                <div key={e.id} className="admin-rbac-hist-row">
                  <span className="admin-rbac-hist-when">{e.created_at ? new Date(e.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <span className="admin-rbac-hist-action">{e.action.replace(/_/g, ' ')}</span>
                  <span className="admin-ops-meta" style={{ flexShrink: 0 }}>{e.actor || 'système'}</span>
                  <span className="admin-ops-meta" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {e.target}</span>
                  <span className="admin-ops-meta" style={{ flexShrink: 0, fontSize: 11 }}>{e.detail}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      </section>
    </div>
  )
}


