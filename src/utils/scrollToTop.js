/** Smooth-or-instant scroll to top, using Lenis if available. */
export default function scrollToTop({ immediate = true } = {}) {
  const lenis = typeof window !== 'undefined' && window.__lenis;
  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(0, { immediate, force: true });
    return;
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, left: 0, behavior: immediate ? 'auto' : 'smooth' });
  }
}
