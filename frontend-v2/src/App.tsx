import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import LandingLayout from '@/components/layout/LandingLayout'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminRoute from '@/components/AdminRoute'

import LandingPage from '@/pages/landing/LandingPage'
import HowItWorksSection from '@/pages/landing/HowItWorksSection'
import ScreenshotsSection from '@/pages/landing/ScreenshotsSection'
import SecuritySection from '@/pages/landing/SecuritySection'
import PricingSection from '@/pages/landing/PricingSection'
import FaqSection from '@/pages/landing/FaqSection'
import AboutUsSection from '@/pages/landing/AboutUsSection'
import ContactSection from '@/pages/landing/ContactSection'

import TermsPage from '@/pages/legal/TermsPage'
import PrivacyPage from '@/pages/legal/PrivacyPage'
import CookiePolicyPage from '@/pages/legal/CookiePolicyPage'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import VerifyPage from '@/pages/auth/VerifyPage'

import DashboardPage from '@/pages/dashboard/DashboardPage'
import CompaniesPage from '@/pages/companies/CompaniesPage'
import UploadPage from '@/pages/upload/UploadPage'
import FilesPage from '@/pages/files/FilesPage'
import HistoryPage from '@/pages/history/HistoryPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import BillingPage from '@/pages/billing/BillingPage'
import InvoicingModule from '@/pages/invoicing/InvoicingModule'

import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import UsersManagement from '@/pages/admin/UsersManagement'
import UserDetail from '@/pages/admin/UserDetail'
import CompaniesOverview from '@/pages/admin/CompaniesOverview'
import VerificationReview from '@/pages/admin/VerificationReview'
import BillingOverview from '@/pages/admin/BillingOverview'
import SystemLogs from '@/pages/admin/SystemLogs'
import AdminSettings from '@/pages/admin/AdminSettings'

import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import Toast from '@/components/ui/Toast'
import DialogProvider from '@/components/ui/DialogProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Fetch current user on app start when a token exists but user is not loaded */
function AuthInitializer() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  useEffect(() => {
    if (token && !user) {
      fetchUser()
    }
  }, [token, user, fetchUser])

  return null
}

export default function App() {
  const error = useUiStore((s) => s.error)
  const success = useUiStore((s) => s.success)
  const setError = useUiStore((s) => s.setError)
  const setSuccess = useUiStore((s) => s.setSuccess)

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer />
        <Routes>
          {/* ─── Landing (public) ───
              ВАЖНО: Всяко меню от сайдбара = ОТДЕЛЕН route = ОТДЕЛНА секция.
              НЕ слагайте всички секции в LandingPage! Вижте LandingPage.tsx за детайли.
              Sidebar навигацията е в Sidebar.tsx (landingItems масива). */}
          <Route element={<LandingLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="how" element={<HowItWorksSection />} />
            <Route path="screenshots" element={<ScreenshotsSection />} />
            <Route path="security" element={<SecuritySection />} />
            <Route path="pricing" element={<PricingSection />} />
            <Route path="faq" element={<FaqSection />} />
            <Route path="about-us" element={<AboutUsSection />} />
            <Route path="contact" element={<ContactSection />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="cookies" element={<CookiePolicyPage />} />
          </Route>

          {/* ─── Auth (public) ─── */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify" element={<VerifyPage />} />

          {/* ─── Dashboard (protected) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="companies" replace />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="invoicing" element={<InvoicingModule />} />
              <Route path="overview" element={<DashboardPage />} />
            </Route>
          </Route>

          {/* ─── Admin (protected + admin) ─── */}
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="users/:id" element={<UserDetail />} />
              <Route path="companies" element={<CompaniesOverview />} />
              <Route path="verifications" element={<VerificationReview />} />
              <Route path="billing" element={<BillingOverview />} />
              <Route path="logs" element={<SystemLogs />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* ─── Catch-all ─── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global toast notifications */}
        {error && <Toast type="error" message={error} onClose={() => setError(null)} />}
        {success && <Toast type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Global dialog provider (replaces browser alert/confirm/prompt) */}
        <DialogProvider />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
