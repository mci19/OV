import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { CustomersPage, CustomerDetailPage } from './pages/CustomersPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { OpportunityDetailPage } from './pages/OpportunityDetailPage'
import { QuoteEditorPage } from './pages/QuoteEditorPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGate />}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="opportunities/:id/quote/:quoteId" element={<QuoteEditorPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-[100dvh] grid place-items-center font-mono text-sm text-[--color-muted]">Laden…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
