import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart, useCartUI } from '../store/cart';
import { useAuth } from '../store/auth';
import Icon from './Icon';
import ProfileDropdown from './ProfileDropdown';
import scrollToTop from '../utils/scrollToTop';

export default function Navbar() {
  const items = useCart((s) => s.items);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const openCart = useCartUI((s) => s.openDrawer);
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuDropOpen, setMenuDropOpen] = useState(false);
  const menuDropRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuDropRef.current && !menuDropRef.current.contains(e.target)) {
        setMenuDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isMenuActive = location.pathname === '/menu';

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUBADMIN' || user?.role === 'STAFF';

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-semibold tracking-wide uppercase transition-colors ${
      isActive ? 'text-brand-400' : 'text-white/75 hover:text-white'
    }`;

  const mobileLink = ({ isActive }) =>
    `block px-4 py-3 text-base font-semibold uppercase tracking-wider border-b border-white/5 transition-colors ${
      isActive ? 'text-brand-400' : 'text-white/80 hover:text-white'
    }`;

  const handleNav = () => { setOpen(false); scrollToTop(); };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-900/85 border-b border-white/5 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" onClick={handleNav} className="flex items-center shrink-0">
          <img
            src="/logo.png"
            alt="Tarantella"
            className="h-[100px] w-auto object-contain"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/menu"
            onClick={handleNav}
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-bold tracking-wide uppercase transition-colors ${
                isActive ? 'text-brand-400' : 'text-brand-500 hover:text-brand-400'
              }`
            }
          >
            Jetzt bestellen
          </NavLink>

          {/* Speisekarte dropdown */}
          <div ref={menuDropRef} className="relative">
            <button
              onClick={() => setMenuDropOpen(!menuDropOpen)}
              className={`px-3 py-2 text-sm font-semibold tracking-wide uppercase transition-colors flex items-center gap-1 ${
                isMenuActive ? 'text-brand-400' : 'text-white/75 hover:text-white'
              }`}
            >
              Speisekarte
              <Icon name="chevron" className={`w-3 h-3 transition-transform duration-200 ${menuDropOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuDropOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-ink-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                <Link
                  to="/menu"
                  onClick={() => { setMenuDropOpen(false); scrollToTop(); }}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white/75 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Online Order
                </Link>
                <div className="border-t border-white/5" />
                <a
                  href="/speisekarte.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuDropOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white/75 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Offline Menü
                </a>
              </div>
            )}
          </div>

          <NavLink to="/gallery" onClick={handleNav} className={linkClass}>Galerie</NavLink>
          <NavLink to="/about" onClick={handleNav} className={linkClass}>Über uns</NavLink>
          <NavLink to="/contact" onClick={handleNav} className={linkClass}>Kontakt</NavLink>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Cart button — always visible for non-staff */}
          {!isStaff && (
            <button
              onClick={openCart}
              aria-label="Warenkorb öffnen"
              className="relative w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Icon name="cart" className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-italian-red text-white text-xs rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center font-bold leading-none shadow-glow-red">
                  {count}
                </span>
              )}
            </button>
          )}

          {/* Auth area */}
          {token ? (
            <ProfileDropdown />
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login" onClick={handleNav} className="btn-outline py-2 px-4">
                Anmelden
              </Link>
              <Link to="/signup" onClick={handleNav} className="btn-primary py-2 px-4">
                Konto erstellen
              </Link>
            </div>
          )}

          {/* Hamburger */}
          <button
            aria-label="Menü umschalten"
            onClick={() => setOpen(!open)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
          >
            <span className={`block w-6 h-0.5 bg-white transition-all ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-ink-900 border-t border-white/5">
          <NavLink
            to="/menu"
            onClick={handleNav}
            className={({ isActive }) =>
              `block px-4 py-3 text-base font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${
                isActive ? 'text-brand-400' : 'text-brand-500 hover:text-brand-400'
              }`
            }
          >
            Jetzt bestellen
          </NavLink>
          <a
            href="/speisekarte.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNav}
            className="block px-4 py-3 text-base font-semibold uppercase tracking-wider border-b border-white/5 transition-colors text-white/80 hover:text-white"
          >
            Speisekarte
          </a>
          <NavLink to="/gallery" onClick={handleNav} className={mobileLink}>Galerie</NavLink>
          <NavLink to="/about" onClick={handleNav} className={mobileLink}>Über uns</NavLink>
          <NavLink to="/contact" onClick={handleNav} className={mobileLink}>Kontakt</NavLink>
          {token ? (
            <NavLink to={isStaff ? '/admin' : '/account'} onClick={handleNav} className={mobileLink}>
              Mein Konto
            </NavLink>
          ) : (
            <>
              <NavLink to="/login" onClick={handleNav} className={mobileLink}>Anmelden</NavLink>
              <NavLink to="/signup" onClick={handleNav} className={mobileLink}>Konto erstellen</NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
