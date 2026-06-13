import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { subscribeToPush, pushSupported } from '../api/push';
import PhoneInput from '../components/PhoneInput';
import PushPromptModal from '../components/PushPromptModal';
import PasswordInput from '../components/PasswordInput';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    phoneCountry: 'AT',
    password: '',
    code: '',
  });
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const next = new URLSearchParams(loc.search).get('next') || '/account';

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  function doNavigate(role) {
    if (role === 'ADMIN' || role === 'SUBADMIN' || role === 'STAFF') {
      navigate('/admin', { replace: true });
    } else {
      navigate(next, { replace: true });
    }
  }

  async function finishSignup(data) {
    setSession(data);
    toast.success(`Willkommen, ${data.user.name}! 🎉`);
    const role = data.user?.role;
    if (pushSupported() && Notification.permission === 'default') {
      setPendingNav(role);
      setShowPushPrompt(true);
    } else {
      if (pushSupported() && Notification.permission === 'granted') {
        subscribeToPush().catch(() => {});
      }
      doNavigate(role);
    }
  }

  async function onRequestCode(e) {
    e.preventDefault();
    if (!form.phone.trim()) {
      toast.error('Bitte gib deine Telefonnummer ein');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        phoneCountry: form.phoneCountry,
      });
      toast.success('Bestätigungscode wurde an deine E-Mail gesendet.');
      setStep(2);
      setTimer(30);
    } catch (err) {
      toast.error(err.displayMessage || 'Registrierung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  async function onResendCode() {
    if (timer > 0 || busy) return;
    setBusy(true);
    try {
      await api.post('/auth/resend-verification', { email: form.email });
      toast.success('Neuer Code wurde gesendet.');
      setTimer(30);
    } catch (err) {
      toast.error(err.displayMessage || 'Code konnte nicht gesendet werden');
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-email', {
        email: form.email,
        code: form.code,
      });
      await finishSignup(data);
    } catch (err) {
      toast.error(err.displayMessage || 'Verifizierung fehlgeschlagen. Code ungültig?');
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
      <p className="text-center text-white/60 mb-8">
        {step === 1
          ? 'Konto erstellen und live über deine Bestellungen informiert werden'
          : 'Bestätige deine E-Mail-Adresse'}
      </p>
      <div className="card p-8 space-y-5">
        {step === 1 && (
          <form onSubmit={onRequestCode} className="space-y-5">
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
              {busy ? 'Code wird gesendet…' : 'Weiter – Code senden'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onVerify} className="space-y-5">
            <div className="text-sm text-brand-400 mb-2">
              Wir haben einen 6-stelligen Code an <strong>{form.email}</strong> gesendet.
            </div>
            <label className="block">
              <span className="label">6-stelliger Code</span>
              <input
                className="input tracking-[0.5em] text-center font-bold text-lg"
                type="text"
                maxLength="6"
                required
                placeholder="000000"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </label>
            <button
              disabled={busy || form.code.length !== 6}
              className="btn-primary w-full justify-center"
            >
              {busy ? 'Konto wird erstellt…' : 'E-Mail bestätigen & Konto erstellen'}
            </button>
            <button
              type="button"
              disabled={timer > 0 || busy}
              onClick={onResendCode}
              className="text-white/60 text-sm hover:text-white transition-colors w-full"
            >
              {timer > 0 ? `Code erneut senden in ${timer}s` : 'Kein Code erhalten? Erneut senden'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-white/40 text-sm hover:text-white transition-colors w-full"
            >
              ← Zurück
            </button>
          </form>
        )}

        <p className="text-center text-white/60 text-sm">
          Schon ein Konto?{' '}
          <Link to={`/login${loc.search}`} className="text-brand-400 font-semibold">Anmelden</Link>
        </p>
      </div>
    </div>
    </>
  );
}
