import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import PhoneInput from '../../components/PhoneInput';
import PasswordInput from '../../components/PasswordInput';
import { subscribeToPush } from '../../api/push';

function Spin() { return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />; }

function PushDevicesSection() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentEndpoint, setCurrentEndpoint] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // Get current subscription endpoint for "dieses Gerät" badge
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) setCurrentEndpoint(sub.endpoint);
      }
      const { data } = await api.get('/push/subscriptions');
      setDevices(data);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function addDevice() {
    setSubscribing(true);
    try {
      await subscribeToPush({ kitchen: false });
      toast.success('Gerät registriert');
      await load();
    } catch { toast.error('Registrierung fehlgeschlagen'); }
    finally { setSubscribing(false); }
  }

  async function removeDevice(id) {
    try {
      await api.delete(`/push/subscriptions/${id}`);
      toast.success('Gerät entfernt');
      setDevices((d) => d.filter((x) => x.id !== id));
    } catch { toast.error('Fehler beim Entfernen'); }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Push-Benachrichtigungen</h2>
        <button disabled={subscribing} onClick={addDevice} className="btn-outline text-sm">
          {subscribing ? <Spin /> : '+ Dieses Gerät'}
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Spin /></div>
      ) : devices.length === 0 ? (
        <p className="text-white/40 text-sm">Keine registrierten Geräte. Klicke auf "+ Dieses Gerät" um Push-Benachrichtigungen zu aktivieren.</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/5 px-4 py-3">
              <div>
                <span className="font-medium text-sm">{d.deviceName || 'Unbekanntes Gerät'}</span>
                {d.endpoint === currentEndpoint && (
                  <span className="ml-2 text-xs bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full px-2 py-0.5">Dieses Gerät</span>
                )}
                <div className="text-xs text-white/40 mt-0.5">{new Date(d.createdAt).toLocaleDateString('de-AT')}</div>
              </div>
              <button onClick={() => removeDevice(d.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-500/10">Entfernen</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminProfile() {
  const { user, setSession } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    phoneCountry: user?.phoneCountry || 'AT',
  });
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [savingP, setSavingP] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingP(true);
    try {
      const { data } = await api.put('/auth/me', form);
      setSession({ token: localStorage.getItem('token'), user: data });
      toast.success('Profil aktualisiert');
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSavingP(false); }
  }
  async function changePwd(e) {
    e.preventDefault();
    if (pwd.next.length < 6) return toast.error('Mindestens 6 Zeichen');
    setSavingPwd(true);
    try {
      await api.put('/auth/me/password', { currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Passwort geändert');
      setPwd({ current: '', next: '' });
    } catch (err) { toast.error(err.displayMessage || 'Fehler'); }
    finally { setSavingPwd(false); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl">Mein Profil</h1>
      <form onSubmit={saveProfile} className="card p-6 space-y-4">
        <h2 className="text-xl font-semibold">Persönliche Daten</h2>
        <label className="block"><span className="label">Name</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block"><span className="label">E-Mail</span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <div className="block">
          <span className="label">Telefon</span>
          <PhoneInput value={{ phone: form.phone, country: form.phoneCountry }} onChange={({ phone, country }) => setForm({ ...form, phone, phoneCountry: country })} />
        </div>
        <button disabled={savingP} className="btn-primary justify-center">{savingP ? 'Speichern…' : 'Speichern'}</button>
      </form>

      <form onSubmit={changePwd} className="card p-6 space-y-4">
        <h2 className="text-xl font-semibold">Passwort ändern</h2>
        <label className="block"><span className="label">Aktuelles Passwort</span><PasswordInput required className="input w-full" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} /></label>
        <label className="block"><span className="label">Neues Passwort</span><PasswordInput required minLength={6} className="input w-full" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></label>
        <button disabled={savingPwd} className="btn-outline justify-center">{savingPwd ? 'Ändern…' : 'Passwort ändern'}</button>
      </form>

      <PushDevicesSection />
    </div>
  );
}
