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
import PushPromptModal from '../components/PushPromptModal';

/* Customer dashboard layout: sidebar tabs Profil/Bestellungen/Benachrichtigungen */
import PasswordInput from '../components/PasswordInput';

export default function Profile() {
  const { token, user, logout, setSession } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  // Show push prompt once if this device isn't subscribed and permission is default
  useEffect(() => {
    if (!token) return;
    if (!pushSupported()) return;
    if (Notification.permission !== 'default') return;
    isPushSubscribed().then((subscribed) => {
      if (!subscribed) setShowPushPrompt(true);
    });
  }, [token]);

  if (!token) return <Navigate to="/login?next=/account" replace />;
  // Staff goes to /admin
  if (user && ['ADMIN', 'SUBADMIN', 'STAFF'].includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  const onLogout = () => { logout(); navigate('/'); };

  // active tab
  const tab = loc.pathname.endsWith('/orders') ? 'orders'
    : loc.pathname.endsWith('/notifications') ? 'notifications'
    : loc.pathname.endsWith('/profile') ? 'profile'
    : 'orders';

  return (
    <>
      {showPushPrompt && (
        <PushPromptModal onDone={() => setShowPushPrompt(false)} />
      )}
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
          <TabLink to="/account/profile" active={tab === 'profile'}>Profil</TabLink>
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
    </>
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
  const [emailOn, setEmailOn] = useState(user?.emailNotificationsEnabled ?? false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Push devices list
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState(null);

  // Load devices + current device endpoint
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDevices(true);
      try {
        const [{ data }, sub] = await Promise.all([
          api.get('/push/subscriptions'),
          isPushSubscribed().then(async (yes) => {
            if (!yes) return null;
            const reg = await navigator.serviceWorker.getRegistration('/sw.js');
            const s = await reg?.pushManager.getSubscription();
            return s?.endpoint || null;
          }),
        ]);
        if (!cancelled) {
          setDevices(data);
          setCurrentEndpoint(sub);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingDevices(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function toggleEmailNotifs(next) {
    setSavingEmail(true);
    try {
      const { data } = await api.put('/auth/me/notifications', { emailNotificationsEnabled: next });
      setEmailOn(next);
      setSession({ token: localStorage.getItem('token'), user: data.user ?? data });
      toast.success('Einstellungen gespeichert');
    } catch (err) {
      toast.error(err.displayMessage || 'Speichern fehlgeschlagen');
    } finally { setSavingEmail(false); }
  }

  async function addDevice() {
    setSubscribing(true);
    try {
      await subscribeToPush();
      // Refresh device list + endpoint
      const [{ data }, reg] = await Promise.all([
        api.get('/push/subscriptions'),
        navigator.serviceWorker.getRegistration('/sw.js'),
      ]);
      const sub = await reg?.pushManager.getSubscription();
      setDevices(data);
      setCurrentEndpoint(sub?.endpoint || null);
      toast.success('Gerät hinzugefügt');
    } catch (e) {
      toast.error(e.message || 'Fehler beim Aktivieren');
    } finally { setSubscribing(false); }
  }

  async function removeDevice(id, endpoint) {
    try {
      await api.delete(`/push/subscriptions/${id}`);
      // If the removed device is the current one, also unsubscribe locally
      if (endpoint === currentEndpoint) {
        await unsubscribeFromPush();
        setCurrentEndpoint(null);
      }
      setDevices((d) => d.filter((x) => x.id !== id));
      toast('Gerät entfernt');
    } catch (err) {
      toast.error(err.displayMessage || 'Fehler beim Entfernen');
    }
  }

  const thisDeviceSubscribed = !!currentEndpoint;

  return (
    <div className="space-y-6">
      {/* Email notifications */}
      <div className="card p-6 space-y-4">
        <h2 className="text-2xl">Benachrichtigungen</h2>
        <Toggle
          label="E-Mail-Benachrichtigungen"
          desc="Erhalte Bestellungs-Updates per E-Mail."
          on={emailOn}
          onChange={() => toggleEmailNotifs(!emailOn)}
          disabled={savingEmail}
        />
      </div>

      {/* Push devices */}
      {pushSupported() ? (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-2xl">Push-Geräte</h2>
            {!thisDeviceSubscribed && (
              <button
                onClick={addDevice}
                disabled={subscribing}
                className="btn-primary text-sm py-2 px-4"
              >
                {subscribing ? 'Wird aktiviert…' : '+ Dieses Gerät hinzufügen'}
              </button>
            )}
          </div>
          <p className="text-sm text-white/50">
            Dieses Gerät empfängt Push-Benachrichtigungen bei Bestellungs-Updates.
          </p>
          {loadingDevices ? (
            <p className="text-sm text-white/40">Lädt…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-white/40">Keine Geräte registriert.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => {
                const isCurrent = d.endpoint === currentEndpoint;
                return (
                  <li key={d.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-3 bg-white/5">
                    <div>
                      <span className="font-semibold text-sm">{d.deviceName || 'Browser'}</span>
                      {isCurrent && <span className="ml-2 text-xs text-brand-400 font-semibold">(dieses Gerät)</span>}
                      <div className="text-xs text-white/40 mt-0.5">
                        Hinzugefügt am {new Date(d.createdAt).toLocaleDateString('de-AT')}
                      </div>
                    </div>
                    <button
                      onClick={() => removeDevice(d.id, d.endpoint)}
                      className="text-white/40 hover:text-red-400 transition text-sm"
                      title="Gerät entfernen"
                    >
                      Entfernen
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="card p-6">
          <p className="text-white/50 text-sm">Push wird in diesem Browser nicht unterstützt.</p>
        </div>
      )}
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
