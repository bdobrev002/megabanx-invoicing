import HeroSection from './HeroSection'

/**
 * ВАЖНО: Архитектура на landing страниците
 * ─────────────────────────────────────────
 * Всяко меню от сайдбара има ОТДЕЛЕН route и показва САМО своята секция:
 *   /          → LandingPage (само HeroSection)
 *   /how       → HowItWorksSection
 *   /screenshots → ScreenshotsSection
 *   /security  → SecuritySection
 *   /pricing   → PricingSection
 *   /faq       → FaqSection
 *   /about-us  → AboutUsSection
 *   /contact   → ContactSection
 *
 * НЕ слагайте всички секции тук! Routing-ът е в App.tsx.
 * Всяка секция е самостоятелен компонент в pages/landing/.
 * Sidebar навигацията е в components/layout/Sidebar.tsx (landingItems).
 */
export default function LandingPage() {
  return <HeroSection />
}
