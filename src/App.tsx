import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CustomerDetailPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomerDetailPage })))
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage').then((m) => ({ default: m.OpportunitiesPage })))
const OpportunityDetailPage = lazy(() => import('./pages/OpportunityDetailPage').then((m) => ({ default: m.OpportunityDetailPage })))
const QuoteEditorPage = lazy(() => import('./pages/QuoteEditorPage').then((m) => ({ default: m.QuoteEditorPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGate />}>
        <Route element={<Layout />}>
          <Route index element={<L><HomePage /></L>} />
          <Route path="customers" element={<L><CustomersPage /></L>} />
          <Route path="customers/:id" element={<L><CustomerDetailPage /></L>} />
          <Route path="opportunities" element={<L><OpportunitiesPage /></L>} />
          <Route path="opportunities/:id" element={<L><OpportunityDetailPage /></L>} />
          <Route path="opportunities/:id/quote/:quoteId" element={<L><QuoteEditorPage /></L>} />
          <Route path="products" element={<L><ProductsPage /></L>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function L({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-sm text-[--color-muted]">Laden…</div>}>
      {children}
    </Suspense>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-[100dvh] grid place-items-center font-mono text-sm text-[--color-muted]">Laden…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
