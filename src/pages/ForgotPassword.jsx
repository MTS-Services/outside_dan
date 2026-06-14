import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import { useCountdown } from '../hooks/useCountdown';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [requestBusy, setRequestBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const { seconds: timer, running: timerRunning, start: startTimer } = useCountdown();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    code: '',
    newPassword: '',
  });

  async function onRequestCode(e) {
    e?.preventDefault();
    if (!form.email) return;

    setRequestBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: form.email });
      toast.success('Ein 6-stelliger Code wurde an Ihre E-Mail gesendet.');
      setStep(2);
      startTimer(30);
    } catch (err) {
      toast.error(err.displayMessage || 'Fehler beim Senden des Codes');
    } finally {
      setRequestBusy(false);
    }
  }

  async function onResendCode() {
    if (timerRunning || resendBusy || !form.email) return;

    setResendBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: form.email });
      toast.success('Neuer Code wurde gesendet.');
      startTimer(30);
    } catch (err) {
      toast.error(err.displayMessage || 'Fehler beim Senden des Codes');
    } finally {
      setResendBusy(false);
    }
  }

  async function onResetPassword(e) {
    e?.preventDefault();
    setResetBusy(true);
    try {
      await api.post('/auth/reset-password', {
        email: form.email,
        code: form.code,
        newPassword: form.newPassword,
      });
      toast.success('Ihr Passwort wurde erfolgreich geändert.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.displayMessage || 'Rücksetzung fehlgeschlagen. Code ungültig?');
    } finally {
      setResetBusy(false);
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
            <button disabled={requestBusy} className="btn-primary w-full justify-center">
              {requestBusy ? 'Wird gesendet...' : 'Code anfordern'}
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

            <button
              type="submit"
              disabled={resetBusy || typeof form.code !== 'string' || form.code.length !== 6 || form.newPassword.length < 6}
              className="btn-primary w-full justify-center"
            >
              {resetBusy ? 'Wird zurückgesetzt...' : 'Passwort neu setzen'}
            </button>

            <button
              type="button"
              disabled={timerRunning || resendBusy}
              onClick={onResendCode}
              className="btn-outline w-full justify-center text-sm py-2.5 mt-2 tabular-nums"
            >
              {resendBusy ? (
                'Code wird erneut gesendet…'
              ) : timerRunning ? (
                <>
                  Code erneut senden in{' '}
                  <span className="inline-block w-6 text-center">{timer}</span>
                  s
                </>
              ) : (
                'Code erneut senden'
              )}
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
