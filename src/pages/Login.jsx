import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { subscribeToPush, pushSupported } from '../api/push';
import PushPromptModal from '../components/PushPromptModal';

const STAFF_ROLES = new Set(['ADMIN', 'SUBADMIN', 'STAFF']);

import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const next = new URLSearchParams(loc.search).get('next');

  function doNavigate(role) {
    if (STAFF_ROLES.has(role)) {
      navigate(next || '/admin', { replace: true });
    } else {
      navigate(next || '/account', { replace: true });
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setSession(data);
      toast.success(`Willkommen zurück, ${data.user.name}!`);

      const role = data.user?.role;
      // If push is supported and permission not yet decided, show in-app prompt first
      if (pushSupported() && Notification.permission === 'default') {
        setPendingNav(role);
        setShowPushPrompt(true);
      } else {
        // Already granted → subscribe silently; denied → skip
        if (pushSupported() && Notification.permission === 'granted') {
          subscribeToPush().catch(() => {});
        }
        doNavigate(role);
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Anmeldung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    {showPushPrompt && (
      <PushPromptModal onDone={() => { setShowPushPrompt(false); doNavigate(pendingNav); }} />
    )}
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="font-display text-5xl text-center mb-2">ANMELDEN</h1>
      <p className="text-center text-white/60 mb-8">Willkommen zurück</p>
      <form onSubmit={onSubmit} className="card p-8 space-y-5">
        <label className="block">
          <span className="label">E-Mail</span>
          <input className="input" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Passwort</span>
          <PasswordInput className="input w-full" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button disabled={busy} className="btn-primary w-full justify-center">
          {busy ? 'Anmeldung läuft…' : 'Anmelden'}
        </button>
        <p className="text-center text-white/60 text-sm mt-4">
          <Link to={`/forgot-password${loc.search}`} className="text-brand-400 font-semibold">Passwort vergessen?</Link>
        </p>
        <p className="text-center text-white/60 text-sm">
          Noch kein Konto?{' '}
          <Link to={`/signup${loc.search}`} className="text-brand-400 font-semibold">Registrieren</Link>
        </p>
      </form>
    </div>
    </>
  );
}
