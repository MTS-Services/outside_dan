import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function AdminR2O() {
  const token = useAuth((s) => s.token);
  const [authReady, setAuthReady] = useState(() => useAuth.persist.hasHydrated());
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [developerToken, setDeveloperToken] = useState('');
  const [grantLink, setGrantLink] = useState(null);
  const [savingDev, setSavingDev] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Booking mode (invoice vs. chosen POS table)
  const [salesMode, setSalesMode] = useState('invoice');
  const [tableId, setTableId] = useState('');
  const [posTables, setPosTables] = useState([]);
  const [tablesMeta, setTablesMeta] = useState(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  async function loadStatus() {
    try {
      const { data } = await api.get('/r2o/status');
      setStatus(data);
      setSalesMode(data.salesMode === 'table' ? 'table' : 'invoice');
      setTableId(data.tableId || '');
      if (data.configured) loadTables(data.tableId || '');
    } catch (e) {
      toast.error(e.displayMessage || 'Status konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  async function loadTables(preferredId = tableId) {
    setTablesLoading(true);
    try {
      const { data } = await api.get('/r2o/tables');
      const rows = Array.isArray(data) ? data : (data?.tables || []);
      setPosTables(rows);
      setTablesMeta(data?.meta || null);
      // Prefer Delivery table if nothing selected yet
      if (!preferredId && rows.length) {
        const delivery = rows.find((t) => t.is_delivery)
          || rows.find((t) => /deliv/i.test(t.table_name || ''));
        if (delivery) setTableId(String(delivery.table_id));
      }
    } catch {
      setPosTables([]);
    } finally {
      setTablesLoading(false);
    }
  }

  async function saveSalesMode() {
    if (salesMode === 'table' && !tableId) {
      toast.error('Bitte einen Tisch auswählen (z. B. Delivery 1)');
      return;
    }
    setSavingMode(true);
    try {
      const selected = posTables.find((t) => String(t.table_id) === String(tableId));
      const { data } = await api.put('/r2o/sales-mode', {
        salesMode,
        tableId: salesMode === 'table' ? String(tableId) : '',
        tableName: salesMode === 'table' ? String(selected?.table_name || '') : '',
      });
      setStatus((s) => ({ ...s, salesMode: data.salesMode, tableId: data.tableId, tableName: data.tableName }));
      toast.success(
        data.salesMode === 'table'
          ? `Bestellungen werden auf „${data.tableName || data.tableId}“ gebucht`
          : 'Bestellungen werden als Rechnung erstellt',
      );
    } catch (e) {
      toast.error(e.displayMessage || 'Speichern fehlgeschlagen');
    } finally {
      setSavingMode(false);
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

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('ready2order erfolgreich verbunden');
      setSearchParams({}, { replace: true });
      loadStatus();
    } else if (searchParams.get('error') === 'denied') {
      toast.error('Zugriff in ready2order abgelehnt');
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('error') === 'save') {
      toast.error('Token empfangen, aber Speichern fehlgeschlagen');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function saveDeveloperToken(e) {
    e.preventDefault();
    if (!developerToken.trim()) {
      toast.error('Developer Token eingeben');
      return;
    }
    setSavingDev(true);
    try {
      const { data } = await api.put('/r2o/developer-token', { developerToken: developerToken.trim() });
      setStatus(data);
      setDeveloperToken('');
      toast.success('Developer Token gespeichert');
    } catch (e) {
      toast.error(e.displayMessage || 'Speichern fehlgeschlagen');
    } finally {
      setSavingDev(false);
    }
  }

  async function generateLink() {
    setGenerating(true);
    setGrantLink(null);
    try {
      const { data } = await api.post('/r2o/grant-link');
      setGrantLink(data);
      toast.success('Verbindungslink erstellt');
    } catch (e) {
      toast.error(e.displayMessage || 'Link konnte nicht erstellt werden');
    } finally {
      setGenerating(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const { data } = await api.get('/r2o/vat-rates');
      toast.success(`Verbindung OK — ${Array.isArray(data) ? data.length : 0} MwSt.-Sätze`);
    } catch (e) {
      toast.error(e.displayMessage || 'Verbindungstest fehlgeschlagen');
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('ready2order-Verbindung wirklich trennen?')) return;
    setDisconnecting(true);
    try {
      const { data } = await api.delete('/r2o/disconnect');
      setStatus(data);
      setGrantLink(null);
      toast.success('Verbindung getrennt');
    } catch (e) {
      toast.error(e.displayMessage || 'Trennen fehlgeschlagen');
    } finally {
      setDisconnecting(false);
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('In Zwischenablage kopiert'),
      () => toast.error('Kopieren fehlgeschlagen'),
    );
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
        <h1 className="font-display text-2xl text-white">ready2order</h1>
        <p className="text-sm text-white/40 mt-0.5">POS-Verbindung einrichten und verwalten</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge ok={status?.configured} label={status?.configured ? 'Verbunden' : 'Nicht verbunden'} />
          <StatusBadge ok={status?.hasDeveloperToken} label={status?.hasDeveloperToken ? 'Developer Token' : 'Kein Developer Token'} />
        </div>
        {status?.configured && status?.apiKeyPreview && (
          <p className="text-xs text-white/40">Account Token: <code className="text-[#D9AF47]">{status.apiKeyPreview}</code></p>
        )}
        {status?.hasDeveloperToken && status?.developerTokenPreview && (
          <p className="text-xs text-white/40">Developer Token: <code className="text-white/60">{status.developerTokenPreview}</code></p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {status?.configured && (
            <button type="button" onClick={testConnection} disabled={testing} className="btn-ghost text-sm">
              {testing ? 'Teste…' : 'Verbindung testen'}
            </button>
          )}
          {status?.configured && (
            <button type="button" onClick={disconnect} disabled={disconnecting} className="text-sm px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
              {disconnecting ? 'Trenne…' : 'Verbindung trennen'}
            </button>
          )}
        </div>
      </div>

      <StepCard
        step={1}
        title="Developer Token"
        description="Den Developer Token von api.ready2order.com hier speichern. Er wird sicher in den Einstellungen hinterlegt."
      >
        <form onSubmit={saveDeveloperToken} className="space-y-3">
          <textarea
            value={developerToken}
            onChange={(e) => setDeveloperToken(e.target.value)}
            rows={4}
            placeholder={status?.hasDeveloperToken ? 'Neuen Developer Token eingeben…' : 'Developer Token einfügen…'}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D9AF47]/50 resize-y font-mono"
          />
          <button type="submit" disabled={savingDev} className="btn-primary text-sm">
            {savingDev ? 'Speichere…' : 'Developer Token speichern'}
          </button>
        </form>
      </StepCard>

      <StepCard
        step={2}
        title="Verbindungslink generieren"
        description="Erstellt einen Link, den der Restaurant-Inhaber in ready2order öffnet, um den Zugriff zu erlauben."
      >
        <button
          type="button"
          onClick={generateLink}
          disabled={generating || !status?.hasDeveloperToken}
          className="btn-primary text-sm disabled:opacity-40"
        >
          {generating ? 'Erstelle Link…' : 'Link generieren'}
        </button>
        {!status?.hasDeveloperToken && (
          <p className="text-xs text-amber-400/80 mt-2">Zuerst Schritt 1 abschließen.</p>
        )}
        {grantLink?.grantAccessUri && (
          <div className="mt-4 space-y-3 rounded-xl border border-[#D9AF47]/20 bg-[#D9AF47]/5 p-4">
            <p className="text-xs text-white/50 uppercase tracking-wide">Verbindungslink</p>
            <p className="text-sm text-white break-all">{grantLink.grantAccessUri}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copyText(grantLink.grantAccessUri)} className="btn-ghost text-sm">
                Link kopieren
              </button>
              <a href={grantLink.grantAccessUri} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm inline-flex items-center">
                Link öffnen
              </a>
            </div>
            {grantLink.callbackUri && (
              <p className="text-[11px] text-white/35">Callback: {grantLink.callbackUri}</p>
            )}
          </div>
        )}
      </StepCard>

      {status?.configured && (
        <StepCard
          step={3}
          title="Buchungsmodus"
          description="Wie akzeptierte Online-Bestellungen im POS erscheinen. Auf einem Tisch gebuchte Bestellungen können im POS bearbeitet oder gelöscht werden — eine fertige Rechnung nicht."
        >
          <div className="space-y-3">
            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${salesMode === 'table' ? 'border-[#D9AF47]/40 bg-[#D9AF47]/5' : 'border-white/10 hover:border-white/20'}`}>
              <input
                type="radio"
                name="salesMode"
                checked={salesMode === 'table'}
                onChange={() => setSalesMode('table')}
                className="mt-1 accent-[#D9AF47]"
              />
              <div className="flex-1">
                <span className="font-semibold text-white block text-sm">Auf POS-Tisch buchen (empfohlen)</span>
                <span className="text-xs text-white/50 mt-0.5 block">
                  Bestellung landet auf dem gewählten Tisch (z. B. Delivery 1) — keine sofortige Rechnung.
                  Im POS kann sie bearbeitet oder gelöscht werden.
                </span>
                {salesMode === 'table' && (
                  <div className="mt-3 space-y-2">
                    {tablesLoading ? (
                      <p className="text-xs text-white/40">Lade Tische…</p>
                    ) : posTables.length > 0 ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={tableId}
                            onChange={(e) => setTableId(e.target.value)}
                            className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D9AF47]/50 max-w-full"
                          >
                            <option value="">— Tisch wählen —</option>
                            {posTables.some((t) => t.is_delivery) && (
                              <optgroup label="Delivery">
                                {posTables.filter((t) => t.is_delivery).map((t) => (
                                  <option key={t.table_id} value={String(t.table_id)}>
                                    {t.table_name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label={posTables.some((t) => t.is_delivery) ? 'Andere Bereiche' : 'Alle Tische'}>
                              {posTables.filter((t) => !t.is_delivery).map((t) => (
                                <option key={t.table_id} value={String(t.table_id)}>
                                  {t.area_name ? `${t.area_name} — ${t.table_name}` : t.table_name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          <button type="button" onClick={() => loadTables(tableId)} disabled={tablesLoading} className="btn-ghost text-xs">
                            Neu laden
                          </button>
                        </div>
                        {!posTables.some((t) => t.is_delivery) && (
                          <p className="text-xs text-amber-400/90">
                            Delivery-Bereich wurde über die API noch nicht gefunden.
                            In ready2order zuerst auf „Tag eröffnen“ klicken, dann hier „Neu laden“.
                            Bis dahin einen Tisch manuell wählen.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-amber-400/90">
                        Keine Tische geladen. Bitte in ready2order den Tag eröffnen und hier neu laden.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>

            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${salesMode === 'invoice' ? 'border-[#D9AF47]/40 bg-[#D9AF47]/5' : 'border-white/10 hover:border-white/20'}`}>
              <input
                type="radio"
                name="salesMode"
                checked={salesMode === 'invoice'}
                onChange={() => setSalesMode('invoice')}
                className="mt-1 accent-[#D9AF47]"
              />
              <div>
                <span className="font-semibold text-white block text-sm">Sofort Rechnung erstellen</span>
                <span className="text-xs text-white/50 mt-0.5 block">
                  Beim Akzeptieren wird direkt ein Beleg erstellt. Achtung: Ein einmal erstellter Beleg kann in ready2order nicht mehr gelöscht werden.
                </span>
              </div>
            </label>

            <button type="button" onClick={saveSalesMode} disabled={savingMode} className="btn-primary text-sm">
              {savingMode ? 'Speichere…' : 'Buchungsmodus speichern'}
            </button>
          </div>
        </StepCard>
      )}
    </div>
  );
}

function StepCard({ step, title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-start gap-4 mb-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D9AF47]/15 text-sm font-bold text-[#D9AF47]">
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-sm text-white/40 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
