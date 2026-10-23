import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './store/AppContext'
import Layout from './components/Layout'
import { ToastHost } from './components/ui'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Plan from './pages/Plan'
import Study from './pages/Study'
import Progress from './pages/Progress'
import Account from './pages/Account'
import Library from './pages/Library'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function Shell({ children, wide }) {
  return <Layout wide={wide}>{children}</Layout>
}

function AppRoutes() {
  const { toasts, profile } = useApp()

  const guarded = (node) => (profile ? node : <Navigate to="/" replace />)

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            profile ? (
              <Shell>
                <Dashboard />
              </Shell>
            ) : (
              <Landing />
            )
          }
        />
        <Route path="/plan" element={guarded(<Shell><Plan /></Shell>)} />
        <Route path="/study" element={guarded(<Study />)} />
        <Route path="/progress" element={guarded(<Shell wide><Progress /></Shell>)} />
        <Route path="/library" element={guarded(<Shell wide><Library /></Shell>)} />
        <Route path="/account" element={guarded(<Shell><Account /></Shell>)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost toasts={toasts} />
    </>
  )
}

export default function App() {
  return <AppRoutes />
}
