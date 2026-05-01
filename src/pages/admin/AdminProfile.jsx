import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import PhoneInput from '../../components/PhoneInput';

import PasswordInput from '../../components/PasswordInput';

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl">Mein Profil</h1>
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
    </div>
  );
}
