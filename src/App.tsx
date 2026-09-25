import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SiteProvider } from '@/contexts/SiteContext'
import { AuthProvider, ProtectedRoute } from '@/contexts/AuthContext'
import { PublicSite } from '@/sections/PublicSite'
import { LoginScreen } from '@/auth/LoginScreen'
import { AdminShell } from '@/admin/AdminShell'
import {
  DashboardPage,
  OrdersPage,
  ReservationsPage,
  MessagesPage,
  AtelierPage,
  CartePage,
  BlogPage,
  MediathequePage,
  EquipePage,
  ApparencePage,
  VisibilitePage,
  ReglagesPage,
  PreferencesPage,
  FormulairesPage,
  UtilisateursPage,
  MonComptePage,
  JournalPage,
} from '@/admin/AdminPanel'

export default function App() {
  return (
    <SiteProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* CM-6 : langue dans le préfixe d'URL — `/en` et `/en/…` ; le FR reste `/`. */}
            <Route path="/" element={<PublicSite />} />
            <Route path="/en" element={<PublicSite />} />
            <Route path="/en/*" element={<PublicSite />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/admin" element={<ProtectedRoute><AdminShell /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="commandes" element={<OrdersPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="atelier" element={<AtelierPage />} />
              <Route path="carte" element={<CartePage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="mediatheque" element={<MediathequePage />} />
              <Route path="equipe" element={<EquipePage />} />
              <Route path="apparence" element={<ApparencePage />} />
              <Route path="visibilite" element={<VisibilitePage />} />
              <Route path="reglages" element={<ReglagesPage />} />
              <Route path="preferences" element={<PreferencesPage />} />
              <Route path="formulaires" element={<FormulairesPage />} />
              <Route path="utilisateurs" element={<UtilisateursPage />} />
              <Route path="mon-compte" element={<MonComptePage />} />
              <Route path="journal" element={<JournalPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SiteProvider>
  )
}
