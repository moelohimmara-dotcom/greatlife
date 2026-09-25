import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessModule, canWriteModule } from '@/data/rbac'
import { AccessBanner } from '@/admin/shared'
import { pathForModule, type AdminModuleKey } from '@/admin/routes'
import { PageEditorWrapper } from '@/admin/editor/PageEditorWrapper'
import { Dashboard } from '@/admin/modules/Dashboard'
import { OrdersManager } from '@/admin/modules/OrdersManager'
import { ReservationsManager } from '@/admin/modules/ReservationsManager'
import { MessagesManager } from '@/admin/modules/MessagesManager'
import { MenuEditor } from '@/admin/modules/MenuEditor'
import { ThemeEditor } from '@/admin/modules/ThemeEditor'
import { BlogEditor } from '@/admin/modules/BlogEditor'
import { MediaManager } from '@/admin/modules/MediaManager'
import { TeamContentsEditor } from '@/admin/modules/TeamContentsEditor'
import { VisibilityEditor } from '@/admin/modules/VisibilityEditor'
import { UsersRoles } from '@/admin/modules/UsersRoles'
import { FormsConfig } from '@/admin/modules/FormsConfig'
import { SettingsEditor } from '@/admin/modules/SettingsEditor'
import { ConsolePrefsEditor } from '@/admin/modules/ConsolePrefsEditor'
import { AuditManager } from '@/admin/modules/AuditManager'
import { AccountSettings } from '@/admin/modules/AccountSettings'

function ModuleFrame({ module, children }: { module: AdminModuleKey; children: React.ReactNode }) {
  const { user } = useAuth()
  const role = user?.role ?? 'guest'
  if (!canAccessModule(module, role)) {
    return <Navigate to="/admin" replace />
  }
  const readOnly = !canWriteModule(module, role)
  /*
    Journal et tableau de bord sont consultatifs par conception (pas d’écriture
    métier). On n’affiche pas « votre rôle ne permet pas… » et on ne gèle pas
    les clics : filtres, export et navigation restent utilisables.
  */
  const consultatif = module === 'dashboard' || module === 'audit'
  const editeurPleinEcran = module === 'content'
  const remplissageEditeur = editeurPleinEcran
    ? {
        position: 'absolute' as const,
        inset: 0,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        overflow: 'hidden' as const,
      }
    : undefined
  return (
    <div className="admin-module-frame" style={remplissageEditeur}>
      {readOnly && !consultatif && <AccessBanner />}
      <div
        style={{
          position: 'relative',
          pointerEvents: readOnly && !consultatif ? 'none' : 'auto',
          ...remplissageEditeur,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function DashboardPage() {
  return <ModuleFrame module="dashboard"><Dashboard /></ModuleFrame>
}

export function OrdersPage() {
  return <ModuleFrame module="orders"><OrdersManager /></ModuleFrame>
}

export function ReservationsPage() {
  return <ModuleFrame module="reservations"><ReservationsManager /></ModuleFrame>
}

export function MessagesPage() {
  return <ModuleFrame module="messages"><MessagesManager /></ModuleFrame>
}

export function AtelierPage() {
  const navigate = useNavigate()
  return (
    <ModuleFrame module="content">
      <PageEditorWrapper
        onQuitConsole={() => navigate('/admin')}
        onOuvrirApparence={() => navigate(pathForModule('theme'))}
      />
    </ModuleFrame>
  )
}

export function CartePage() {
  return <ModuleFrame module="menu"><MenuEditor /></ModuleFrame>
}

export function BlogPage() {
  return <ModuleFrame module="blog"><BlogEditor /></ModuleFrame>
}

export function MediathequePage() {
  return <ModuleFrame module="media"><MediaManager /></ModuleFrame>
}

export function EquipePage() {
  return <ModuleFrame module="team"><TeamContentsEditor /></ModuleFrame>
}

export function ApparencePage() {
  return <ModuleFrame module="theme"><ThemeEditor /></ModuleFrame>
}

export function VisibilitePage() {
  return <ModuleFrame module="visibility"><VisibilityEditor /></ModuleFrame>
}

export function ReglagesPage() {
  return <ModuleFrame module="settings"><SettingsEditor /></ModuleFrame>
}

export function PreferencesPage() {
  return <ModuleFrame module="consolePrefs"><ConsolePrefsEditor /></ModuleFrame>
}

export function FormulairesPage() {
  return <ModuleFrame module="forms"><FormsConfig /></ModuleFrame>
}

export function UtilisateursPage() {
  return <ModuleFrame module="users"><UsersRoles /></ModuleFrame>
}

export function MonComptePage() {
  return <ModuleFrame module="account"><AccountSettings /></ModuleFrame>
}

export function JournalPage() {
  return <ModuleFrame module="audit"><AuditManager /></ModuleFrame>
}

export { AdminShell as Admin } from '@/admin/AdminShell'
