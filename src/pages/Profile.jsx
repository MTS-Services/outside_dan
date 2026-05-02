import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../store/auth';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  pushSupported,
} from '../api/push';
import PhoneInput from '../components/PhoneInput';

/* Customer dashboard layout: sidebar tabs Profil/Bestellungen/Benachrichtigungen */
import PasswordInput from '../components/PasswordInput';

export default function Profile() {
  const { token, user, logout, setSession } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  if (!token) return <Navigate to="/login?next=/account" replace />;
  // Staff goes to /admin
  if (user && ['ADMIN', 'SUBADMIN', 'STAFF'].includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  const onLogout = () => { logout(); navigate('/'); };

  // active tab
  const tab = loc.pathname.endsWith('/orders') ? 'orders'
    : loc.pathname.endsWith('/notifications') ? 'notifications'
    : 'profile';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl">MEIN KONTO</h1>
          <p className="text-white/60 mt-1">Willkommen, {user?.name}</p>
        </div>
        <button onClick={onLogout} className="btn-ghost">Abmelden</button>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-8">
        <aside className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 border-b border-white/5 md:border-b-0">
          <TabLink to="/account" active={tab === 'profile'}>Profil</TabLink>
          <TabLink to="/account/orders" active={tab === 'orders'}>Meine Bestellungen</TabLink>
          <TabLink to="/account/notifications" active={tab === 'notifications'}>Benachrichtigungen</TabLink>
        </aside>
        <main>
          {tab === 'profile' && <ProfileTab user={user} setSession={setSession} />}
          {tab === 'orders' && <Outlet />}
          {tab === 'notifications' && <NotificationsTab user={user} setSession={setSession} />}
        </main>
      </div>
    </div>
  );
}

function TabLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
        active ? 'bg-brand-500/15 text-brand-400' : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

function ProfileTab({ user, setSession }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    phoneCountry: user?.phoneCountry || 'AT',
  });
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/me', form);
      setSession({ token: localStorage.getItem('token'), user: data });
      toast.success('Profil aktualisiert');
    } catch (err) {
      toast.error(err.displayMessage || 'Speichern fehlgeschlagen');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwd.next.length < 6) return toast.error('Neues Passwort muss mindestens 6 Zeichen haben');
    setSavingPwd(true);
    try {
      await api.put('/auth/me/password', { currentPassword: pwd.current, newPassword: pwd.next });
      setPwd({ current: '', next: '' });
      toast.success('Passwort geändert');
    } catch (err) {
      toast.error(err.displayMessage || 'Passwortänderung fehlgeschlagen');
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="card p-6 space-y-4">
        <h2 className="text-2xl">Persönliche Daten</h2>
        <label className="block">
          <span className="label">Name</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">E-Mail</span>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <div className="block">
          <span className="label">Telefon</span>
          <PhoneInput
            value={{ phone: form.phone, country: form.phoneCountry }}
            onChange={({ phone, country }) => setForm({ ...form, phone, phoneCountry: country })}
          />
        </div>
        <button disabled={savingProfile} className="btn-primary justify-center">
          {savingProfile ? 'Speichern…' : 'Speichern'}
        </button>
      </form>

      <form onSubmit={changePassword} className="card p-6 space-y-4">
        <h2 className="text-2xl">Passwort ändern</h2>
        <label className="block">
          <span className="label">Aktuelles Passwort</span>
          <PasswordInput className="input w-full" required value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Neues Passwort (mind. 6 Zeichen)</span>
          <PasswordInput className="input w-full" required minLength={6} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
        </label>
        <button disabled={savingPwd} className="btn-outline justify-center">
          {savingPwd ? 'Ändern…' : 'Passwort ändern'}
        </button>
      </form>
    </div>
  );
}

function NotificationsTab({ user, setSession }) {
  const [pushOn, setPushOn] = useState(false);
  const [orderNotifs, setOrderNotifs] = useState(user?.orderNotificationsEnabled !== false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { isPushSubscribed().then(setPushOn); }, []);

  async function togglePush() {
    setBusy(true);
    try {
      if (pushOn) {
        await unsubscribeFromPush();
        setPushOn(false);
        await api.put('/auth/me/notifications', { pushEnabled: false, orderNotificationsEnabled: orderNotifs });
        toast('Push deaktiviert');
      } else {
        await subscribeToPush();
        setPushOn(true);
        await api.put('/auth/me/notifications', { pushEnabled: true, orderNotificationsEnabled: orderNotifs });
        toast.success('Push aktiviert');
      }
    } catch (e) {
      toast.error(e.message || 'Aktion fehlgeschlagen');
    } finally { setBusy(false); }
  }

  async function saveNotifs(next) {
    setOrderNotifs(next);
    try {
      const { data } = await api.put('/auth/me/notifications', {
        pushEnabled: pushOn,
        orderNotificationsEnabled: next,
      });
      setSession({ token: localStorage.getItem('token'), user: data });
      toast.success('Einstellungen gespeichert');
    } catch (err) {
      toast.error(err.displayMessage || 'Speichern fehlgeschlagen');
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <h2 className="text-2xl">Benachrichtigungen</h2>
      {pushSupported() ? (
        <Toggle
          label="Push-Benachrichtigungen am Gerät"
          desc="Erhalte Status-Updates zu deinen Bestellungen direkt im Browser."
          on={pushOn}
          onChange={togglePush}
          disabled={busy}
        />
      ) : (
        <p className="text-white/50 text-sm">Push wird in diesem Browser nicht unterstützt.</p>
      )}
      <Toggle
        label="Bestellbenachrichtigungen"
        desc="Erlaube uns, dich bei Bestellungs-Updates zu benachrichtigen."
        on={orderNotifs}
        onChange={() => saveNotifs(!orderNotifs)}
      />
    </div>
  );
}

function Toggle({ label, desc, on, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="font-semibold">{label}</div>
        {desc && <div className="text-sm text-white/50">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative w-12 h-7 rounded-full transition shrink-0 ${on ? 'bg-brand-500' : 'bg-white/15'} disabled:opacity-50`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
