import { useState, useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { subscribeToPush, isPushSubscribed } from '../../api/push';
import PushPromptModal from '../../components/PushPromptModal';

const NAV = [
  { to: '/admin',                end: true, label: 'Übersicht',         icon: <Ic d="M3 13l9-9 9 9M5 11v9h14v-9" /> },
  { to: '/admin/orders',                    label: 'Bestellungen',      icon: <Ic d="M3 6h18M3 12h18M3 18h18" /> },
  { to: '/admin/menu',                      label: 'Speisekarte',       icon: <Ic d="M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z" />, role: ['ADMIN'] },
  { to: '/admin/home-categories',           label: 'Startseite',        icon: <Ic d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />, role: ['ADMIN'] },
  { to: '/admin/gallery',                   label: 'Galerie',           icon: <Ic d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />, role: ['ADMIN'] },
  { to: '/admin/coupons',                   label: 'Gutscheine',        icon: <Ic d="M7 7h.01M17 17h.01M5 20l14-14M6.5 4A2.5 2.5 0 0 1 9 6.5V9H6.5A2.5 2.5 0 0 1 4 6.5 2.5 2.5 0 0 1 6.5 4zM17.5 15a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 17.5 20 2.5 2.5 0 0 1 15 17.5v-2.5h2.5z" />, role: ['ADMIN'] },
  { to: '/admin/delivery-zones',            label: 'Lieferzonen',       icon: <Ic d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0L9 7" />, role: ['ADMIN'] },
  { to: '/admin/subadmins',                 label: 'Subadmins',         icon: <Ic d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />, role: ['ADMIN'] },
  { to: '/admin/customers',                 label: 'Kunden',            icon: <Ic d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />, role: ['ADMIN'] },
  { to: '/admin/notifications',             label: 'Benachrichtigungen',icon: <Ic d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /> },
  { to: '/admin/settings',                  label: 'Einstellungen',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>, role: ['ADMIN'] },
  { to: '/admin/profile',                   label: 'Mein Profil',       icon: <Ic d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /> },
];

function Ic({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d={d} />
    </svg>
  );
}

export default function AdminLayout() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Ask staff to enable push notifications if they haven't yet
    const checkPush = async () => {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'default') return;
      try {
        const subscribed = await isPushSubscribed();
        if (!subscribed) setShowPushPrompt(true);
      } catch { /* noop */ }
    };
    checkPush();
  }, [token]);

  if (!token) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  if (user && !['ADMIN', 'SUBADMIN', 'STAFF'].includes(user.role)) {
    return <Navigate to="/account" replace />;
  }

  const visibleNav = NAV.filter((n) => !n.role || n.role.includes(user?.role));

  function onLogout() { logout(); navigate('/login'); }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="flex min-h-screen bg-[#0d0f14]">
      {showPushPrompt && (
        <PushPromptModal
          onClose={() => setShowPushPrompt(false)}
          onAccept={async () => {
            try { await subscribeToPush({ kitchen: true }); } catch { /* noop */ }
            setShowPushPrompt(false);
          }}
        />
      )}
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40
        w-64 md:w-60 shrink-0 flex flex-col
        border-r border-white/5 bg-[#111318] h-screen
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 overflow-visible">
          <img src="/logo.png" alt="Tarantella" className="h-16 w-auto object-contain" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/40 tracking-widest uppercase">{user?.role === 'ADMIN' ? 'Admin' : 'Küchen-Dashboard'}</div>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-white/25 px-3 mb-2">Menü</p>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              target={item.external ? '_blank' : undefined}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive && !item.external
                    ? 'bg-brand-500/15 text-brand-400 shadow-inner'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {item.external && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 ml-auto opacity-40">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="w-8 h-8 rounded-full bg-brand-500/30 grid place-items-center text-xs font-bold text-brand-200 shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white/80 truncate">{user?.name || 'Admin'}</div>
              <div className="text-[11px] text-white/35 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            Abmelden
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/5 bg-[#111318]/60 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="font-display tracking-widest text-sm md:text-base">KÜCHEN-DASHBOARD</h1>
          </div>
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
