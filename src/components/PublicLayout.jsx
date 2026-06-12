import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';
import CartDrawer from './CartDrawer';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import scrollToTop from '../utils/scrollToTop';
import { useSiteSettings } from '../store/siteSettings';
import NewsBanner from './NewsBanner';
import CookieConsent from './CookieConsent';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const loadSiteSettings = useSiteSettings((s) => s.load);

  useEffect(() => {
    loadSiteSettings();
  }, [loadSiteSettings]);

  // Scroll to top on every route change & re-bind ScrollTrigger
  useEffect(() => {
    scrollToTop({ immediate: true });
    const t = setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <SmoothScroll />
      <NewsBanner />
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <CartDrawer />
      <CookieConsent />
    </div>
  );
}
