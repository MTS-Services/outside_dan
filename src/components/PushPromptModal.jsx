import { useState } from 'react';
import { subscribeToPush, pushSupported } from '../api/push';

/**
 * Shown after login/signup when Notification.permission === 'default'.
 * Explains why we need push notifications, then triggers the browser dialog.
 */
export default function PushPromptModal({ onDone }) {
  const [busy, setBusy] = useState(false);

  async function handleEnable() {
    setBusy(true);
    try {
      await subscribeToPush();
    } catch {
      // denied or failed – silently ignore
    } finally {
      setBusy(false);
      onDone();
    }
  }

  if (!pushSupported()) {
    onDone();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="card max-w-sm w-full p-8 flex flex-col items-center text-center space-y-5">
        {/* Bell icon */}
        <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <div>
          <h2 className="font-display text-3xl mb-2">BESTELLUPDATES</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Aktiviere Push-Benachrichtigungen und erfahre sofort, wenn deine Bestellung angenommen oder abgelehnt wird — auch wenn diese Seite geschlossen ist.
          </p>
        </div>

        <button
          onClick={handleEnable}
          disabled={busy}
          className="btn-primary w-full justify-center"
        >
          {busy ? 'Wird aktiviert…' : '🔔 Benachrichtigungen aktivieren'}
        </button>

        <button
          onClick={onDone}
          className="text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Jetzt nicht
        </button>
      </div>
    </div>
  );
}
