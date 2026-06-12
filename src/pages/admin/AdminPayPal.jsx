import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../store/auth';

function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-white/30'}`} />
      {label}
    </span>
  );
}

export default function AdminPayPal() {
  const token = useAuth((s) => s.token);
  const [authReady, setAuthReady] = useState(() => useAuth.persist.hasHydrated());
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [mode, setMode] = useState('sandbox');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function loadStatus() {
    try {
      const { data } = await api.get('/paypal/status');
      setStatus(data);
      if (data?.mode) setMode(data.mode);
      if (data?.currency) setCurrency(data.currency);
    } catch (e) {
      toast.error(e.displayMessage || 'Status konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authReady) return undefined;
    return useAuth.persist.onFinishHydration(() => setAuthReady(true));
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      setLoading(false);
      return;
    }
    loadStatus();
  }, [authReady, token]);

  async function saveConfig(e) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Client ID und Secret eingeben');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/paypal/config', {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        mode,
        currency: currency.trim().toUpperCase(),
      });
      setStatus(data);
      setClientSecret('');
      toast.success('PayPal-Einstellungen gespeichert');
    } catch (e) {
      toast.error(e.displayMessage || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('PayPal-Konfiguration wirklich entfernen? Online-Zahlung ist danach deaktiviert.')) return;
    setDisconnecting(true);
    try {
      const { data } = await api.delete('/paypal/disconnect');
      setStatus(data);
      setClientId('');
      setClientSecret('');
      toast.success('PayPal-Konfiguration entfernt');
    } catch (e) {
      toast.error(e.displayMessage || 'Entfernen fehlgeschlagen');
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">PayPal</h1>
        <p className="text-sm text-white/40 mt-0.5">Online-Zahlung für Bestellungen konfigurieren</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge ok={status?.configured} label={status?.configured ? 'Aktiv' : 'Nicht konfiguriert'} />
          {status?.configured && (
            <StatusBadge ok={status.mode === 'live'} label={status.mode === 'live' ? 'Live-Modus' : 'Sandbox'} />
          )}
        </div>
        {status?.configured && status?.clientIdPreview && (
          <p className="text-xs text-white/40">
            Client ID: <code className="text-[#D9AF47]">{status.clientIdPreview}</code>
            {' · '}
            Währung: <code className="text-white/60">{status.currency || 'EUR'}</code>
          </p>
        )}
        {status?.configured && (
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="text-sm px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
          >
            {disconnecting ? 'Entferne…' : 'Konfiguration entfernen'}
          </button>
        )}
      </div>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">PayPal API-Zugangsdaten</h2>
          <p className="text-sm text-white/40 mt-0.5">
            Client ID und Secret aus dem{' '}
            <a
              href="https://developer.paypal.com/dashboard/applications/live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 underline underline-offset-2"
            >
              PayPal Developer Dashboard
            </a>
            {' '}eintragen. Die Daten werden sicher in der Datenbank gespeichert.
          </p>
        </div>

        <form onSubmit={saveConfig} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-white/40">Client ID</span>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={status?.configured ? 'Neue Client ID eingeben…' : 'PayPal Client ID'}
              className="input w-full font-mono text-sm"
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-white/40">Client Secret</span>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={status?.hasClientSecret ? 'Neues Secret eingeben…' : 'PayPal Client Secret'}
              className="input w-full font-mono text-sm"
              autoComplete="new-password"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wide text-white/40">Modus</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="input w-full">
                <option value="sandbox">Sandbox (Test)</option>
                <option value="live">Live (Produktion)</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wide text-white/40">Währung</span>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="input w-full uppercase"
              />
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Speichere…' : status?.configured ? 'Einstellungen aktualisieren' : 'PayPal aktivieren'}
          </button>
        </form>

        <p className="text-xs text-white/35 leading-relaxed">
          Sandbox zum Testen, Live für echte Zahlungen auf tarantella.at. Nach dem Speichern erscheint PayPal
          automatisch als Zahlungsoption im Checkout (sofern der Kunde externe Cookies akzeptiert hat).
        </p>
      </section>
    </div>
  );
}
