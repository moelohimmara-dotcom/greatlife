import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SiteProvider } from '@/contexts/SiteContext'
import { AuthProvider, ProtectedRoute } from '@/contexts/AuthContext'
import { PublicSite } from '@/sections/PublicSite'
import { LoginScreen } from '@/auth/LoginScreen'
import { Admin } from '@/admin/AdminPanel'

export default function App() {
  return (
    <SiteProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicSite />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SiteProvider>
  )
}
