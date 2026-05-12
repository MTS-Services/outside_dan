import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    email: '',
    code: '',
    newPassword: ''
  });

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  async function onRequestCode(e) {
    e?.preventDefault();
    if (!form.email) return;
    
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: form.email });
      toast.success('Ein 6-stelliger Code wurde an Ihre E-Mail gesendet.');
      setStep(2);
      setTimer(30);
    } catch (err) {
      toast.error(err.displayMessage || 'Fehler beim Senden des Codes');
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/reset-password', {
        email: form.email,
        code: form.code,
        newPassword: form.newPassword
      });
      toast.success('Ihr Passwort wurde erfolgreich geändert.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.displayMessage || 'Rücksetzung fehlgeschlagen. Code ungültig?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="font-display text-5xl text-center mb-2">PASSWORT ZURÜCKSETZEN</h1>
      <p className="text-center text-white/60 mb-8">Neues Passwort festlegen</p>
      
      <div className="card p-8 space-y-5">
        {step === 1 && (
          <form onSubmit={onRequestCode} className="space-y-4">
            <label className="block">
              <span className="label">E-Mail Adresse</span>
              <input 
                className="input" 
                type="email" 
                required 
                placeholder="ihre@email.de"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
            </label>
            <button disabled={busy} className="btn-primary w-full justify-center">
              {busy ? 'Wird gesendet...' : 'Code anfordern'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onResetPassword} className="space-y-4">
            <div className="text-sm text-brand-400 mb-4">
              Wir haben einen Bestätigungscode an <strong>{form.email}</strong> gesendet.
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

            <label className="block">
              <span className="label">Neues Passwort</span>
              <PasswordInput 
                className="input w-full" 
                required 
                minLength="6"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })} 
              />
            </label>

            <button disabled={busy || typeof form.code !== 'string' || form.code.length !== 6 || form.newPassword.length < 6} className="btn-primary w-full justify-center">
              {busy ? 'Wird zurückgesetzt...' : 'Passwort neu setzen'}
            </button>

            <button 
              type="button"
              disabled={timer > 0 || busy}
              onClick={onRequestCode}
              className="text-white/60 text-sm hover:text-white transition-colors w-full mt-2"
            >
              {timer > 0 ? `Code erneut senden in ${timer}s` : 'Kein Code erhalten? Erneut senden'}
            </button>
          </form>
        )}

        <p className="text-center text-white/60 text-sm mt-6">
          Wieder eingefallen?{' '}
          <Link to="/login" className="text-brand-400 font-semibold">Anmelden</Link>
        </p>
      </div>
    </div>
  );
}