import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ErrorBoundary } from './components/ErrorBoundary'

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CustomerDetailPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomerDetailPage })))
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage').then((m) => ({ default: m.OpportunitiesPage })))
const OpportunityDetailPage = lazy(() => import('./pages/OpportunityDetailPage').then((m) => ({ default: m.OpportunityDetailPage })))
const QuoteEditorPage = lazy(() => import('./pages/QuoteEditorPage').then((m) => ({ default: m.QuoteEditorPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

// ─── Data-router setup ─────────────────────────────────────────
// createBrowserRouter (i.p.v. <BrowserRouter>) is nodig om useBlocker
// te kunnen gebruiken voor de unsaved-changes guard. SPA-fallback wordt
// netjes geafgehandeld door de '*' catch-all.

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <L><HomePage /></L> },
          { path: 'customers', element: <L><CustomersPage /></L> },
          { path: 'customers/:id', element: <L><CustomerDetailPage /></L> },
          { path: 'opportunities', element: <L><OpportunitiesPage /></L> },
          { path: 'opportunities/new', element: <Navigate to="/opportunities?new=1" replace /> },
          { path: 'opportunities/:id', element: <L><OpportunityDetailPage /></L> },
          { path: 'opportunities/:id/quote/:quoteId', element: <L><QuoteEditorPage /></L> },
          { path: 'products', element: <L><ProductsPage /></L> },
          { path: 'settings', element: <L><SettingsPage /></L> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
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
