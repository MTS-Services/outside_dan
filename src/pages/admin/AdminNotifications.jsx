import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  pushSupported,
} from '../../api/push';

export default function AdminNotifications() {
  const { user, setSession } = useAuth();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [emailOn, setEmailOn] = useState(user?.emailNotificationsEnabled ?? false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);

  useEffect(() => { isPushSubscribed().then(setPushOn); }, []);
  useEffect(() => { setEmailOn(user?.emailNotificationsEnabled ?? false); }, [user]);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushOn) { await unsubscribeFromPush(); setPushOn(false); toast('Push deaktiviert'); }
      else { await subscribeToPush({ kitchen: true }); setPushOn(true); toast.success('Push aktiviert'); }
    } catch (e) { toast.error(e.message || 'Aktion fehlgeschlagen'); }
    finally { setPushBusy(false); }
  }

  async function testPush() {
    try { await api.post('/push/test'); toast.success('Test-Push gesendet'); }
    catch (e) { toast.error(e.displayMessage || 'Fehler'); }
  }

  async function toggleEmail() {
    const newVal = !emailOn;
    setEmailOn(newVal);
    setEmailBusy(true);
    try {
      const { data } = await api.put('/auth/me/notifications', { emailNotificationsEnabled: newVal });
      setSession({ token: localStorage.getItem('token'), user: data.user });
      toast.success(newVal ? 'E-Mail-Benachrichtigungen aktiviert' : 'E-Mail-Benachrichtigungen deaktiviert');
    } catch (e) {
      setEmailOn(!newVal);
      toast.error(e.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setEmailBusy(false);
    }
  }

  async function testEmail() {
    setEmailTesting(true);
    try {
      const res = await api.post('/admin/notifications/test-email');
      toast.success(`Test-E-Mail gesendet an ${res.data.sentTo}`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Test fehlgeschlagen');
    } finally {
      setEmailTesting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <h1 className="font-display text-2xl sm:text-3xl">Benachrichtigungen</h1>

      {/* Push card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 grid place-items-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-brand-400">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold">Live-Bestellalarme (Push)</div>
            <p className="text-sm text-white/50 mt-0.5">Erhalte einen Push, sobald eine neue Bestellung eingeht – auch wenn der Tab geschlossen ist.</p>
          </div>
        </div>
        {pushSupported() ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Toggle on={pushOn} onChange={togglePush} disabled={pushBusy} color="brand" />
              <span className="text-sm text-white/70">{pushOn ? 'Aktiviert' : 'Deaktiviert'}</span>
            </div>
            {pushOn && (
              <button onClick={testPush} className="btn-ghost text-sm">Test senden</button>
            )}
          </div>
        ) : (
          <p className="text-white/50 text-sm">Push wird in diesem Browser nicht unterstützt.</p>
        )}
      </div>

      {/* Email card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 grid place-items-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-400">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold">E-Mail-Benachrichtigungen</div>
            <p className="text-sm text-white/50 mt-0.5">Erhalte eine E-Mail bei jeder neuen Bestellung – nur für dein Konto ({user?.email}).</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Toggle on={emailOn} onChange={toggleEmail} disabled={emailBusy} color="emerald" />
            <span className="text-sm text-white/70">{emailOn ? 'Aktiviert' : 'Deaktiviert'}</span>
          </div>
          {emailOn && (
            <button onClick={testEmail} disabled={emailTesting} className="btn-ghost text-sm">
              {emailTesting ? 'Senden…' : 'Test senden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, disabled, color }) {
  const bg = on
    ? color === 'emerald' ? 'bg-emerald-500' : 'bg-brand-500'
    : 'bg-white/10';
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${bg}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}
