import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { subscribeToPush, pushSupported } from '../api/push';
import PhoneInput from '../components/PhoneInput';
import PushPromptModal from '../components/PushPromptModal';

import PasswordInput from '../components/PasswordInput';

export default function Signup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    phoneCountry: 'AT',
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const next = new URLSearchParams(loc.search).get('next') || '/account';

  function doNavigate(role) {
    if (role === 'ADMIN' || role === 'SUBADMIN' || role === 'STAFF') {
      navigate('/admin', { replace: true });
    } else {
      navigate(next, { replace: true });
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.phone.trim()) {
      toast.error('Bitte gib deine Telefonnummer ein');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setSession(data);
      toast.success(`Willkommen, ${data.user.name}! 🎉`);
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
      toast.error(err.displayMessage || 'Registrierung fehlgeschlagen');
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
      <h1 className="font-display text-5xl text-center mb-2">REGISTRIEREN</h1>
      <p className="text-center text-white/60 mb-8">Konto erstellen und live über deine Bestellungen informiert werden</p>
      <form onSubmit={onSubmit} className="card p-8 space-y-5">
        <label className="block">
          <span className="label">Vollständiger Name</span>
          <input className="input" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">E-Mail</span>
          <input className="input" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <div className="block">
          <span className="label">Telefonnummer *</span>
          <PhoneInput
            value={{ phone: form.phone, country: form.phoneCountry }}
            onChange={({ phone, country }) => setForm({ ...form, phone, phoneCountry: country })}
            required
          />
        </div>
        <label className="block">
          <span className="label">Passwort (mindestens 6 Zeichen)</span>
          <PasswordInput className="input w-full" required minLength={6} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button disabled={busy} className="btn-primary w-full justify-center">
          {busy ? 'Konto wird erstellt…' : 'Registrieren'}
        </button>
        <p className="text-center text-white/60 text-sm">
          Schon ein Konto?{' '}
          <Link to={`/login${loc.search}`} className="text-brand-400 font-semibold">Anmelden</Link>
        </p>
      </form>
    </div>
    </>
  );
}
