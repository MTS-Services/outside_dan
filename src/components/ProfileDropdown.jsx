import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import Icon from './Icon';

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUBADMIN' || user?.role === 'STAFF';
  const dashHref = isStaff ? '/admin' : '/account';
  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const onLogout = () => {
    logout();
    setOpen(false);
    nav('/');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
        aria-label="Konto"
      >
        <span className="w-7 h-7 rounded-full bg-brand-500 grid place-items-center text-xs font-bold">{initials}</span>
        <span className="hidden sm:inline text-sm font-semibold max-w-[100px] truncate">{user?.name?.split(' ')[0] || 'Konto'}</span>
        <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 stroke-white stroke-2 fill-none transition ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-ink-800 border border-white/10 shadow-2xl py-2 z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
            {user?.role && (
              <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] rounded-full bg-brand-500/20 text-brand-400 font-bold tracking-wider uppercase">
                {user.role}
              </span>
            )}
          </div>
          <Link
            to={dashHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/5 transition"
          >
            <Icon name="user" className="w-4 h-4 text-white/60" />
            <span>Mein Konto</span>
          </Link>
          {!isStaff && (
            <Link
              to="/account/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/5 transition"
            >
              <Icon name="cart" className="w-4 h-4 text-white/60" />
              <span>Meine Bestellungen</span>
            </Link>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/5 text-red-400 transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-2 fill-none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Abmelden</span>
          </button>
        </div>
      )}
    </div>
  );
}
